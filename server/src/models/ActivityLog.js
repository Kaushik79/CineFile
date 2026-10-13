
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    mediaId: {
      type: Number,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["watched", "watching", "plan_to_watch"],
      default: "plan_to_watch",
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    review: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    watchedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
