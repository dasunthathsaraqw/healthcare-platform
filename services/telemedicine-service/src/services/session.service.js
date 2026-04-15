const Session = require("../models/session.model");

const createSession = async (payload) => {
  return Session.create(payload);
};

const getSessionById = async (sessionId) => {
  return Session.findById(sessionId);
};

module.exports = {
  createSession,
  getSessionById
};
