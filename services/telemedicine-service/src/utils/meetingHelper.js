// src/utils/meetingHelper.js
// Pure helper functions for generating Jitsi video room names and links.
// Keeping this logic here (instead of inline in the controller) makes it
// easy to swap the video provider later (e.g. Daily.co, Zoom, custom WebRTC).

const { v4: uuidv4 } = require("uuid");

/**
 * Generate a deterministic, collision-resistant Jitsi room name.
 * Format: healthcare-<appointmentId>-<shortUuid>
 *
 * @param {string} appointmentId  - MongoDB ObjectId string of the appointment
 * @returns {string}              - URL-safe room name
 */
const generateRoomName = (appointmentId) => {
  const short = uuidv4().replace(/-/g, "").slice(0, 8);
  return `healthcare-${appointmentId}-${short}`;
};

/**
 * Build the full Jitsi meeting URL from a room name.
 * The base URL can be overridden via JITSI_BASE_URL env var so you can
 * point to a self-hosted Jitsi server in production.
 *
 * @param {string} roomName - Result of generateRoomName()
 * @returns {string}        - Full URL the patient/doctor opens in browser
 */
const buildMeetingLink = (roomName) => {
  const base =
    process.env.JITSI_BASE_URL || "https://meet.jit.si";
  return `${base}/${roomName}`;
};

/**
 * Convenience: generate room + link in one call.
 *
 * @param {string} appointmentId
 * @returns {{ roomName: string, meetingLink: string }}
 */
const generateMeetingDetails = (appointmentId) => {
  const roomName = generateRoomName(appointmentId);
  const meetingLink = buildMeetingLink(roomName);
  return { roomName, meetingLink };
};

/**
 * Calculate session duration in whole minutes between two Date objects.
 * Returns null if either argument is missing.
 *
 * @param {Date} startedAt
 * @param {Date} endedAt
 * @returns {number|null}
 */
const calcDurationMinutes = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt) - new Date(startedAt);
  return Math.max(0, Math.round(ms / 60000));
};

module.exports = {
  generateRoomName,
  buildMeetingLink,
  generateMeetingDetails,
  calcDurationMinutes,
};
