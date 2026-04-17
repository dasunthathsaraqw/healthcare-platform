// src/services/agora.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Agora RTC Token Service
//
// WHY TOKEN GENERATION MUST BE IN THE BACKEND:
//   • The Agora App Certificate is a secret key. Exposing it in the frontend
//     (browser / React Native app) allows any user to generate unlimited tokens
//     for any channel — completely bypassing your access control.
//   • Tokens generated here can be scoped to a specific channelName, uid, role,
//     and expiry window, so each token is tightly bound to one authorised session.
//   • This is Agora's officially recommended architecture:
//     https://docs.agora.io/en/video-calling/token-authentication/get-server-side-token
//
// FLOW:
//   1. Frontend calls  POST /api/telemedicine/sessions/:id/token  with its uid.
//   2. This service verifies the caller's JWT and session ownership.
//   3. generateRtcToken() is called and the short-lived token is returned.
//   4. Frontend passes { appId, channelName, token, uid } to the Agora SDK.
//   5. Token expires automatically — the frontend must refresh via the same endpoint.
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

// agora-token is the official Agora server-side token builder for Node.js.
// Install: npm install agora-token
const { RtcTokenBuilder, RtcRole } = require("agora-token");

// ── Environment variables ──────────────────────────────────────────────────────
const AGORA_APP_ID          = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Token expiry in seconds (default: 1 hour).
// Keep short — the frontend can always request a fresh token.
const AGORA_TOKEN_EXPIRY = parseInt(
  process.env.AGORA_TOKEN_EXPIRY || "3600",
  10
);

// ── Role constants (re-exported so controllers don't need to import agora-token) ─
const ROLES = {
  PUBLISHER:   RtcRole.PUBLISHER,   // Can publish audio/video (doctor + patient)
  SUBSCRIBER:  RtcRole.SUBSCRIBER,  // Can only receive (e.g. observer / recording)
};

// ── Startup config validation ─────────────────────────────────────────────────
// Warn loudly at startup rather than failing silently on the first token request.
const validateConfig = () => {
  const missing = [];
  if (!AGORA_APP_ID)          missing.push("AGORA_APP_ID");
  if (!AGORA_APP_CERTIFICATE) missing.push("AGORA_APP_CERTIFICATE");

  if (missing.length > 0) {
    console.warn(
      `⚠️  [AgoraService] Missing env vars: ${missing.join(", ")}. ` +
      "Token generation will fail until these are set."
    );
    return false;
  }
  return true;
};

// Run once at module load so the issue surfaces at startup, not at runtime.
validateConfig();

// ─────────────────────────────────────────────────────────────────────────────
// generateRtcToken({ channelName, uid, role, expirySeconds? })
//
// Parameters:
//   channelName   {string}  — The Agora channel (= TelemedicineSession.channelName)
//   uid           {number}  — Numeric user ID for the Agora session.
//                             Convention: use 0 to let Agora assign one,
//                             or map your user's numeric hash.
//   role          {string}  — "PUBLISHER" | "SUBSCRIBER" (defaults to PUBLISHER)
//   expirySeconds {number}  — Override the global AGORA_TOKEN_EXPIRY
//
// Returns:
//   { token, channelName, uid, role, appId, expiresAt }
//
// Throws:
//   500 — if AGORA_APP_ID or AGORA_APP_CERTIFICATE are not configured
// ─────────────────────────────────────────────────────────────────────────────
const generateRtcToken = ({
  channelName,
  uid = 0,
  role = "PUBLISHER",
  expirySeconds = AGORA_TOKEN_EXPIRY,
}) => {
  // Guard: fail clearly if secrets are missing
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    const err = new Error(
      "Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE."
    );
    err.statusCode = 500;
    throw err;
  }

  if (!channelName || typeof channelName !== "string") {
    const err = new Error("channelName must be a non-empty string.");
    err.statusCode = 400;
    throw err;
  }

  // uid must be a non-negative integer for Agora RTC
  const numericUid = typeof uid === "number" ? uid : parseInt(uid, 10) || 0;

  // Agora expects a Unix timestamp (seconds), not a duration
  const currentTime     = Math.floor(Date.now() / 1000);
  const privilegeExpiry = currentTime + expirySeconds;

  // Map role string → Agora RtcRole constant
  const agoraRole = role === "SUBSCRIBER" ? ROLES.SUBSCRIBER : ROLES.PUBLISHER;

  let token;
  try {
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      numericUid,
      agoraRole,
      privilegeExpiry
    );
  } catch (err) {
    console.error("[AgoraService] ❌ Token generation failed:", err.message);
    const error = new Error("Failed to generate Agora token. Check App ID and Certificate.");
    error.statusCode = 500;
    throw error;
  }

  console.log(
    `[AgoraService] ✅ Token generated — channel: ${channelName}, uid: ${numericUid}, ` +
    `role: ${role}, expires in: ${expirySeconds}s`
  );

  return {
    token,
    channelName,
    uid:       numericUid,
    role,
    appId:     AGORA_APP_ID,      // Safe to return — App ID is public
    expiresAt: new Date(privilegeExpiry * 1000).toISOString(),
  };
  // NOTE: AGORA_APP_CERTIFICATE is intentionally NOT included in the response.
};

// ─────────────────────────────────────────────────────────────────────────────
// generateUidFromUserId(userId)
//
// Agora UIDs must be non-negative 32-bit integers.
// This converts a MongoDB ObjectId string (hex) to a stable integer by
// taking the last 8 hex chars and mapping to a uint32.
// Collision probability is negligible for small user bases.
// In production, store the mapping in your user-service instead.
// ─────────────────────────────────────────────────────────────────────────────
const generateUidFromUserId = (userId) => {
  if (!userId) return 0;
  const hex = String(userId).replace(/[^0-9a-f]/gi, "").slice(-8);
  return parseInt(hex || "0", 16) >>> 0; // >>> 0 ensures unsigned 32-bit int
};

module.exports = {
  generateRtcToken,
  generateUidFromUserId,
  ROLES,
  AGORA_APP_ID: () => AGORA_APP_ID, // lazy getter — avoids hardcoding at import time
};
