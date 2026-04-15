const sessionService = require("../services/session.service");
const roomService = require("../services/room.service");

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
    const session = await sessionService.getSessionByAppointmentId(
      req.params.appointmentId
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found for the given appointmentId."
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
    const userId = req.user?.id || req.user?.userId;
    const role = req.user?.role ? String(req.user.role).toLowerCase() : "";

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
  getMySessions
};
