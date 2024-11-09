const mongoose = require("mongoose");

const threadSchema = mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      required: true,
    },
    image: {
      type: String, // Store the image URL
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser", // Reference to the User model
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Thread", threadSchema);
