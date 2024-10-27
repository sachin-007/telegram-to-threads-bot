// models/logActivity.js

const mongoose = require('mongoose');
const logActivity = require('../logActivity');

const logActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    // required: true,
  },
  logMessage: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('LogActivity', logActivitySchema);
