const sessionService = require("../services/session.service");

const createSession = async (req, res, next) => {
  try {
    const session = await sessionService.createSession(req.body);
    return res.status(201).json({
      success: true,
      message: "Video consultation session created successfully.",
      data: session
    });
  } catch (error) {
    return next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found."
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

module.exports = {
  createSession,
  getSessionById
};
