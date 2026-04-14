const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");

// 🔹 Create job (employer only)
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, company, location, description, eligibility, skills, jobType, salary } = req.body;

    if (!title || !company || !location) {
      res.status(400);
      throw new Error("Title, company, and location are required");
    }

    const job = await Job.create({
      title,
      company,
      location,
      description: description || "",
      eligibility: eligibility || "",
      skills: skills || [],
      jobType: jobType || "Full-time",
      salary: salary || "",
      createdBy: req.user._id
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// 🔹 Get my posted jobs (employer)
router.get("/my", authMiddleware, async (req, res, next) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// 🔹 Get applicants for a specific job (employer)
router.get("/:id/applicants", authMiddleware, async (req, res, next) => {
  try {
    const applications = await Application.find({ job: req.params.id })
      .populate("applicant", "name email");
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// 🔹 Search + filter all jobs
router.get("/", async (req, res, next) => {
  try {
    const { keyword, location } = req.query;
    const query = {};
    if (keyword) query.title = { $regex: keyword, $options: "i" };
    if (location) query.location = { $regex: location, $options: "i" };

    const jobs = await Job.find(query)
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// 🔹 Get single job by ID
router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate("createdBy", "email");
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
