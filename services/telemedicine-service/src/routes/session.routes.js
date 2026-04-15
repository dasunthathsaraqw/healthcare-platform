const express = require("express");
const sessionController = require("../controllers/session.controller");

const router = express.Router();

router.post("/", sessionController.createSession);
router.get("/my-sessions", sessionController.getMySessions);
router.get(
  "/appointment/:appointmentId",
  sessionController.getSessionByAppointmentId
);
router.patch("/appointment/:appointmentId/start", sessionController.startSession);
router.patch("/appointment/:appointmentId/end", sessionController.endSession);

module.exports = router;
