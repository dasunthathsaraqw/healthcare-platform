const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const Availability = require("../models/Availability");
const Prescription = require("../models/Prescription");

// ─── Helper: external service URLs ───────────────────────────────────────────
const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:3003";
const PATIENT_SERVICE_URL =
  process.env.PATIENT_SERVICE_URL || "http://patient-service:3001";
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3005";

// ─── Helper: forward auth header ─────────────────────────────────────────────
const authHeader = (req) => ({
  Authorization: req.headers.authorization || "",
});


// Helper function to calculate total slots from time range and duration
const calculateTotalSlots = (startTime, endTime, slotDuration) => {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const durationMins = endMins - startMins;
  return Math.floor(durationMins / slotDuration);
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/doctors/profile
 * Get the logged-in doctor's own profile
 */
const getDoctorProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      doctor: req.doctor.toObject ? req.doctor.toObject() : req.doctor,
    });
  } catch (error) {
    console.error("getDoctorProfile error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/doctors/profile
 * Update the logged-in doctor's editable fields
 */
const updateDoctorProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "specialty",
      "qualifications",
      "experience",
      "clinicAddress",
      "bio",
      "languages",
      "consultationFee",
      "profilePicture",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Doctor.findByIdAndUpdate(
      req.doctor._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({ success: true, doctor: updated });
  } catch (error) {
    console.error("updateDoctorProfile error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/doctors/change-password
 * Change the logged-in doctor's password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    // Fetch fresh doc with password
    const doctor = await Doctor.findById(req.doctor._id);
    const isMatch = await doctor.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    doctor.password = newPassword; // pre-save hook hashes it
    await doctor.save();
    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/doctors/availability
 */
const addAvailability = async (req, res) => {
  try {
    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      isRecurring,
      specificDate,
    } = req.body;

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ success: false, message: "startTime and endTime are required" });
    }

    const totalSlots = calculateTotalSlots(startTime, endTime, slotDuration || 30);

    const slot = new Availability({
      doctorId: req.doctor._id,
      dayOfWeek: dayOfWeek ?? null,
      specificDate: specificDate ? new Date(specificDate) : null,
      startTime,
      endTime,
      totalSlots,
      bookedSlots: 0,
      slotDuration: slotDuration || 30,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
    });

    await slot.save();
    return res.status(201).json({ success: true, availability: slot });
  } catch (error) {
    console.error("addAvailability error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/doctors/availability
 * Optional query param: ?date=YYYY-MM-DD
 */
const getAvailability = async (req, res) => {
  try {
    const query = { doctorId: req.doctor._id };

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const dayOfWeek = targetDate.getDay();
      query.$or = [
        { dayOfWeek, isRecurring: true },
        {
          specificDate: {
            $gte: new Date(req.query.date),
            $lt: new Date(
              new Date(req.query.date).setDate(targetDate.getDate() + 1)
            ),
          },
        },
      ];
    }

    const slots = await Availability.find(query).sort({ startTime: 1 });
    return res.status(200).json({ success: true, availability: slots });
  } catch (error) {
    console.error("getAvailability error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/doctors/availability/:id
 */
const updateAvailability = async (req, res) => {
  try {
    const slot = await Availability.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id,
    });

    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Availability slot not found" });
    }

    const updatable = [
      "dayOfWeek",
      "specificDate",
      "startTime",
      "endTime",
      "slotDuration",
      "isRecurring",
      "status",
    ];
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) slot[f] = req.body[f];
    });

    if (req.body.startTime !== undefined ||
      req.body.endTime !== undefined ||
      req.body.slotDuration !== undefined) {
      slot.totalSlots = calculateTotalSlots(slot.startTime, slot.endTime, slot.slotDuration);
    }

    await slot.save();
    return res.status(200).json({ success: true, availability: slot });
  } catch (error) {
    console.error("updateAvailability error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/doctors/availability/:id
 */
const deleteAvailability = async (req, res) => {
  try {
    const slot = await Availability.findOneAndDelete({
      _id: req.params.id,
      doctorId: req.doctor._id,
    });

    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Availability slot not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Availability slot deleted" });
  } catch (error) {
    console.error("deleteAvailability error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS  (proxied from Appointment Service)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/doctors/appointments
 * Query: ?status=pending|confirmed|completed|cancelled
 */
const getAppointments = async (req, res) => {
  try {
    const params = {};
    if (req.query.status) params.status = req.query.status;

    const response = await axios.get(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/doctor/${req.doctor._id}`,
      { params, headers: authHeader(req) }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("getAppointments error:", error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || "Failed to fetch appointments",
    });
  }
};

/**
 * PUT /api/doctors/appointments/:id/accept
 */
const acceptAppointment = async (req, res) => {
  try {
    const response = await axios.put(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/${req.params.id}/status`,
      { status: "confirmed" },
      { headers: authHeader(req) }
    );

    // Fire-and-forget notification
    axios
      .post(
        `${NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          type: "appointment_confirmed",
          appointmentId: req.params.id,
          doctorId: req.doctor._id,
        },
        { headers: authHeader(req) }
      )
      .catch((err) =>
        console.warn("Notification send failed (non-blocking):", err.message)
      );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("acceptAppointment error:", error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || "Failed to accept appointment",
    });
  }
};

/**
 * PUT /api/doctors/appointments/:id/reject
 */
const rejectAppointment = async (req, res) => {
  try {
    const { reason } = req.body;

    const response = await axios.put(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/${req.params.id}/status`,
      { status: "rejected", rejectionReason: reason || "" },
      { headers: authHeader(req) }
    );

    axios
      .post(
        `${NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          type: "appointment_rejected",
          appointmentId: req.params.id,
          doctorId: req.doctor._id,
          reason,
        },
        { headers: authHeader(req) }
      )
      .catch((err) =>
        console.warn("Notification send failed (non-blocking):", err.message)
      );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("rejectAppointment error:", error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || "Failed to reject appointment",
    });
  }
};

/**
 * PUT /api/doctors/appointments/:id/complete
 */
const completeAppointment = async (req, res) => {
  try {
    const response = await axios.put(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/${req.params.id}/status`,
      { status: "completed" },
      { headers: authHeader(req) }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("completeAppointment error:", error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to complete appointment",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/doctors/prescriptions
 */
const issuePrescription = async (req, res) => {
  try {
    const { patientId, appointmentId, diagnosis, medications, notes, followUpDate } =
      req.body;

    if (!patientId || !diagnosis) {
      return res
        .status(400)
        .json({ success: false, message: "patientId and diagnosis are required" });
    }

    const prescription = new Prescription({
      doctorId: req.doctor._id,
      patientId,
      appointmentId: appointmentId || null,
      diagnosis,
      medications: medications || [],
      notes,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    });

    await prescription.save();
    return res.status(201).json({ success: true, prescription });
  } catch (error) {
    console.error("issuePrescription error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/doctors/prescriptions
 */
const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      doctorId: req.doctor._id,
    }).sort({ issuedAt: -1 });

    return res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    console.error("getPrescriptions error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/doctors/prescriptions/patient/:patientId
 * Patient can fetch only their own prescriptions.
 * Doctor/admin can fetch prescriptions for any patient.
 */
const getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ success: false, message: "patientId is required" });
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : "";
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided. Access denied." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    const requesterId = String(decoded.userId || decoded.id || decoded._id || "");
    const requesterRole = decoded.role || "patient";

    const isSamePatient = requesterRole === "patient" && requesterId === String(patientId);
    const isPrivileged = requesterRole === "doctor" || requesterRole === "admin";

    if (!isSamePatient && !isPrivileged) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const prescriptions = await Prescription.find({ patientId }).sort({ issuedAt: -1 });
    return res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    console.error("getPrescriptionsByPatient error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/doctors/prescriptions/:prescriptionId
 * Patient may delete their own record; doctor may delete prescriptions they issued; admin may delete any.
 */
const deletePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
      return res.status(400).json({ success: false, message: "Invalid prescription id" });
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : "";
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided. Access denied." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    const requesterId = String(decoded.userId || decoded.id || decoded._id || "");
    const requesterRole = decoded.role || "patient";

    let allowed = false;
    if (requesterRole === "patient") {
      allowed = String(prescription.patientId) === requesterId;
    } else if (requesterRole === "doctor") {
      allowed = String(prescription.doctorId) === requesterId;
    } else if (requesterRole === "admin") {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await Prescription.deleteOne({ _id: prescription._id });
    return res.status(200).json({ success: true, message: "Prescription deleted" });
  } catch (error) {
    console.error("deletePrescription error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/doctors/patients
 * Get all unique patients for the logged-in doctor
 * Fetches patient IDs from appointment service, then gets details from patient service
 */
const getPatients = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    console.log("=== getPatients Debug ===");
    console.log("Doctor ID:", doctorId);
    console.log("Appointment Service URL:", APPOINTMENT_SERVICE_URL);

    // 1. Call appointment service to get patient IDs and stats
    let appointmentServiceResponse;
    try {
      console.log(`Calling: ${APPOINTMENT_SERVICE_URL}/api/appointments/manage/doctor/${doctorId}/patients`);

      appointmentServiceResponse = await axios.get(
        `${APPOINTMENT_SERVICE_URL}/api/appointments/manage/doctor/${doctorId}/patients`,
        {
          headers: authHeader(req),
          timeout: 5000,
        }
      );

      console.log("Appointment service response status:", appointmentServiceResponse.status);
      console.log("Appointment service response data:", appointmentServiceResponse.data);

    } catch (err) {
      console.error("Failed to fetch from appointment service:");
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      }
      // If appointment service fails, fall back to prescriptions only
      console.log("Falling back to prescriptions only...");
      return await getPatientsFromPrescriptions(req, res);
    }

    const { patientIds, patientStats } = appointmentServiceResponse.data;

    if (!patientIds || patientIds.length === 0) {
      return res.status(200).json({ success: true, patients: [] });
    }

    // 2. Create a map of patient stats for quick lookup
    const statsMap = new Map();
    patientStats.forEach(stat => {
      statsMap.set(stat.patientId.toString(), {
        lastAppointment: stat.lastAppointment,
        appointmentCount: stat.appointmentCount,
      });
    });

    // 3. Fetch patient details from Patient Service
    const patientDetails = await Promise.allSettled(
      patientIds.map(async (patientId) => {
        try {
          const response = await axios.get(
            `${PATIENT_SERVICE_URL}/api/patients/${patientId}`,
            {
              headers: authHeader(req),
              timeout: 5000,
            }
          );

          const patient = response.data?.patient || response.data;
          const stats = statsMap.get(patientId.toString()) || {};

          // Get prescription count from doctor service database
          const prescriptionCount = await Prescription.countDocuments({
            doctorId: doctorId,
            patientId: patientId,
          });

          return {
            ...patient,
            lastAppointment: stats.lastAppointment,
            appointmentCount: stats.appointmentCount || 0,
            totalVisits: stats.appointmentCount || 0,
            lastVisit: stats.lastAppointment,
            prescriptionCount,
          };
        } catch (err) {
          console.warn(`Failed to fetch patient ${patientId}:`, err.message);
          return null;
        }
      })
    );

    // 4. Filter out failed requests
    const patients = patientDetails
      .filter(result => result.status === "fulfilled" && result.value !== null)
      .map(result => result.value);

    // 5. Sort by last appointment (most recent first)
    patients.sort((a, b) => {
      if (!a.lastAppointment) return 1;
      if (!b.lastAppointment) return -1;
      return new Date(b.lastAppointment) - new Date(a.lastAppointment);
    });

    return res.status(200).json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("getPatients error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fallback function to get patients from prescriptions only
const getPatientsFromPrescriptions = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    // Get unique patientIds from prescriptions
    const patientIds = await Prescription.distinct("patientId", { doctorId });

    if (patientIds.length === 0) {
      return res.status(200).json({ success: true, patients: [] });
    }

    // Fetch patient details from Patient Service
    const patients = await Promise.all(
      patientIds.map(async (patientId) => {
        try {
          const response = await axios.get(
            `${PATIENT_SERVICE_URL}/api/patients/${patientId}`,
            { headers: authHeader(req) }
          );
          return response.data?.patient || response.data;
        } catch (err) {
          console.warn(`Failed to fetch patient ${patientId}:`, err.message);
          return null;
        }
      })
    );

    const validPatients = patients.filter(p => p !== null);

    return res.status(200).json({
      success: true,
      patients: validPatients,
      source: "prescriptions_only",
    });
  } catch (error) {
    console.error("getPatientsFromPrescriptions error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * GET /api/doctors/patients/:patientId
 * Full patient profile + prescription history
 */
const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Call Patient Service for profile
    const patientResponse = await axios.get(
      `${PATIENT_SERVICE_URL}/api/patients/${patientId}`,
      { headers: authHeader(req) }
    );

    // Get all prescriptions for this patient by this doctor
    const prescriptions = await Prescription.find({
      doctorId: req.doctor._id,
      patientId,
    }).sort({ issuedAt: -1 });

    return res.status(200).json({
      success: true,
      patient: patientResponse.data?.patient || patientResponse.data,
      prescriptions,
    });
  } catch (error) {
    console.error("getPatientDetails error:", error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch patient details",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/doctors/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    // Total unique patients
    const totalPatients = await Prescription.distinct("patientId", { doctorId });

    // Total prescriptions
    const totalPrescriptions = await Prescription.countDocuments({ doctorId });

    // Fetch appointment counts from Appointment Service
    let todayAppointments = 0;
    let pendingAppointments = 0;

    try {
      const apptRes = await axios.get(
        `${APPOINTMENT_SERVICE_URL}/api/appointments/doctor/${doctorId}/stats`,
        { headers: authHeader(req) }
      );
      todayAppointments = apptRes.data?.todayAppointments ?? 0;
      pendingAppointments = apptRes.data?.pendingAppointments ?? 0;
    } catch (err) {
      console.warn(
        "Could not fetch appointment stats (non-critical):",
        err.message
      );
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalPatients: totalPatients.length,
        todayAppointments,
        pendingAppointments,
        totalPrescriptions,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PATIENT-FACING ENDPOINTS (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/doctors
 * Public search: ?name=&specialty=&date=
 */
const searchDoctors = async (req, res) => {
  try {
    const filter = { isVerified: true, isActive: true };

    if (req.query.name) {
      filter.name = { $regex: req.query.name, $options: "i" };
    }
    if (req.query.specialty) {
      filter.specialty = { $regex: req.query.specialty, $options: "i" };
    }

    const doctors = await Doctor.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, doctors });
  } catch (error) {
    console.error("searchDoctors error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/doctors/:id
 * Public doctor profile (no password)
 */
const getPublicDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select("-password");
    if (!doctor || !doctor.isVerified) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    console.error("getPublicDoctorProfile error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/doctors/:id/availability
 * Public availability for a specific doctor, filtered by ?date=YYYY-MM-DD
 */
const getPublicDoctorAvailability = async (req, res) => {
  try {
    const query = { doctorId: req.params.id };

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const dayOfWeek = targetDate.getDay();
      query.$or = [
        { dayOfWeek, isRecurring: true },
        {
          specificDate: {
            $gte: new Date(req.query.date),
            $lt: new Date(new Date(req.query.date).setDate(targetDate.getDate() + 1)),
          },
        },
      ];
    }

    const slots = await Availability.find(query).sort({ startTime: 1 });
    return res.status(200).json({ success: true, availability: slots });
  } catch (error) {
    console.error("getPublicDoctorAvailability error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // Private (requires auth)
  getDoctorProfile,
  updateDoctorProfile,
  changePassword,
  addAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  getAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  issuePrescription,
  getPrescriptions,
  getPrescriptionsByPatient,
  deletePrescription,
  getPatients,
  getPatientDetails,
  getDashboardStats,
  // Public (no auth)
  searchDoctors,
  getPublicDoctorProfile,
  getPublicDoctorAvailability,
};