const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  initiatePayment,
  handleNotify,
  getPaymentStatus,
  getPaymentByAppointment,
  processRefund,getAllPayments
} = require("../controllers/paymentController");

// Public — PayHere calls this directly, no JWT
router.post("/notify", handleNotify);

// Authenticated
router.post("/initiate", authenticate, initiatePayment);
router.post("/refund", authenticate, processRefund);
router.get("/status/:orderId", authenticate, getPaymentStatus);
router.get("/appointment/:id", authenticate, getPaymentByAppointment);
// Admin route - get all payments
router.get("/admin/all", getAllPayments);

module.exports = router;