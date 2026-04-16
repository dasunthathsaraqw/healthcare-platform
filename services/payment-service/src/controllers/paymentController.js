const axios = require("axios");
const Payment = require("../models/Payment");
const { generatePaymentHash, verifyNotifyHash, getCheckoutUrl } = require("../utils/payhereHelper");

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3003";

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
exports.initiatePayment = async (req, res) => {
  try {
    const { appointmentId, amount, patientName, patientEmail, patientPhone, reservationId } = req.body;

    console.log("🔄 Initiating PayHere payment for appointment:", appointmentId);
    console.log(`   - Amount: Rs. ${amount}`);

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

    // Build unique order ID - same pattern as Java
    const orderId = `APT${appointmentId.toString().slice(-6)}${Date.now().toString().slice(-8)}`;
    
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
        reservationId,
      },
    });
    await payment.save();

    // Prepare payment data - EXACTLY like Java's preparePaymentData()
    const paymentData = {
      merchant_id: merchantId,
      return_url: process.env.PAYHERE_RETURN_URL,
      cancel_url: process.env.PAYHERE_CANCEL_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: "Healthcare Appointment",
      currency: "LKR",
      amount: Number(amount).toFixed(2),
    };

    // Generate hash using Java-compatible method
    const hash = generatePaymentHash(orderId, amount, "LKR");
    paymentData.hash = hash;

    // Customer information (same as Java)
    const firstName = (patientName || req.user?.name || "Test").split(" ")[0];
    const lastName = (patientName || req.user?.name || "Test").split(" ").slice(1).join(" ") || "User";
    
    paymentData.first_name = firstName;
    paymentData.last_name = lastName;
    paymentData.email = patientEmail || req.user?.email || "test@example.com";
    paymentData.phone = patientPhone || "0771234567";
    paymentData.address = "Colombo";
    paymentData.city = "Colombo";
    paymentData.country = "Sri Lanka";

    const checkoutUrl = getCheckoutUrl();

    console.log(`✅ Payment data prepared successfully`);
    console.log(`   - Checkout URL: ${checkoutUrl}`);
    console.log(`   - Order ID: ${orderId}`);
    console.log(`   - Amount: Rs. ${Number(amount).toFixed(2)}`);
    console.log(`   - Hash: ${hash}`);

    return res.status(200).json({
      success: true,
      checkoutUrl,
      paymentData,
      paymentId: payment._id,
      orderId,
    });

  } catch (error) {
    console.error("❌ Payment initiation failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payments/notify ───────────────────────────────────────────────
// In payment-service/src/controllers/paymentController.js

// ─── POST /api/payments/notify ───────────────────────────────────────────────
exports.handleNotify = async (req, res) => {
  try {
    console.log("📨 PayHere notify received:", req.body);

    const { order_id, payment_id, status_code } = req.body;

    // Verify signature
    const isValid = verifyNotifyHash(req.body);
    if (!isValid) {
      console.warn("⚠️ Invalid signature — possible tampered request");
    }

    // Find payment record
    const payment = await Payment.findOne({ payhereOrderId: order_id });
    if (!payment) {
      console.warn(`Payment not found for order_id: ${order_id}`);
      return res.status(200).send("OK");
    }

    // Map status codes
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

    // ✅ If payment successful - create appointment from reservation
    if (newStatus === "completed") {
      try {
        // Get reservationId from payment metadata
        const reservationId = payment.metadata?.reservationId;
        
        if (reservationId) {
          // NEW: Create appointment from reservation
          console.log(`📝 Creating appointment from reservation: ${reservationId}`);
          
          const response = await axios.post(
            `${APPOINTMENT_SERVICE_URL}/api/appointments/create-from-reservation`,
            {
              reservationId: reservationId,
              paymentId: payment._id.toString(),
            },
            {
              headers: { 
                Authorization: `Bearer ${process.env.INTERNAL_SECRET}`,
                "Content-Type": "application/json"
              },
              timeout: 10000,
            }
          );
          
          console.log(`✅ Appointment created successfully:`, response.data);
          
          // Update payment with appointment ID
          if (response.data.appointment?._id) {
            payment.metadata = {
              ...payment.metadata,
              appointmentId: response.data.appointment._id
            };
            await payment.save();
          }
        } else {
          // FALLBACK: Old method for existing data
          console.log(`⚠️ No reservationId found, using old payment update method`);
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
        }
      } catch (err) {
        console.error("❌ Failed to create/update appointment:", err.response?.data || err.message);
        // Don't fail the webhook - PayHere will retry
      }
    }

    // PayHere REQUIRES plain text "OK"
    return res.status(200).send("OK");
  } catch (error) {
    console.error("handleNotify error:", error);
    return res.status(200).send("OK");
  }
};

// Keep other functions (getPaymentStatus, getPaymentByAppointment, processRefund) the same...

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