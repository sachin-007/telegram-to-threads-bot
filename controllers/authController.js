const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const AdminUser = require('../models/adminUser');
const logActivity = require('../logActivity');


exports.register = async (req, res) => {
    const { username, name, email, password } = req.body;
  
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
      logActivity(`Barer token token for ${req.body.email} `+token);

      
      res.status(201).json({ token, message: 'Registration successful' });
    } catch (error) {
      await logActivity('Error registering user', { error: error.message });
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
      logActivity(`login access token token for ${req.body.email} `+token);
      res.status(200).json({ token, message: 'Login successful' });
    } catch (error) {
      await logActivity('Error logging in', { error: error.message });
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
  };
  

// exports.callback = async (req, res) => {
//   const { code } = req.query;
//   try {
//     const response = await axios.post('https://threads.net/oauth/authorize', {
//     // const response = await axios.post('https://api.threads.net/oauth/access_token', {
//       client_id: process.env.THREAD_APP_ID,
//       client_secret: process.env.CLIENT_SECRET,
//       redirect_uri: process.env.CALLBACK_URL,
//       code,
//       // grant_type: 'authorization_code'
//     });
//     const accessToken = response.data.access_token;

//     await AdminUser.updateOne({ username: "admin" }, { access_token: accessToken });
//     res.send('Access token saved successfully');
//   } catch (error) {
//     res.status(500).send('Failed to get access token');
//   }
// };



exports.callback = async (req, res) => {
  const { code } = req.query; // Capture the authorization code

  try {
    // Store the code in the database for the user
    await AdminUser.updateOne(
      { username: "admin" }, // Update for the specific user
      { code: code }
    );
    
    res.send('Authorization code saved successfully');
  } catch (error) {
    console.error(error);
    await logActivity('Failed to save authorization code', { error: error.message });
    res.status(500).send('Failed to save authorization code');
  }
};


exports.getAccessToken = async (req, res) => {
  try {
    // Find the user to get the stored code
    const adminUser = await AdminUser.findOne({ username: "admin" });

    // Exchange the code for an access token
    const response = await axios.post('https://api.threads.net/oauth/access_token', {
      client_id: process.env.THREAD_APP_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      code: adminUser.code, // Use the stored code
      grant_type: 'authorization_code'
    });
    
    const accessToken = response.data.access_token;

    // Update the access token in the database
    await AdminUser.updateOne(
      { username: "admin" },
      { access_token: accessToken }
    );

    res.send('Access token saved successfully');
  } catch (error) {
    console.error(error);
    await logActivity('Failed to get access token', { error: error.message });
    res.status(500).send('Failed to get access token');
  }
};


// Replace these values with your actual values
// authController.js
const CLIENT_ID = process.env.THREADS_APP_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;
const scope = 'threads_basic,threads_content_publish';

// Start the OAuth authorization process
exports.startOAuth = (req, res) => {
  const scope = 'threads_basic,threads_content_publish'; // Define the required scopes
  const authUrl = `https://threads.net/oauth/authorize?client_id=${process.env.THREADS_APP_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=code`;
  res.redirect(authUrl);
};

// Handle the callback and exchange the authorization code for an access token
exports.handleOAuthCallback = async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;

  if (error) {
      // Handle error (e.g., user denied authorization)
      return res.status(400).json({ error, error_reason, error_description });
  }

  // Proceed with exchanging the code for an access token
  try {
      const url = 'https://graph.threads.net/oauth/access_token';

      const params = new URLSearchParams();
      params.append('client_id', process.env.THREADS_APP_ID);
      params.append('client_secret', process.env.THREADS_APP_SECRET);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', process.env.REDIRECT_URI);

      const response = await axios.post(url, params);
      const { access_token, user_id } = response.data;

      // Send the access token and user ID in the response
      res.json({ access_token, user_id });
  } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      await logActivity('Error exchanging code for token:', { error: error.message }+"\nrespo error"+{error:error.response?.data});
      res.status(500).json({ error: 'Failed to exchange code for token' });
  }
};
