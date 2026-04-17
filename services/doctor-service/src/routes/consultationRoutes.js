const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
    getConsultationData,
    completeConsultation,
} = require("../controllers/consultationController");

// All routes require authentication
router.use(authenticate);

// Get consultation data (appointment + patient info)
router.get("/consultation/:appointmentId", getConsultationData);

// Mark consultation as completed
router.put("/consultation/:appointmentId/complete", completeConsultation);

module.exports = router;