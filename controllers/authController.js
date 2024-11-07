const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AdminUser = require("../models/adminUser");
const logActivity = require("../logActivity");
const adminUser = require("../models/adminUser");
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

    res.status(201).json({ message: "Registration successful" });
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
    req.session.email = email;

    logActivity("Login successful");
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    await logActivity("Error logging in", { error: error.message });
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

const scope =
  "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies";
const REDIRECT_URI = process.env.REDIRECT_URI;

// Start the OAuth authorization process
exports.startOAuth = async (req, res) => {
  const email = req.session.email;
  var { THREAD_APP_ID, THREADS_APP_SECRET } = req.body;

  if (!THREAD_APP_ID || !THREADS_APP_SECRET) {
    return res.status(400).json({ error: "Required parameters are missing" });
  }

  const updatedUser = await AdminUser.findOneAndUpdate(
    { email },
    { THREAD_APP_ID, THREADS_APP_SECRET }
  );

  const user = await AdminUser.findOne(
    { email },
    "THREAD_APP_ID THREADS_APP_SECRET"
  );

  const authUrl = `https://www.threads.net/oauth/authorize/?redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&client_id=${THREAD_APP_ID}&response_type=code&scope=${encodeURIComponent(
    scope
  )}&state=${encodeURIComponent(email)}`;
  logActivity(`authUrl of ${email}= ` + authUrl);
  res.redirect(authUrl);
};

// Step 2: Handle Redirect and Exchange Code for Token
exports.handleCallback = async (req, res) => {
  const { code, error, error_description, state } = req.query;
  const email = decodeURIComponent(state);

  if (error) {
    logActivity(
      `OAuth error: ${error_description || "No description available."}`
    );
    return res.status(400).json({
      message: `OAuth error: ${
        error_description || "No description available."
      }`,
    });
  }

  if (!code) {
    logActivity("Authorization code not provided.");
    return res.status(400).json({ message: "No authorization code provided." });
  }

  try {
    const user = await AdminUser.findOne(
      { email },
      "THREAD_APP_ID THREADS_APP_SECRET"
    );

    if (!user || !user.THREAD_APP_ID || !user.THREADS_APP_SECRET) {
      return res.status(404).json({
        error:
          "User or required credentials (THREAD_APP_ID, THREADS_APP_SECRET) not found",
      });
    }

    const { THREAD_APP_ID, THREADS_APP_SECRET } = user;

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

    const { access_token, user_id } = response.data;
    logActivity(
      `Successfully exchanged code for token. User ID: ${user_id}, Access Token: ${access_token}`
    );

    await AdminUser.findOneAndUpdate({ email }, { access_token, user_id });

    res.json({ access_token, user_id });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      logActivity(
        `API error: Status ${status}, Response: ${JSON.stringify(data)}`
      );
      res
        .status(status)
        .json({ message: "Error exchanging code for token.", details: data });
    } else if (error.request) {
      logActivity(
        "No response received from Threads API. Possible network error."
      );
      res
        .status(500)
        .json({ message: "No response received from Threads API." });
    } else {
      logActivity(`Unknown error: ${error.message}`);
      res.status(500).json({
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
