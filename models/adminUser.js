const mongoose = require('mongoose');

<<<<<<< HEAD
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
=======
const adminUserSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  access_token: String,
  code: { type: String },
  logs: [{
    logMessage: String,
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
>>>>>>> parent of 7d00c33 (authController refined)


module.exports = mongoose.model('AdminUser', adminUserSchema);
