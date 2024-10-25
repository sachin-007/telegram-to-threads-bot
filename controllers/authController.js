const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const AdminUser = require('../models/adminUser');
const logActivity = require('../logsys');


exports.register = async (req, res) => {
    const { username, name, email, password } = req.body;

    logActivity(username, name, email, password);
  
    try {
      // Check if the user already exists
      let user = await AdminUser.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Create a new user with hashed password
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new AdminUser({ username, name, email, password: hashedPassword });
      await user.save();
  
      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
      console.log(token);
      
      res.status(201).json({ token, message: 'Registration successful' });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error: error.message });
    }
  };
  

  exports.login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const user = await AdminUser.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Compare the password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
      res.status(200).json({ token, message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
  };
  

exports.callback = async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://api.threads.net/oauth/access_token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.CALLBACK_URL,
      code,
      grant_type: 'authorization_code'
    });
    const accessToken = response.data.access_token;

    await AdminUser.updateOne({ username: "admin" }, { access_token: accessToken });
    res.send('Access token saved successfully');
  } catch (error) {
    res.status(500).send('Failed to get access token');
  }
};
