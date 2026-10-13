
const express = require("express");
const ActivityLog = require("../models/ActivityLog");

const router = express.Router();

// POST /api/activities
router.post("/", async (req, res) => {
  try {
    const activity = await ActivityLog.create(req.body);

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/activities
router.get("/", async (req, res) => {
  try {
    const activities = await ActivityLog.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve activities",
    });
  }
});

module.exports = router;
