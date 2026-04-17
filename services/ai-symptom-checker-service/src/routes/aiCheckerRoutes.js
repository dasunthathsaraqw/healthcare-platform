const express = require("express");

const {
  analyzeSymptoms,
  generateInsights,
} = require("../controllers/aiCheckerController");

const router = express.Router();

router.post("/analyze", analyzeSymptoms);
router.post("/insights", generateInsights);

module.exports = router;
