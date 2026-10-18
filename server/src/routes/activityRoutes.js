
const express = require("express");
const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Protect every route defined in this router.
router.use(protect);

// CREATE an activity
router.post("/", async (req, res) => {
  try {
    const {
      mediaId,
      mediaType,
      title,
      status,
      rating,
      review,
      watchedAt,
    } = req.body;

    // Validate required fields.
    if (
      !Number.isInteger(mediaId) ||
      mediaId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      !["movie", "tv"].includes(mediaType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid mediaId, mediaType and title are required.",
      });
    }

    // Validate optional fields.
    if (
      status !== undefined &&
      !["watched", "watching", "plan_to_watch"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity status.",
      });
    }

    if (
      rating !== undefined &&
      rating !== null &&
      (
        typeof rating !== "number" ||
        !Number.isFinite(rating) ||
        rating < 0 ||
        rating > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 0 and 10.",
      });
    }

    if (
      review !== undefined &&
      (
        typeof review !== "string" ||
        review.length > 2000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Review must be text with at most 2000 characters.",
      });
    }

    let parsedWatchedAt;

    if (watchedAt !== undefined && watchedAt !== null) {
      if (
        typeof watchedAt !== "string" ||
        Number.isNaN(Date.parse(watchedAt))
      ) {
        return res.status(400).json({
          success: false,
          message: "watchedAt must be a valid date.",
        });
      }

      parsedWatchedAt = new Date(watchedAt);
    }

    // Never accept userId from the request body.
    const activity = await ActivityLog.create({
      userId: req.user.id,
      mediaId,
      mediaType,
      title: title.trim(),
      ...(status !== undefined && { status }),
      ...(rating !== undefined && { rating }),
      ...(review !== undefined && { review }),
      ...(watchedAt !== undefined && { watchedAt: parsedWatchedAt }),
    });

    return res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Create activity error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create activity.",
    });
  }
});


/* GET analytics for the authenticated user */
router.get("/analytics", async (req, res) => {
  try {
    const results = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: null,

          totalActivities: { $sum: 1 },

          watched: {
            $sum: {
              $cond: [{ $eq: ["$status", "watched"] }, 1, 0],
            },
          },

          watching: {
            $sum: {
              $cond: [{ $eq: ["$status", "watching"] }, 1, 0],
            },
          },

          planToWatch: {
            $sum: {
              $cond: [
                { $eq: ["$status", "plan_to_watch"] },
                1,
                0,
              ],
            },
          },

          movies: {
            $sum: {
              $cond: [{ $eq: ["$mediaType", "movie"] }, 1, 0],
            },
          },

          tvShows: {
            $sum: {
              $cond: [{ $eq: ["$mediaType", "tv"] }, 1, 0],
            },
          },

          averageRating: { $avg: "$rating" },
        },
      },
      {
        $project: {
          _id: 0,
          totalActivities: 1,
          watched: 1,
          watching: 1,
          planToWatch: 1,
          movies: 1,
          tvShows: 1,
          averageRating: {
            $round: [{ $ifNull: ["$averageRating", 0] }, 2],
          },
        },
      },
    ]);

    const analytics = results[0] || {
      totalActivities: 0,
      watched: 0,
      watching: 0,
      planToWatch: 0,
      movies: 0,
      tvShows: 0,
      averageRating: 0,
    };

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get analytics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve analytics.",
    });
  }
});


// READ all activities belonging to the authenticated user.
router.get("/", async (req, res) => {
  try {
    const activities = await ActivityLog.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get activities error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve activities.",
    });
  }
});


/* GET monthly activity trends for the authenticated user */
router.get("/analytics/monthly", async (req, res) => {
  try {
    const results = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            mediaType: "$mediaType",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    // Prepare the last 6 calendar months, including months with no activity.
    const now = new Date();
    const monthlyData = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );

      monthlyData.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        monthLabel: date.toLocaleString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        movies: 0,
        tvShows: 0,
      });
    }

    for (const result of results) {
      const matchingMonth = monthlyData.find(
        (item) =>
          item.year === result._id.year &&
          item.month === result._id.month
      );

      if (matchingMonth) {
        if (result._id.mediaType === "movie") {
          matchingMonth.movies = result.count;
        } else if (result._id.mediaType === "tv") {
          matchingMonth.tvShows = result.count;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: monthlyData.map(
        ({ monthLabel, movies, tvShows }) => ({
          month: monthLabel,
          movies,
          tvShows,
        })
      ),
    });
  } catch (error) {
    console.error("Monthly analytics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve monthly analytics.",
    });
  }
});


// READ one activity belonging to the authenticated user.
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID.",
      });
    }

    const activity = await ActivityLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Get activity error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve activity.",
    });
  }
});

// UPDATE one activity belonging to the authenticated user.
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID.",
      });
    }

    const allowedFields = ["status", "rating", "review", "watchedAt"];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    if (
      updates.status !== undefined &&
      !["watched", "watching", "plan_to_watch"].includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity status.",
      });
    }

    if (
      updates.rating !== undefined &&
      updates.rating !== null &&
      (
        typeof updates.rating !== "number" ||
        !Number.isFinite(updates.rating) ||
        updates.rating < 0 ||
        updates.rating > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 0 and 10.",
      });
    }

    if (
      updates.review !== undefined &&
      (
        typeof updates.review !== "string" ||
        updates.review.length > 2000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Review must be text with at most 2000 characters.",
      });
    }

    if (updates.watchedAt !== undefined) {
      if (updates.watchedAt === null) {
        // Explicitly allow clearing the watched date.
      } else if (
        typeof updates.watchedAt !== "string" ||
        Number.isNaN(Date.parse(updates.watchedAt))
      ) {
        return res.status(400).json({
          success: false,
          message: "watchedAt must be a valid date or null.",
        });
      } else {
        updates.watchedAt = new Date(updates.watchedAt);
      }
    }

    if (updates.review !== undefined) {
      updates.review = updates.review.trim();
    }

    const activity = await ActivityLog.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Update activity error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update activity.",
    });
  }
});

// DELETE one activity belonging to the authenticated user.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID.",
      });
    }

    const activity = await ActivityLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Activity deleted successfully.",
    });
  } catch (error) {
    console.error("Delete activity error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete activity.",
    });
  }
});

module.exports = router;


//---------------------------------------------

// const express = require("express");
// const ActivityLog = require("../models/ActivityLog");

// const router = express.Router();

// // POST /api/activities
// router.post("/", async (req, res) => {
//   try {
//     const activity = await ActivityLog.create(req.body);

//     res.status(201).json({
//       success: true,
//       data: activity,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // GET /api/activities
// router.get("/", async (req, res) => {
//   try {
//     const activities = await ActivityLog.find().sort({
//       createdAt: -1,
//     });

//     res.status(200).json({
//       success: true,
//       count: activities.length,
//       data: activities,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to retrieve activities",
//     });
//   }
// });

// module.exports = router;
