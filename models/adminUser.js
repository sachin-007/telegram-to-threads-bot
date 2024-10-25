const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  access_token: String,
  code: { type: String }
});

module.exports = mongoose.model('AdminUser', adminUserSchema);
