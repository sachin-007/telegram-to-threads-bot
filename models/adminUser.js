const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    username: String,
    name: String,
    email: String,
    password: String,
    access_token: String,
    code: { type: String },
    THREAD_APP_ID: { type: String },
    REDIRECT_URI: { type: String },
    THREADS_APP_SECRET: { type: String },
    threadsUserId: { type: String },
    user_id: String,
    chatId: String,
    logs: [
      {
        logMessage: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    tags: [String], // Added tags field to store tags as an array
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUser", adminUserSchema);
