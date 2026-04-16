// src/controllers/chatController.js
// REST handlers for the in-session chat feature.
//
// Routes registered in chatRouter.js:
//   GET  /api/telemedicine/chat/:appointmentId          → getMessages
//   POST /api/telemedicine/chat/:appointmentId           → sendMessage
//   PATCH /api/telemedicine/chat/:appointmentId/read     → markAsRead

"use strict";

const ChatMessage = require("../models/ChatMessage");

// ── Helpers ────────────────────────────────────────────────────────────────────

const handleError = (res, err, fallback = "Internal server error") => {
  console.error(`[ChatController] ${fallback}:`, err.message);
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || fallback,
  });
};

// ── GET /api/telemedicine/chat/:appointmentId ──────────────────────────────────
// Fetch all messages for a session (paginated, newest-first or oldest-first)
// Query: ?limit=50&before=<createdAt ISO>

const getMessages = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const filter = { appointmentId };
    if (before && !isNaN(before)) {
      filter.createdAt = { $lt: before };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: 1 })           // oldest first (chat order)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (err) {
    return handleError(res, err, "Failed to fetch chat messages");
  }
};

// ── POST /api/telemedicine/chat/:appointmentId ─────────────────────────────────
// Send a new message
// Body: { message }

const sendMessage = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    const senderId   = req.user.id   || req.user._id;
    const senderName = req.user.name || req.user.email || "Unknown";
    const senderRole = req.user.role || "patient";

    const chat = await ChatMessage.create({
      appointmentId,
      senderId,
      senderName,
      senderRole,
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: chat,
    });
  } catch (err) {
    return handleError(res, err, "Failed to send message");
  }
};

// ── PATCH /api/telemedicine/chat/:appointmentId/read ──────────────────────────
// Mark all messages in this appointment as read for the current user
// (i.e., messages NOT sent by this user)

const markAsRead = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id || req.user._id;

    await ChatMessage.updateMany(
      { appointmentId, senderId: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({ success: true, message: "Messages marked as read." });
  } catch (err) {
    return handleError(res, err, "Failed to mark messages as read");
  }
};

// ── GET /api/telemedicine/chat/:appointmentId/unread ──────────────────────────
// Count unread messages sent by the OTHER party

const getUnreadCount = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id || req.user._id;

    const count = await ChatMessage.countDocuments({
      appointmentId,
      senderId: { $ne: userId },
      read: false,
    });

    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    return handleError(res, err, "Failed to get unread count");
  }
};

module.exports = { getMessages, sendMessage, markAsRead, getUnreadCount };
