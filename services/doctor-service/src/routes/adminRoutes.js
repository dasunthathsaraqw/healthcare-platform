const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");

/**
 * Admin middleware — placeholder: in production, verify an admin JWT.
 * For now we just check for the Authorization header.
 */
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  // TODO: verify an admin-specific JWT / role here
  next();
};

// ── GET /api/admin/doctors/pending ────────────────────────────────────────────
router.get("/doctors/pending", adminAuth, async (req, res) => {
  try {
    const doctors = await Doctor.find({ isVerified: false })
      .select("-password")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/doctors/verified ──────────────────────────────────────────
router.get("/doctors/verified", adminAuth, async (req, res) => {
  try {
    const doctors = await Doctor.find({ isVerified: true })
      .select("-password")
      .sort({ name: 1 });
    return res.status(200).json({ success: true, doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/doctors ───────────────────────────────────────────────────
router.get("/doctors", adminAuth, async (req, res) => {
  try {
    const doctors = await Doctor.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/admin/doctors/:id/verify ────────────────────────────────────────
router.put("/doctors/:id/verify", adminAuth, async (req, res) => {
  try {
    const { notes, isActive } = req.body;

    const update = { isVerified: true };
    // Allow suspend/reactivate by passing isActive
    if (isActive !== undefined) update.isActive = isActive;
    if (notes !== undefined) update.adminNotes = notes;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select("-password");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.status(200).json({
      success: true,
      message: isActive === false ? "Doctor suspended" : "Doctor verified",
      doctor,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/admin/doctors/:id/reject ────────────────────────────────────────
router.put("/doctors/:id/reject", adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isVerified:       false,
          isActive:         false,
          rejectionReason:  reason || "",
        },
      },
      { new: true }
    ).select("-password");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor registration rejected",
      doctor,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
