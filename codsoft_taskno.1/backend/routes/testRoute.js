const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Backend working!" });
});

router.get("/protected", (req, res) => {
  res.json({ message: "Access granted!" });
});

module.exports = router;
