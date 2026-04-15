const Appointment = require("../models/Appointment");
const { publishNotificationEvent } = require("../utils/rabbitmq");
const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique video meeting link for confirmed appointments.
 * In production this would integrate with a Jitsi / Daily.co / Zoom API.
 */
const generateMeetingLink = (appointmentId) => {
  const room = `healthcare-${appointmentId}-${Math.random().toString(36).slice(2, 9)}`;
  return `https://meet.jit.si/${room}`;
};

const TELEMEDICINE_BASE_URL =
  process.env.TELEMEDICINE_SERVICE_URL || "http://localhost:5004/api/telemedicine";

const buildTelemedicineHeaders = () => {
  const headers = { "Content-Type": "application/json" };

  if (process.env.TELEMEDICINE_SERVICE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.TELEMEDICINE_SERVICE_TOKEN}`;
  }

  return headers;
};

const normalizeTelemedicineMetadata = (session) => {
  if (!session) {
    return null;
  }

  return {
    sessionId: session._id ? String(session._id) : "",
    roomId: session.roomId || "",
    joinUrl: session.joinUrl || "",
    status: session.status || "",
    scheduledAt: session.scheduledAt ? new Date(session.scheduledAt) : null,
    syncedAt: new Date(),
  };
};

const createOrGetTelemedicineSession = async (appointment) => {
  const payload = {
    appointmentId: String(appointment._id),
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    scheduledAt: appointment.dateTime,
  };

  const headers = buildTelemedicineHeaders();

  try {
    const response = await axios.post(`${TELEMEDICINE_BASE_URL}/sessions`, payload, {
      headers,
      timeout: 15000,
    });
    return response?.data?.data || null;
  } catch (error) {
    // Safe idempotency: if session already exists, fetch and reuse it.
    if (error.response?.status === 409) {
      const existing = await axios.get(
        `${TELEMEDICINE_BASE_URL}/sessions/${appointment._id}`,
        {
          headers,
          timeout: 15000,
        }
      );
      return existing?.data?.data || null;
    }

    throw error;
  }
};

/**
 * Standard error responder — keeps controller bodies clean.
 */
const handleError = (res, error, fallbackMessage = "Internal server error") => {
  console.error(`[AppointmentService] ${fallbackMessage}:`, error.message);
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message || fallbackMessage,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// POST /api/appointments
// Body: { patientId, doctorId, patientName, doctorName, specialty,
//         dateTime, reason, consultationFee }
// ─────────────────────────────────────────────────────────────────────────────

const bookAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      doctorName,
      specialty,
      dateTime,
      reason,
      consultationFee,
      isForSomeoneElse,
      bookedFor,
    } = req.body;

    // Use authenticated user data if not provided in body
    const patientId = req.body.patientId || req.user.id;
    const patientName = req.body.patientName || req.user.name || "Patient";

    // Basic validation
    if (!patientId || !doctorId || !dateTime) {
      return res.status(400).json({
        success: false,
        message: "doctorId and dateTime are required.",
      });
    }

    const apptDateTime = new Date(dateTime);
    if (isNaN(apptDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid dateTime value.",
      });
    }

    if (apptDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot book an appointment in the past.",
      });
    }

    // Check for conflicting appointment (same doctor, same slot, not cancelled/rejected)
    const conflict = await Appointment.findOne({
      doctorId,
      dateTime: apptDateTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked. Please choose another.",
      });
    }

    // ── Calculate Patient Number for the day ────────────────────────────────
    const startOfDay = new Date(apptDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(apptDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyCount = await Appointment.countDocuments({
      doctorId,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "rejected"] },
    });
    const patientNumber = dailyCount + 1;

    // Create appointment
    const appointment = new Appointment({
      patientId,
      doctorId,
      patientName: patientName || "",
      doctorName: doctorName || "",
      specialty: specialty || "",
      dateTime: apptDateTime,
      reason: reason || "",
      consultationFee: consultationFee || 0,
      status: "confirmed", // Auto-confirm
      paymentStatus: "paid", // Auto-mark as paid
      meetingLink: generateMeetingLink(`${patientId}-${Date.now()}`),
      isForSomeoneElse: !!isForSomeoneElse,
      bookedFor: bookedFor || { name: "", age: null, phone: "", email: "" },
      patientNumber,
    });

    await appointment.save();

    // ── Publish APPOINTMENT_BOOKED to notification-service via RabbitMQ ──────
    // Fire-and-forget: appointment is saved regardless of queue state
    publishNotificationEvent("APPOINTMENT_BOOKED", {
      appointmentId: appointment._id.toString(),
      patientId,
      doctorId,
      patientName: patientName || "",
      doctorName: doctorName || "",
      specialty: specialty || "",
      dateTime: apptDateTime.toISOString(),
      reason: reason || "",
      patientNumber,
      meetingLink: appointment.meetingLink,
      isForSomeoneElse: !!isForSomeoneElse,
      // Priority email for notification: guest email if "booked for others", else patient email (if provided)
      patientEmail: isForSomeoneElse ? bookedFor?.email : (req.user?.email || ""),
    }).catch((err) =>
      console.warn("Non-critical: Failed to publish APPOINTMENT_BOOKED:", err.message)
    );

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    return handleError(res, error, "Failed to book appointment");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — Patient: Upcoming
// GET /api/appointments/patient/upcoming
// Auth required (patient token) — uses req.user.id
// Returns appointments whose dateTime >= now and status is NOT cancelled/rejected
// ─────────────────────────────────────────────────────────────────────────────

const getPatientUpcoming = async (req, res) => {
  try {
    const patientId = req.user.id;

    const appointments = await Appointment.find({
      patientId,
      dateTime: { $gte: new Date() },
      status: { $nin: ["cancelled", "rejected", "completed"] },
    }).sort({ dateTime: 1 });

    return res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch upcoming appointments");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — Patient: Past
// GET /api/appointments/patient/past
// Auth required — uses req.user.id
// Returns completed, cancelled, rejected, or dateTime < now
// ─────────────────────────────────────────────────────────────────────────────

const getPatientPast = async (req, res) => {
  try {
    const patientId = req.user.id;

    const appointments = await Appointment.find({
      patientId,
      $or: [
        { dateTime: { $lt: new Date() } },
        { status: { $in: ["completed", "cancelled", "rejected"] } },
      ],
    }).sort({ dateTime: -1 });

    return res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch past appointments");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — All by Patient ID (used by admin / doctor-service cross-calls)
// GET /api/appointments/patient/:id
// ─────────────────────────────────────────────────────────────────────────────

const getAppointmentsByPatient = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const filter = { patientId };

    if (req.query.status) filter.status = req.query.status;

    const appointments = await Appointment.find(filter).sort({ dateTime: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch patient appointments");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — All by Doctor ID (used by doctor-service getAppointments)
// GET /api/appointments/doctor/:id
// ─────────────────────────────────────────────────────────────────────────────

const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const filter = { doctorId };

    if (req.query.status) filter.status = req.query.status;

    const appointments = await Appointment.find(filter).sort({ dateTime: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch doctor appointments");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — Doctor Stats (used by doctor-service getDashboardStats)
// GET /api/appointments/doctor/:id/stats
// Returns { todayAppointments, pendingAppointments }
// ─────────────────────────────────────────────────────────────────────────────

const getDoctorStats = async (req, res) => {
  try {
    const { id: doctorId } = req.params;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [todayAppointments, pendingAppointments] = await Promise.all([
      Appointment.countDocuments({
        doctorId,
        dateTime: { $gte: startOfToday, $lte: endOfToday },
        status: { $in: ["pending", "confirmed"] },
      }),
      Appointment.countDocuments({
        doctorId,
        status: "pending",
      }),
    ]);

    return res.status(200).json({
      success: true,
      todayAppointments,
      pendingAppointments,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch doctor stats");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ — Single appointment
// GET /api/appointments/:id
// ─────────────────────────────────────────────────────────────────────────────

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    return handleError(res, error, "Failed to fetch appointment");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — Status (used by doctor-service accept/reject/complete)
// PATCH /api/appointments/:id/status
// Body: { status, rejectionReason? }
// ─────────────────────────────────────────────────────────────────────────────

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // Guard: cannot update a completed or cancelled appointment
    if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update an appointment that is already ${appointment.status}.`,
      });
    }

    const previousStatus = appointment.status;
    const isTransitionToConfirmed =
      previousStatus !== "confirmed" && status === "confirmed";

    appointment.status = status;

    if (rejectionReason) {
      appointment.rejectionReason = rejectionReason;
    }

    // Auto-assign meeting link + telemedicine session metadata when status becomes confirmed.
    if (isTransitionToConfirmed) {
      let telemedicineSession;
      try {
        telemedicineSession = await createOrGetTelemedicineSession(appointment);
      } catch (error) {
        const integrationError = new Error(
          error.response?.data?.message ||
            "Failed to create telemedicine session during appointment confirmation."
        );
        integrationError.statusCode = error.response?.status || 502;
        throw integrationError;
      }

      const normalizedTelemedicine = normalizeTelemedicineMetadata(telemedicineSession);

      if (normalizedTelemedicine) {
        appointment.telemedicineSession = normalizedTelemedicine;
        appointment.meetingLink =
          normalizedTelemedicine.joinUrl ||
          appointment.meetingLink ||
          generateMeetingLink(appointment._id.toString());
      } else {
        const metadataError = new Error(
          "Telemedicine session metadata is unavailable for the confirmed appointment."
        );
        metadataError.statusCode = 502;
        throw metadataError;
      }
    }

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'.`,
      appointment,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update appointment status");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — Patient Cancel
// PUT /api/appointments/:id/cancel
// Called by the patient dashboard (matches dashboard/page.js: PUT /:id/cancel)
// ─────────────────────────────────────────────────────────────────────────────

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // Only the owning patient or an admin can cancel
    const requesterId = req.user.id;
    if (
      appointment.patientId !== requesterId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own appointments.",
      });
    }

    if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an appointment that is already ${appointment.status}.`,
      });
    }

    appointment.status = "cancelled";
    if (req.body.reason) {
      appointment.cancellationReason = req.body.reason;
    }
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment,
    });
  } catch (error) {
    return handleError(res, error, "Failed to cancel appointment");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — Link payment to appointment (called by payment-service after verify)
// PATCH /api/appointments/:id/payment
// Body: { paymentId, paymentStatus }
// ─────────────────────────────────────────────────────────────────────────────

const updateAppointmentPayment = async (req, res) => {
  try {
    const { paymentId, paymentStatus } = req.body;

    if (!paymentId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "paymentId and paymentStatus are required.",
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: { paymentId, paymentStatus } },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    return handleError(res, error, "Failed to update appointment payment");
  }
};

module.exports = {
  bookAppointment,
  getPatientUpcoming,
  getPatientPast,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  getDoctorStats,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  updateAppointmentPayment,
};
