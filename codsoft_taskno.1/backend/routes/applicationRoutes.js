const express = require("express");
const router = express.Router();
const multer = require("multer");
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");

// Multer: store in memory, accept PDF and DOCX
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed"));
    }
  }
});

// Upload resume and apply to a job
router.post("/:jobId", authMiddleware, upload.single("resume"), async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Support both file upload and URL
    let resumeUrl = req.body.resumeUrl || "";
    let resumeData = null;
    let resumeMimeType = null;
    let resumeFileName = null;

    if (req.file) {
      // Convert to base64 for storage in DB
      resumeData = req.file.buffer.toString("base64");
      resumeMimeType = req.file.mimetype;
      resumeFileName = req.file.originalname;
      resumeUrl = `data:${resumeMimeType};base64,${resumeData}`;
    }

    if (!resumeUrl) {
      return res.status(400).json({ message: "Resume is required (upload file or provide URL)" });
    }

    // Prevent duplicate application
    const alreadyApplied = await Application.findOne({
      job: jobId,
      applicant: req.user._id
    });

    if (alreadyApplied) {
      return res.status(400).json({ message: "You already applied to this job" });
    }

    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      resumeUrl,
      resumeFileName: resumeFileName || "resume",
      resumeMimeType: resumeMimeType || "application/pdf"
    });

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

// Get my applications (candidate)
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
