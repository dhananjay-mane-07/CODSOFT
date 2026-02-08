const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const authMiddleware = require("../middleware/authMiddleware");

// create job 
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
    next(err); // send to error middleware
  }
});

module.exports = router;