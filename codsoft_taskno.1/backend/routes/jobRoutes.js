const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const authMiddleware = require("../middleware/authMiddleware");

// 🔹 Get jobs of logged-in employer
router.get("/my-jobs", authMiddleware, async (req, res, next) => {
  try {
    console.log("User ID:", req.user._id); // debug

    const jobs = await Job.find({ createdBy: req.user._id });

    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// 🔹 Create job
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, company, location } = req.body;

    if (!title || !company || !location) {
      res.status(400);
      throw new Error("Title, company, and location are required");
    }

    const job = await Job.create({
      title,
      company,
      location,
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json(job);

  } catch (err) {
    next(err);
  }
});


// 🔹 Search + filter jobs
router.get("/", async (req, res, next) => {
  try {
    const { keyword, location } = req.query;

    const query = {};

    if (keyword) {
      query.title = { $regex: keyword, $options: "i" };
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const jobs = await Job.find(query).populate("createdBy", "email");

    res.json(jobs);

  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("createdBy", "email");

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
