const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, default: "" },
  eligibility: { type: String, default: "" },
  skills: { type: [String], default: [] },
  jobType: { type: String, default: "Full-time" },
  salary: { type: String, default: "" },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
