const axios = require('axios');
const AdminUser = require('../models/adminUser');

exports.postToThreads = async (req, res) => {
  const { image, caption } = req.body;
  const admin = await AdminUser.findOne({ username: "admin" });
  
  try {
    const response = await axios.post(`https://api.threads.net/v1/post`, {
      app_id: process.env.THREAD_APP_ID,
      image,
      caption
    }, {
      headers: {
        Authorization: `Bearer ${admin.access_token}`
      }
    });

    res.status(200).json({ message: 'Posted to Threads', data: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
