const axios = require("axios");

const APPOINTMENT_SERVICE_URL =
    process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:3003";
const PATIENT_SERVICE_URL =
    process.env.PATIENT_SERVICE_URL || "http://patient-service:3001";

const authHeader = (req) => ({
    Authorization: req.headers.authorization || "",
});

const errorResponse = (res, statusCode, message) =>
    res.status(statusCode).json({ success: false, code: statusCode, message });

/**
 * GET /api/doctors/consultation/:appointmentId
 * Fetch appointment + patient data for consultation page
 */
const getConsultationData = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.doctor._id;

        // 1. Fetch appointment from appointment service
        let appointment;
        try {
            const apptRes = await axios.get(
                `${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
                { headers: authHeader(req) }
            );
            appointment = apptRes.data.appointment;

            // Verify doctor owns this appointment
            if (appointment.doctorId !== doctorId.toString()) {
                return errorResponse(res, 403, "You don't have access to this appointment");
            }
        } catch (err) {
            console.error("Failed to fetch appointment:", err.message);
            return errorResponse(res, err.response?.status || 500,
                err.response?.data?.message || "Failed to fetch appointment details");
        }

        // 2. Fetch patient data from patient service
        const patientId = appointment.patientId;
        let patientData = null;

        if (patientId) {
            try {
                const patientRes = await axios.get(
                    `${PATIENT_SERVICE_URL}/api/patients/doctor/patient/${patientId}/summary`,
                    { headers: authHeader(req) }
                );
                patientData = patientRes.data;
            } catch (err) {
                console.error("Failed to fetch patient data:", err.message);
                // Don't fail the whole request, just log error
                patientData = { patient: null, prescriptions: [], metrics: null, reports: null };
            }
        }

        return res.status(200).json({
            success: true,
            appointment,
            patient: patientData?.patient || null,
            prescriptions: patientData?.prescriptions || [],
            metrics: patientData?.metrics || null,
            reports: patientData?.reports || null,
        });
    } catch (error) {
        console.error("getConsultationData error:", error);
        return errorResponse(res, 500, "Failed to load consultation data");
    }
};

/**
 * PUT /api/doctors/consultation/:appointmentId/complete
 * Mark appointment as completed
 */
const completeConsultation = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.doctor._id;

        // Verify appointment exists and belongs to doctor
        let appointment;
        try {
            const apptRes = await axios.get(
                `${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
                { headers: authHeader(req) }
            );
            appointment = apptRes.data.appointment;

            if (appointment.doctorId !== doctorId.toString()) {
                return errorResponse(res, 403, "You don't have access to this appointment");
            }

            if (appointment.status !== "confirmed") {
                return errorResponse(res, 400, `Cannot complete appointment with status: ${appointment.status}`);
            }
        } catch (err) {
            return errorResponse(res, err.response?.status || 500,
                err.response?.data?.message || "Failed to verify appointment");
        }

        // Update appointment status to completed
        await axios.put(
            `${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}/status`,
            { status: "completed" },
            { headers: authHeader(req) }
        );

        return res.status(200).json({
            success: true,
            message: "Consultation completed successfully",
        });
    } catch (error) {
        console.error("completeConsultation error:", error);
        return errorResponse(res, 500, "Failed to complete consultation");
    }
};

module.exports = {
    getConsultationData,
    completeConsultation,
};