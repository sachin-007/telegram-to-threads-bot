const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true },
    channelId: { type: String, required: true }, // Channel ID from Telegram
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" }, // Reference to AdminUser
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);
