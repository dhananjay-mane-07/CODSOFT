const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");

// apply to job
router.post("/:jobId", authMiddleware, async (req, res, next) => {
  try {
    const { resumeUrl } = req.body;

    if (!resumeUrl) {
      res.status(400);
      throw new Error("Resume URL is required");
    }

    const application = await Application.create({
      job: req.params.jobId,
      applicant: req.user._id,
      resumeUrl
    });

    res.status(201).json(application);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
