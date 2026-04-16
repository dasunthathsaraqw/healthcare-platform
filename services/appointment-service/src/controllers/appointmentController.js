const Appointment = require("../models/Appointment");
const { publishNotificationEvent } = require("../utils/rabbitmq");
const { lockSlot, unlockSlot, isSlotLocked } = require("../utils/slotLocker");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique video meeting link for confirmed appointments.
 * In production this would integrate with a Jitsi / Daily.co / Zoom API.
 */
const generateMeetingLink = (appointmentId) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/dashboard/consultation/${appointmentId}`;
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


// services/appointment-service/src/controllers/appointmentController.js


// ─── NEW: Reserve a slot (creates temporary hold, NOT an appointment) ───
// POST /api/appointments/reserve
// ─── NEW: Reserve a slot (creates temporary hold, NOT an appointment) ───
// POST /api/appointments/reserve
const reserveSlot = async (req, res) => {
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
      availabilityId,  // ← NEW: Which availability slot
      slotTime,        // ← NEW: Specific time (e.g., "09:30")
      patientNumber,   // ← NEW: Position in queue (1, 2, 3...)
    } = req.body;

    const patientId = req.body.patientId || req.user.id;
    const patientName = req.body.patientName || req.user.name || "Patient";

    console.log("📝 Reserve slot request:", {
      doctorId,
      dateTime,
      availabilityId,
      slotTime,
      patientNumber,
    });

    if (!doctorId || !dateTime) {
      return res.status(400).json({
        success: false,
        message: "doctorId and dateTime are required.",
      });
    }

    const apptDateTime = new Date(dateTime);
    if (isNaN(apptDateTime.getTime()) || apptDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or past date/time.",
      });
    }

    // Check if slot is already booked (existing confirmed appointment)
    const existingAppointment = await Appointment.findOne({
      doctorId,
      dateTime: apptDateTime,
      status: { $in: ["confirmed", "completed"] },
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked.",
      });
    }

    // Check if slot is temporarily locked
    if (isSlotLocked(doctorId, apptDateTime)) {
      return res.status(409).json({
        success: false,
        message: "This slot is being booked by another patient. Please try another slot.",
      });
    }

    // Generate a unique reservation ID
    const reservationId = `RES_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    // Lock the slot for 10 minutes
    const locked = lockSlot(doctorId, apptDateTime, reservationId);
    if (!locked) {
      return res.status(409).json({
        success: false,
        message: "Unable to reserve slot. Please try again.",
      });
    }

    // Store reservation data with availability info
    const reservationData = {
      reservationId,
      doctorId,
      doctorName,
      specialty,
      patientId,
      patientName,
      dateTime: apptDateTime.toISOString(),
      reason,
      consultationFee,
      isForSomeoneElse,
      bookedFor,
      availabilityId,  // ← NEW
      slotTime,        // ← NEW
      patientNumber,   // ← NEW
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    // Store in a temporary map
    if (!global.reservations) global.reservations = new Map();
    global.reservations.set(reservationId, reservationData);
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      if (global.reservations?.has(reservationId)) {
        global.reservations.delete(reservationId);
        unlockSlot(doctorId, apptDateTime, reservationId);
        console.log(`🗑️ Reservation ${reservationId} expired`);
      }
    }, 10 * 60 * 1000);

    console.log(`🔒 Slot reserved: ${reservationId} for doctor ${doctorId} at ${apptDateTime}`);
    console.log(`   - Availability ID: ${availabilityId}`);
    console.log(`   - Slot Time: ${slotTime}`);
    console.log(`   - Patient Number: ${patientNumber}`);

    return res.status(200).json({
      success: true,
      message: "Slot reserved. Please complete payment within 10 minutes.",
      reservationId,
      reservationData,
      expiresIn: 10 * 60, // seconds
    });

  } catch (error) {
    return handleError(res, error, "Failed to reserve slot");
  }
};

// ─── NEW: Create appointment AFTER successful payment ───
// POST /api/appointments/create-from-reservation
// ─── NEW: Create appointment AFTER successful payment ───
const createAppointmentFromReservation = async (req, res) => {
  try {
    const { reservationId, paymentId } = req.body;

    if (!reservationId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: "reservationId and paymentId are required.",
      });
    }

    // Get reservation data
    const reservation = global.reservations?.get(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation expired or not found. Please book again.",
      });
    }

    // Check if appointment already exists (prevent duplicate)
    const existingAppointment = await Appointment.findOne({
      doctorId: reservation.doctorId,
      dateTime: new Date(reservation.dateTime),
      status: "confirmed",
    });

    if (existingAppointment) {
      unlockSlot(reservation.doctorId, reservation.dateTime, reservationId);
      global.reservations.delete(reservationId);
      return res.status(409).json({
        success: false,
        message: "This slot is no longer available.",
      });
    }

    // Calculate patient number
    let patientNumber = reservation.patientNumber;
    
    if (!patientNumber) {
      const startOfDay = new Date(reservation.dateTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reservation.dateTime);
      endOfDay.setHours(23, 59, 59, 999);

      const dailyCount = await Appointment.countDocuments({
        doctorId: reservation.doctorId,
        dateTime: { $gte: startOfDay, $lte: endOfDay },
        status: "confirmed",
      });
      patientNumber = dailyCount + 1;
    }

    // Create the actual appointment
    const appointment = new Appointment({
      patientId: reservation.patientId,
      doctorId: reservation.doctorId,
      patientName: reservation.patientName,
      doctorName: reservation.doctorName,
      specialty: reservation.specialty,
      dateTime: new Date(reservation.dateTime),
      reason: reservation.reason,
      consultationFee: reservation.consultationFee,
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: paymentId,
      meetingLink: generateMeetingLink(`${reservation.patientId}-${Date.now()}`),
      isForSomeoneElse: reservation.isForSomeoneElse,
      bookedFor: reservation.bookedFor || { name: "", age: null, phone: "", email: "" },
      patientNumber,
      availabilityId: reservation.availabilityId,
      slotTime: reservation.slotTime,
      slotPosition: reservation.patientNumber,
    });

    await appointment.save();

    // ✅ Increment bookedSlots by calling doctor service's update endpoint
    // ✅ Increment bookedSlots by calling doctor service's update endpoint
if (reservation.availabilityId) {
  try {
    const axios = require("axios");
    const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
    
    // Get the current availability to get totalSlots and current bookedSlots
    const getResponse = await axios.get(
      `${DOCTOR_SERVICE_URL}/api/doctors/availability`,
      {
        headers: { Authorization: req.headers.authorization }
      }
    );
    
    // Find the specific availability
    const availabilityList = getResponse.data.availability || [];
    const currentAvailability = availabilityList.find(a => a._id === reservation.availabilityId);
    
    if (currentAvailability) {
      const newBookedSlots = (currentAvailability.bookedSlots || 0) + 1;
      
      // Update the availability with new bookedSlots
      await axios.put(
        `${DOCTOR_SERVICE_URL}/api/doctors/availability/${reservation.availabilityId}`,
        { bookedSlots: newBookedSlots },
        { 
          headers: { 
            Authorization: req.headers.authorization,
            "Content-Type": "application/json"
          } 
        }
      );
      console.log(`✅ Updated bookedSlots for availability ${reservation.availabilityId} to ${newBookedSlots}/${currentAvailability.totalSlots}`);
    } else {
      console.warn(`⚠️ Availability ${reservation.availabilityId} not found`);
    }
  } catch (err) {
    console.error(`⚠️ Failed to update bookedSlots:`, err.response?.data || err.message);
    // Don't fail the appointment creation - log error but continue
  }
}

    // Release the lock and clean up reservation
    unlockSlot(reservation.doctorId, reservation.dateTime, reservationId);
    global.reservations.delete(reservationId);

    console.log(`✅ Appointment created from reservation ${reservationId}`);

    // Publish notification
    publishNotificationEvent("APPOINTMENT_BOOKED", {
      appointmentId: appointment._id.toString(),
      patientId: reservation.patientId,
      doctorId: reservation.doctorId,
      patientName: reservation.patientName,
      doctorName: reservation.doctorName,
      specialty: reservation.specialty,
      dateTime: reservation.dateTime,
      reason: reservation.reason,
      patientNumber,
      meetingLink: appointment.meetingLink,
      isForSomeoneElse: reservation.isForSomeoneElse,
      patientEmail: reservation.isForSomeoneElse ? reservation.bookedFor?.email : "",
    }).catch((err) => console.warn("Notification failed:", err.message));

    return res.status(201).json({
      success: true,
      message: "Appointment confirmed successfully!",
      appointment,
    });

  } catch (error) {
    return handleError(res, error, "Failed to create appointment");
  }
};

// Keep other functions but remove the old bookAppointment
// Update the routes to use these new functions
/*const bookAppointment = async (req, res) => {
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

    const patientId = req.body.patientId || req.user.id;
    const patientName = req.body.patientName || req.user.name || "Patient";

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

    // Check for conflicting appointment
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

    // Calculate Patient Number
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

    const hasFee = consultationFee > 0;
    
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
      isForSomeoneElse: !!isForSomeoneElse,
      bookedFor: bookedFor || { name: "", age: null, phone: "", email: "" },
      patientNumber,
    });
    appointment.meetingLink = generateMeetingLink(appointment._id.toString());

    await appointment.save();

    // Only publish notification if appointment is confirmed (free)
    if (!hasFee) {
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
        patientEmail: isForSomeoneElse ? bookedFor?.email : (req.user?.email || ""),
      }).catch((err) =>
        console.warn("Non-critical: Failed to publish APPOINTMENT_BOOKED:", err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: hasFee 
        ? "Appointment created. Please complete payment to confirm."
        : "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    return handleError(res, error, "Failed to book appointment");
  }
};*/
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

    // ← ADD THIS: filter by date if provided
    if (req.query.date) {
      const startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.dateTime = { $gte: startOfDay, $lte: endOfDay };
    }

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

    appointment.status = status;

    if (rejectionReason) {
      appointment.rejectionReason = rejectionReason;
    }

    // Auto-assign meeting link when confirming
    if (status === "confirmed" && !appointment.meetingLink) {
      appointment.meetingLink = generateMeetingLink(appointment._id.toString());
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

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // ✅ If payment is successful, confirm the appointment
    if (paymentStatus === "paid" && appointment.status === "pending" && appointment.paymentStatus === "unpaid") {
      appointment.status = "confirmed";
      appointment.paymentStatus = "paid";
      appointment.paymentId = paymentId;
      
      // Generate meeting link for confirmed appointment
      if (!appointment.meetingLink) {
        appointment.meetingLink = generateMeetingLink(appointment._id.toString());
      }
      
      await appointment.save();
      
      // Publish notification for confirmed appointment
      publishNotificationEvent("APPOINTMENT_BOOKED", {
        appointmentId: appointment._id.toString(),
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        specialty: appointment.specialty,
        dateTime: appointment.dateTime.toISOString(),
        reason: appointment.reason,
        patientNumber: appointment.patientNumber,
        meetingLink: appointment.meetingLink,
        isForSomeoneElse: appointment.isForSomeoneElse,
        patientEmail: appointment.isForSomeoneElse ? appointment.bookedFor?.email : "",
      }).catch((err) =>
        console.warn("Non-critical: Failed to publish appointment confirmation:", err.message)
      );
      
      return res.status(200).json({ 
        success: true, 
        message: "Payment confirmed! Appointment has been scheduled.",
        appointment 
      });
    }
    
    // Otherwise just update payment status (for failed/refunded scenarios)
    if (paymentStatus === "paid") {
      appointment.paymentStatus = "paid";
    } else if (paymentStatus === "failed") {
      appointment.paymentStatus = "unpaid"; // Keep as unpaid if failed
    } else if (paymentStatus === "refunded") {
      appointment.paymentStatus = "refunded";
    }
    
    appointment.paymentId = paymentId;
    await appointment.save();

    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    return handleError(res, error, "Failed to update appointment payment");
  }
};
module.exports = {
  reserveSlot,
  createAppointmentFromReservation,
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
