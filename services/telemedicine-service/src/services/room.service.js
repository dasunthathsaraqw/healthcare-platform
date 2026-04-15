const crypto = require("crypto");

const sanitizeRoomSegment = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
};

const generateRoomId = (appointmentId) => {
  const base = sanitizeRoomSegment(appointmentId);

  if (!base) {
    throw new Error("A valid appointmentId is required to generate room ID.");
  }

  const uniqueSuffix = crypto.randomBytes(4).toString("hex");
  return `telemed-${base}-${uniqueSuffix}`;
};

const generateJoinUrl = (roomId) => {
  const safeRoomId = sanitizeRoomSegment(roomId);

  if (!safeRoomId) {
    throw new Error("A valid roomId is required to generate join URL.");
  }

  return `https://meet.jit.si/${safeRoomId}`;
};

module.exports = {
  generateRoomId,
  generateJoinUrl
};
