const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AdminUser = require("../models/adminUser");
const logActivity = require("../logActivity");
const adminUser = require("../models/adminUser");
require("dotenv").config();

// commented cause now i don't want to start bot on server
// const bot = require("./bot"); // Import the bot instance

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
  let email = req.body.email;
  if (!email) {
    email = req.session.email;
  }  
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
  // Return the authUrl in the response instead of redirecting
  res.json({ authUrl });

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
      "THREAD_APP_ID THREADS_APP_SECRET chatId"
    );

    if (!user || !user.THREAD_APP_ID || !user.THREADS_APP_SECRET) {
      return res.status(404).json({
        error:
          "User or required credentials (THREAD_APP_ID, THREADS_APP_SECRET,) not found",
      });
    }

    const { THREAD_APP_ID, THREADS_APP_SECRET , chatId} = user;

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


    // commented for bot offline 
    // Send the access token to the user via Telegram
    // if (chatId) {
    //   await bot.sendMessage(chatId, `Authorization successful!`);
    // } else {
    //   console.log(`Chat ID not found for user with email: ${email}`);
    // }
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


exports.saveChatId = async (req, res) => {
  const { email, chatId } = req.body;

  try {
    await AdminUser.findOneAndUpdate({ email }, { chatId });
    res.status(200).json({ message: "Chat ID saved successfully." });
  } catch (error) {
    console.error("Error saving chatId:", error);
    res.status(500).json({ message: "Error saving chatId." });
  }
};
