const mongoose = require('mongoose');

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


module.exports = mongoose.model('AdminUser', adminUserSchema);
