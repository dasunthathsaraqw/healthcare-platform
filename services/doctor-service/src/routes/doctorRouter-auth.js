const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Doctor routes - to be implemented" });
});

module.exports = router;
