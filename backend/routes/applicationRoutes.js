const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");

// Apply to a job
router.post("/:jobId", authMiddleware, async (req, res, next) => {
  try {
    const { resumeUrl } = req.body;
    const { jobId } = req.params;

    if (!resumeUrl) {
      return res.status(400).json({ message: "Resume URL is required" });
    }

    // 🚫 Prevent duplicate application
    const alreadyApplied = await Application.findOne({
      job: jobId,
      applicant: req.user._id
    });

    if (alreadyApplied) {
      return res.status(400).json({ message: "You already applied to this job" });
    }

    const application = await Application.create({
      job: jobId, // ✅ correct source
      applicant: req.user._id,
      resumeUrl
    });

    res.status(201).json(application);

  } catch (err) {
    next(err);
  }
});

// Get my applications
router.get("/my", authMiddleware, async (req, res, next) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id
    }).populate("job");

    res.json(applications);

  } catch (err) {
    next(err);
  }
});


module.exports = router;
