const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    username: String,
    name: String,
    email: String,
    password: String,
    code: { type: String },
    THREAD_APP_ID: { type: String },
    REDIRECT_URI: { type: String },
    THREADS_APP_SECRET: { type: String },
    access_token: { type: String, default: null },
    user_id: { type: String, default: null },
    logs: [
      {
        logMessage: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUser", adminUserSchema);
