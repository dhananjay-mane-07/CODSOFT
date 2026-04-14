const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/profile  — logged-in user's own profile
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile  — update own profile
router.put("/", authMiddleware, async (req, res, next) => {
  try {
    const { name, mobile, education, skills, profileImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined)         user.name         = name;
    if (mobile !== undefined)       user.mobile       = mobile;
    if (education !== undefined)    user.education    = education;
    if (skills !== undefined)       user.skills       = Array.isArray(skills) ? skills : [];
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    const updated = await User.findById(req.user._id).select("-password");
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/profile/:userId  — public profile (for employer to view applicant)
router.get("/:userId", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name email mobile education skills profileImage role"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
