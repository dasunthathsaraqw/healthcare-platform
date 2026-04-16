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
