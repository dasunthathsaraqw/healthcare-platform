const Session = require("../models/session.model");

const createSession = async (payload) => {
  return Session.create(payload);
};

const getSessionByAppointmentId = async (appointmentId) => {
  return Session.findOne({ appointmentId });
};

const startSession = async (appointmentId) => {
  return Session.findOneAndUpdate(
    { appointmentId },
    { status: "ACTIVE", startedAt: new Date() },
    { new: true }
  );
};

const endSession = async (appointmentId) => {
  return Session.findOneAndUpdate(
    { appointmentId },
    { status: "ENDED", endedAt: new Date() },
    { new: true }
  );
};

const getMySessions = async (userId, role) => {
  if (role === "doctor") {
    return Session.find({ doctorId: userId }).sort({ scheduledAt: -1 });
  }

  if (role === "patient") {
    return Session.find({ patientId: userId }).sort({ scheduledAt: -1 });
  }

  return Session.find({
    $or: [{ doctorId: userId }, { patientId: userId }]
  }).sort({ scheduledAt: -1 });
};

module.exports = {
  createSession,
  getSessionByAppointmentId,
  startSession,
  endSession,
  getMySessions
};
