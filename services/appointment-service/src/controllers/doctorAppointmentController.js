const Appointment = require("../models/Appointment");

// ─────────────────────────────────────────────────────────────────────────────
// GET DOCTOR APPOINTMENTS
// GET /api/appointments/manage
// ─────────────────────────────────────────────────────────────────────────────
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { status, date } = req.query;

    let filter = { doctorId };

    if (status === "pending") {
      filter.status = "pending";
    } else if (status === "upcoming") {
      filter.status = { $in: ["confirmed"] };
      filter.dateTime = { $gte: new Date() };
    } else if (status === "past") {
      filter.$or = [
        { dateTime: { $lt: new Date() } },
        { status: { $in: ["completed", "cancelled", "rejected"] } }
      ];
    } else if (status && status !== "all") {
      filter.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      if (filter.dateTime) {
        filter.dateTime = { ...filter.dateTime, $gte: startOfDay, $lte: endOfDay };
      } else {
        filter.dateTime = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const appointments = await Appointment.find(filter)
      .sort({ dateTime: -1 })
      .populate("patientId", "name email profilePicture phone");

    // Format patient object properly if populated is just returning raw object
    const formattedAppointments = appointments.map(appt => {
      const formatted = appt.toObject();
      if (typeof formatted.patientId === 'object' && formatted.patientId !== null) {
        formatted.patientName = formatted.patientId.name || formatted.patientName;
      }
      return formatted;
    });

    return res.status(200).json({ success: true, appointments: formattedAppointments });
  } catch (error) {
    console.error("Error fetching doctor appointments:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch appointments" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE APPOINTMENT STATUS (Accept, Reject)
// PUT /api/appointments/manage/:id/status
// ─────────────────────────────────────────────────────────────────────────────
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ["confirmed", "completed", "cancelled", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status.` });
    }

    const appointment = await Appointment.findOne({ _id: id, doctorId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: `Cannot update an appointment that is already ${appointment.status}.` });
    }

    appointment.status = status;

    if (status === "rejected" && reason) {
      appointment.rejectionReason = reason;
    }

    // Auto-assign meeting link when confirming
    if (status === "confirmed" && !appointment.meetingLink) {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      appointment.meetingLink = `${baseUrl}/dashboard/consultation/${appointment._id}`;
    }

    await appointment.save();

    return res.status(200).json({ success: true, message: `Appointment ${status}`, appointment });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return res.status(500).json({ success: false, message: "Failed to update appointment" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE APPOINTMENT
// DELETE /api/appointments/manage/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const appointment = await Appointment.findOneAndDelete({ _id: id, doctorId });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found or already deleted." });
    }

    return res.status(200).json({ success: true, message: "Appointment permanently deleted." });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return res.status(500).json({ success: false, message: "Failed to delete appointment." });
  }
};


/**
 * GET /api/appointments/doctor/:doctorId/patients
 * Get unique patient IDs and stats for a specific doctor
 */
exports.getDoctorPatients = async (req, res) => {
  try {
    const { doctorId } = req.params;

    console.log("=== Appointment Service: getDoctorPatients ===");
    console.log("Doctor ID:", doctorId);

    // Find all appointments for this doctor
    const Appointment = require('../models/Appointment'); // Make sure this path is correct
    const appointments = await Appointment.find({
      doctorId: doctorId
    }).sort({ dateTime: -1 });

    console.log(`Found ${appointments.length} appointments for doctor`);

    if (appointments.length === 0) {
      return res.status(200).json({
        success: true,
        patientIds: [],
        patientStats: [],
      });
    }

    // Get unique patient IDs
    const uniquePatientIds = [...new Set(
      appointments.map(app => app.patientId.toString())
    )];

    console.log(`Unique patient IDs:`, uniquePatientIds);

    // Get stats for each patient
    const patientStats = await Promise.all(
      uniquePatientIds.map(async (patientId) => {
        const patientAppointments = await Appointment.find({
          doctorId: doctorId,
          patientId: patientId,
        }).sort({ dateTime: -1 });

        return {
          patientId,
          lastAppointment: patientAppointments[0]?.dateTime || null,
          appointmentCount: patientAppointments.length,
        };
      })
    );

    console.log(`Returning stats for ${patientStats.length} patients`);

    return res.status(200).json({
      success: true,
      patientIds: uniquePatientIds,
      patientStats: patientStats,
    });
  } catch (error) {
    console.error("getDoctorPatients error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
