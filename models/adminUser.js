const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    username: String,
    name: String,
    email: String,
    secondary_email: String,
    password: String,
    access_token: String, 
    long_lived_user_access_token :String,
    google_access_token: { type: String, default: "" },
    google_refresh_token: { type: String, default: "" },
    spreadsheet_id: { type: String, default: "" },  
    secondary_email: { type: String, default: "" },  
    x_access_token :String,
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
