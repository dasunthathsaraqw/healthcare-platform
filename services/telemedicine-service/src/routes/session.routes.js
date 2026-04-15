const express = require("express");
const sessionController = require("../controllers/session.controller");

const router = express.Router();

router.post("/", sessionController.createSession);
router.get("/:id", sessionController.getSessionById);

module.exports = router;
