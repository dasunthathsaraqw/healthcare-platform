// src/routes/chatRouter.js
// Chat routes — all mounted at /api/telemedicine/chat in app.js

"use strict";

const express = require("express");
const router  = express.Router();

const { authenticate } = require("../middleware/authMiddleware");
const {
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
} = require("../controllers/chatController");

// GET  /api/telemedicine/chat/:appointmentId          — fetch messages
router.get("/:appointmentId", authenticate, getMessages);

// POST /api/telemedicine/chat/:appointmentId          — send message
router.post("/:appointmentId", authenticate, sendMessage);

// GET  /api/telemedicine/chat/:appointmentId/unread   — unread count
router.get("/:appointmentId/unread", authenticate, getUnreadCount);

// PATCH /api/telemedicine/chat/:appointmentId/read    — mark all as read
router.patch("/:appointmentId/read", authenticate, markAsRead);

module.exports = router;
