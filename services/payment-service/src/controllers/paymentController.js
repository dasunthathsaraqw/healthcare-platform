const axios = require("axios");
const Payment = require("../models/Payment");
const { generateInitiateHash, verifyNotifyHash, getCheckoutUrl } = require("../utils/payhereHelper");

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3003";

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
// Frontend calls this after booking — returns checkoutUrl + paymentData
// Frontend uses these to build and submit the PayHere form
exports.initiatePayment = async (req, res) => {
  try {
    const { appointmentId, amount, patientName, patientEmail, patientPhone } = req.body;

    console.log("💳 Initiate payment:", { appointmentId, amount, patientName });

    if (!appointmentId || !amount) {
      return res.status(400).json({
        success: false,
        message: "appointmentId and amount are required",
      });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    if (!merchantId) {
      return res.status(500).json({ success: false, message: "Payment gateway not configured" });
    }

    // Build unique order ID — same pattern as Java
    const orderId = `APT${appointmentId.toString().slice(-6)}${Date.now().toString().slice(-8)}`;
    const amountFormatted = Number(amount).toFixed(2);

    // Generate hash
    const hash = generateInitiateHash(merchantId, orderId, amountFormatted, "LKR");

    // Save pending payment record
    const payment = new Payment({
      appointmentId: appointmentId.toString(),
      patientId: req.user.id,
      amount: Number(amount),
      payhereOrderId: orderId,
      status: "pending",
      metadata: {
        patientName: patientName || req.user.name || "Patient",
        patientEmail: patientEmail || req.user.email || "",
        patientPhone: patientPhone || "0771234567",
      },
    });
    await payment.save();

    // Build paymentData — exactly like Java's preparePaymentData()
    // NOTE: Do NOT include 'sandbox' here — it goes to PayHere as a form field
// In initiatePayment function, replace the paymentData object with:

// In initiatePayment function, replace the paymentData object with:

const paymentData = {
  // Required merchant details
  merchant_id: String(merchantId),
  order_id: String(orderId),
  items: "Healthcare Appointment",
  currency: "LKR",
  amount: amountFormatted,
  hash: hash,
  
  // Required URLs
  return_url: process.env.PAYHERE_RETURN_URL || "http://localhost:3000/dashboard/payment-status",
  cancel_url: process.env.PAYHERE_CANCEL_URL || "http://localhost:3000/dashboard/payment-cancel",
  notify_url: process.env.PAYHERE_NOTIFY_URL,
  
  // Customer details (ALL required by PayHere)
  first_name: (patientName || req.user?.name || "Test").split(" ")[0],
  last_name: (patientName || req.user?.name || "Test").split(" ").slice(1).join(" ") || "User",
  email: patientEmail || req.user?.email || "test@example.com",
  phone: patientPhone || "0771234567",
  address: "Colombo",
  city: "Colombo",
  country: "Sri Lanka",
  
  // ⚠️ CRITICAL: Add these for sandbox
  platform: "web",  // PayHere requires this
  // Explicit sandbox flag
};
// IMPORTANT: Add sandbox flag as a form field (not in paymentData object)
// But note: PayHere doesn't need 'sandbox' field in POST - it's determined by the URL

    const checkoutUrl = getCheckoutUrl();

    console.log(`✅ Payment record created: orderId=${orderId}, amount=${amountFormatted} LKR`);
    console.log(`🔗 Checkout URL: ${checkoutUrl}`);

    // Return same structure as Java — checkoutUrl + paymentData
    return res.status(200).json({
      success: true,
      checkoutUrl,
      paymentData,
      paymentId: payment._id,
      orderId,
    });
  } catch (error) {
    console.error("initiatePayment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payments/notify ────────────────────────────────────────────────
// PayHere calls this server-to-server after payment
// MUST return HTTP 200 plain text "OK" — not JSON
exports.handleNotify = async (req, res) => {
  try {
    console.log("📨 PayHere notify received:", req.body);

    const { order_id, payment_id, status_code } = req.body;

    // Verify signature — same as Java's verifyWebhookSignature()
    const isValid = verifyNotifyHash(req.body);
    if (!isValid) {
      console.warn("⚠️ Invalid signature — possible tampered request");
      // In production reject this. For sandbox testing continue.
    }

    // Find payment record
    const payment = await Payment.findOne({ payhereOrderId: order_id });
    if (!payment) {
      console.warn(`Payment not found for order_id: ${order_id}`);
      return res.status(200).send("OK"); // Always 200 to PayHere
    }

    // Map status codes — same as Java's getStatusDescription()
    // 2=SUCCESS, 0=PENDING, -1=CANCELED, -2=FAILED, -3=CHARGEBACK
    let newStatus;
    if (status_code == "2") {
      newStatus = "completed";
      payment.transactionId = payment_id;
    } else if (status_code == "0") {
      newStatus = "pending";
    } else if (status_code == "-1") {
      newStatus = "cancelled";
    } else {
      newStatus = "failed";
    }

    payment.status = newStatus;
    await payment.save();
    console.log(`💳 Payment ${order_id} → ${newStatus}`);

    // If payment successful — update appointment
    if (newStatus === "completed") {
      try {
        await axios.patch(
          `${APPOINTMENT_SERVICE_URL}/api/appointments/${payment.appointmentId}/payment`,
          {
            paymentId: payment._id.toString(),
            paymentStatus: "paid",
          },
          {
            headers: { Authorization: `Bearer ${process.env.JWT_SECRET || "123"}` },
            timeout: 5000,
          }
        );
        console.log(`✅ Appointment ${payment.appointmentId} marked as paid`);
      } catch (err) {
        console.error("Failed to update appointment:", err.message);
        // Don't fail webhook — appointment update can be retried
      }
    }

    // PayHere REQUIRES plain text "OK"
    return res.status(200).send("OK");
  } catch (error) {
    console.error("handleNotify error:", error);
    return res.status(200).send("OK"); // Always 200
  }
};

// ─── GET /api/payments/status/:orderId ───────────────────────────────────────
// Frontend polls this after PayHere redirects to return_url
// Same as Java's /api/payments/status/:orderId
exports.getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ payhereOrderId: req.params.orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.status(200).json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/payments/appointment/:id ───────────────────────────────────────
exports.getPaymentByAppointment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ appointmentId: req.params.id }).sort({ createdAt: -1 });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.status(200).json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payments/refund ────────────────────────────────────────────────
exports.processRefund = async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: "paymentId is required" });
    }
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    // In sandbox — mark refunded in DB. In production — call PayHere refund API
    payment.status = "refunded";
    payment.metadata = { ...payment.metadata, refundReason: reason, refundedAt: new Date() };
    await payment.save();
    return res.status(200).json({ success: true, message: "Refund processed", payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};