const express = require("express");
const sessionController = require("../controllers/session.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/sessions", sessionController.createSession);
router.get("/sessions/:appointmentId", sessionController.getSessionByAppointmentId);
router.patch("/sessions/:appointmentId/start", sessionController.startSession);
router.patch("/sessions/:appointmentId/end", sessionController.endSession);
router.get("/my-sessions", sessionController.getMySessions);

module.exports = router;
