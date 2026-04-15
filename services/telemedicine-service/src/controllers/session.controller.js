const sessionService = require("../services/session.service");
const roomService = require("../services/room.service");

const getAuthUserContext = (req) => {
  const userId = req.user?.id || req.user?.userId || req.user?._id;
  const role = req.user?.role ? String(req.user.role).toLowerCase() : "";

  return { userId: userId ? String(userId) : "", role };
};

const isSessionParticipant = (session, userId) => {
  if (!userId) {
    return false;
  }

  return (
    String(session.doctorId) === String(userId) ||
    String(session.patientId) === String(userId)
  );
};

const isDoctorOfSession = (session, userId, role) => {
  return role === "doctor" && String(session.doctorId) === String(userId);
};

// Keep this helper reusable for a future consultation-notes endpoint.
const canAddConsultationNotes = (session, userId, role) => {
  return isDoctorOfSession(session, userId, role);
};

const createSession = async (req, res, next) => {
  try {
    const { appointmentId, doctorId, patientId, scheduledAt } = req.body;

    if (!appointmentId || !doctorId || !patientId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message:
          "appointmentId, doctorId, patientId, and scheduledAt are required."
      });
    }

    const existingSession = await sessionService.getSessionByAppointmentId(
      appointmentId
    );

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: "Session already exists for this appointmentId."
      });
    }

    const roomId = roomService.generateRoomId(appointmentId);
    const joinUrl = roomService.generateJoinUrl(roomId);

    const session = await sessionService.createSession({
      appointmentId,
      doctorId,
      patientId,
      scheduledAt,
      roomId,
      joinUrl
    });

    return res.status(201).json({
      success: true,
      message: "Video consultation session created successfully.",
      data: session
    });
  } catch (error) {
    return next(error);
  }
};

const getSessionByAppointmentId = async (req, res, next) => {
  try {
    const { userId } = getAuthUserContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User context is required."
      });
    }

    const session = await sessionService.getSessionByAppointmentId(
      req.params.appointmentId
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
      });
    }

    if (!isSessionParticipant(session, userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have access to this session."
      });
    }

    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    return next(error);
  }
};

const startSession = async (req, res, next) => {
  try {
    const { userId, role } = getAuthUserContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User context is required."
      });
    }

    const existingSession = await sessionService.getSessionByAppointmentId(
      req.params.appointmentId
    );

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
      });
    }

    if (!isDoctorOfSession(existingSession, userId, role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Only the assigned doctor can start this session."
      });
    }

    const session = await sessionService.startSession(req.params.appointmentId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session started successfully.",
      data: session
    });
  } catch (error) {
    return next(error);
  }
};

const endSession = async (req, res, next) => {
  try {
    const { userId } = getAuthUserContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User context is required."
      });
    }

    const existingSession = await sessionService.getSessionByAppointmentId(
      req.params.appointmentId
    );

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
      });
    }

    if (!isSessionParticipant(existingSession, userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have access to end this session."
      });
    }

    const session = await sessionService.endSession(req.params.appointmentId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session ended successfully.",
      data: session
    });
  } catch (error) {
    return next(error);
  }
};

const getMySessions = async (req, res, next) => {
  try {
    const { userId, role } = getAuthUserContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User context is required."
      });
    }

    const sessions = await sessionService.getMySessions(userId, role);

    return res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSession,
  getSessionByAppointmentId,
  startSession,
  endSession,
  getMySessions,
  canAddConsultationNotes
};
