const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AdminUser = require("../models/adminUser");
const logActivity = require("../logActivity");
require("dotenv").config();

exports.register = async (req, res) => {
  const { username, name, email, password } = req.body;

  try {
    // Check if the user already exists
    let user = await AdminUser.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create a new user with hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new AdminUser({ username, name, email, password: hashedPassword });
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    logActivity(`Barer token token for ${req.body.email} ` + token);

    res.status(201).json({ token, message: "Registration successful" });
  } catch (error) {
    await logActivity("Error registering user", { error: error.message });
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    logActivity(`login access token token for ${req.body.email} ` + token);
    res.status(200).json({ token, message: "Login successful" });
  } catch (error) {
    await logActivity("Error logging in", { error: error.message });
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

const scope =
  "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies";
const THREAD_APP_ID = process.env.THREAD_APP_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;
const forceReauth = true;

// // Step 1: Redirect to Authorization URL
// exports.getAuthorizationUrl = (req, res) => {
//   const authUrl = `https://threads.net/oauth/authorize?client_id=${THREAD_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=code`;
//   logActivity(`Generated Authorization URL: ${authUrl}`); // Log the authorization URL
//   res.redirect(authUrl);
// };

// Start the OAuth authorization process
exports.startOAuth = (req, res) => {
  const authUrl = `https://www.threads.net/oauth/authorize/?redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&client_id=${THREAD_APP_ID}&response_type=code&force_reauth=${forceReauth}&scope=${encodeURIComponent(
    scope
  )}`;
  logActivity("authUrl is = "+authUrl);
  res.redirect(authUrl);
};

// Step 2: Handle Redirect and Exchange Code for Token
exports.handleCallback = async (req, res) => {
  const { code, error, error_description } = req.query;

  // Check if an error was provided in the query parameters
  if (error) {
    logActivity(
      `OAuth error: ${error_description || "No description available."}`
    ); // Log the OAuth error details
    return res
      .status(400)
      .json({
        message: `OAuth error: ${
          error_description || "No description available."
        }`,
      });
  }

  // Check if the authorization code is provided
  if (!code) {
    logActivity("Authorization code not provided."); // Log the missing code error
    return res.status(400).json({ message: "No authorization code provided." });
  }

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      "https://graph.threads.net/oauth/access_token",
      null,
      {
        params: {
          client_id: THREAD_APP_ID,
          client_secret: THREADS_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        },
      }
    );

    // Extract the access token and user ID
    const { access_token, user_id } = response.data;
    logActivity(
      `Successfully exchanged code for token. User ID: ${user_id}, Access Token: ${access_token}`
    ); // Log success

    // Respond with the access token and user ID
    res.json({ access_token, user_id });
  } catch (error) {
    if (error.response) {
      // If the error response comes from the API
      const { status, data } = error.response;
      logActivity(
        `API error: Status ${status}, Response: ${JSON.stringify(data)}`
      ); // Log API response error details
      res
        .status(status)
        .json({ message: "Error exchanging code for token.", details: data });
    } else if (error.request) {
      // If the request was made but no response was received
      logActivity(
        "No response received from Threads API. Possible network error."
      ); // Log network error
      res
        .status(500)
        .json({ message: "No response received from Threads API." });
    } else {
      // If another error occurred
      logActivity(`Unknown error: ${error.message}`); // Log unexpected error
      res
        .status(500)
        .json({
          message: "An unknown error occurred.",
          details: error.message,
        });
    }
  }
};
// // Start the OAuth authorization process
// exports.startOAuth = (req, res) => {
//   const authUrl = `https://threads.net/oauth/authorize?client_id=${THREAD_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=code`;
//   logActivity("Redirecting to auth URL", authUrl);
//   res.redirect(authUrl);
// };

// // Handle the callback and exchange the authorization code for an access token
// exports.handleOAuthCallback = async (req, res) => {
//   const { code, error, error_reason, error_description } = req.query;
//   logActivity("OAuth Callback", { code, error, error_reason, error_description });

//   if (error) {
//       // Handle error (e.g., user denied authorization)
//       await logActivity('Error in OAuth callback', { error, error_reason, error_description });
//       return res.status(400).json({ error, error_reason, error_description });
//   }

//   // Proceed with exchanging the code for an access token
//   try {
//       const url = 'https://graph.threads.net/oauth/access_token';
//       const params = new URLSearchParams({
//           client_id: THREAD_APP_ID,
//           client_secret: process.env.THREADS_APP_SECRET,
//           code: code,
//           grant_type: 'authorization_code',
//           redirect_uri: REDIRECT_URI
//       });

//       const response = await axios.post(url, params);
//       const { access_token, user_id } = response.data;
//       logActivity('Received access token', { access_token });

//       // Send the access token and user ID in the response
//       res.json({ access_token, user_id });
//   } catch (error) {
//       console.error('Error exchanging code for token:', error.response?.data || error.message);
//       await logActivity('Error exchanging code for token', { error: error.message, responseError: error.response?.data });
//       res.status(500).json({ error: 'Failed to exchange code for token' });
//   }
// };
