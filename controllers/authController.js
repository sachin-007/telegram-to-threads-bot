const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AdminUser = require("../models/adminUser");
const logActivity = require("../logActivity");
const adminUser = require("../models/adminUser");
require("dotenv").config();

// commented cause now i don't want to start bot on server
// const bot = require("./bot"); // Import the bot instance
const loggedInUsers = require("./loggedInUsers"); // Import shared loggedInUsers

exports.register = async (req, res, bot) => {
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

exports.login = async (req, res, bot) => {
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
exports.startOAuth = async (req, res, bot) => {
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
exports.handleCallback = async (req, res, bot) => {
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

    const { THREAD_APP_ID, THREADS_APP_SECRET, chatId } = user;

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

    // Now call getThreadUserId with the access token to fetch the THREADS_USER_ID
    const threadsUserId = await getThreadUserId(access_token);

    await AdminUser.findOneAndUpdate(
      { email },
      { access_token, user_id, threadsUserId }
    );

    logActivity(`Successfully fetched THREADS_USER_ID: ${threadsUserId}`);

    // commented for bot offline
    // Send the access token to the user via Telegram
    if (chatId) {
      loggedInUsers[chatId] = { email, loggedIn: true, accessToken: true };

      await bot.sendMessage(chatId, `Authorization successful!`);
    } else {
      console.log(`Chat ID not found for user with email: ${email}`);
    }
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

exports.saveChatId = async (req, res, bot) => {
  const { email, chatId } = req.body;

  try {
    await AdminUser.findOneAndUpdate({ email }, { chatId });
    res.status(200).json({ message: "Chat ID saved successfully." });
  } catch (error) {
    console.error("Error saving chatId:", error);
    res.status(500).json({ message: "Error saving chatId." });
  }
};

// exports.getThreadUserId = async (accessToken) => {
//   try {
//     // Make an API call to the Threads API endpoint that returns user info
//     const response = await axios.get("https://graph.threads.net/v1.0/me", {
//       params: {
//         access_token: accessToken,
//       },
//     });

//     // Extract the user ID from the response
//     const userId = response.data.id;

//     if (!userId) {
//       throw new Error("User ID not found in the response");
//     }

//     return userId;
//   } catch (error) {
//     console.error("Error fetching user ID from Threads API:", error.message);
//     throw new Error("Failed to retrieve THREADS_USER_ID");
//   }
// };

const getThreadUserId = async (accessToken) => {
  try {
    // Make an API call to the Threads API endpoint that returns user info
    const response = await axios.get("https://graph.threads.net/v1.0/me", {
      params: {
        access_token: accessToken,
      },
    });

    // Extract the user ID from the response
    const userId = response.data.id;

    if (!userId) {
      throw new Error("User ID not found in the response");
    }

    return userId;
  } catch (error) {
    console.error("Error fetching user ID from Threads API:", error.message);
    throw new Error("Failed to retrieve THREADS_USER_ID");
  }
};

exports.createThreadPost = async (req, res, bot) => {
  const { imageUrl, caption, email } = req.body; // Assuming these are sent in the request body
  // logActivity("Received request body:", req.body); // Add this line
  // Define the common tags

  // Log received parameters
  // logActivity("Received parameters:", { imageUrl, caption, email });

  // Check if required parameters are provided
  if (!imageUrl || !caption || !email) {
    return res.status(400).json({
      message:
        "Missing required parameters: imageUrl, caption, or access_token.",
    });
  } else {
    const user = await AdminUser.findOne(
      { email },
      "threadsUserId access_token tags"
    );

    if (!user || !user.access_token) {
      return res.status(400).json({
        message: "User not found or access token missing.",
      });
    }
    const access_token = user.access_token;
    // Get the user's tags from the database, if any
    const tags = user.tags || []; // Default to empty array if no tags are found
    const THREADS_USER_ID = user.threadsUserId;
    logActivity(
      `User's access token: ${access_token}+"\nand thread user id :${THREADS_USER_ID}`
    );

    try {
      // Construct the API request URL
      const url = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;

      // Prepare the payload
      const params = new URLSearchParams();
      // Decode the URL-encoded image URL and caption
      const decodedImageUrl = decodeURIComponent(imageUrl);
      const decodedCaption = decodeURIComponent(caption);
      // Append the tags to the caption, if tags exist
      const captionWithTags =
        tags.length > 0
          ? `${decodedCaption}\n\n${tags.join(" ")}`
          : decodedCaption; // Only append tags if they exist

      params.append("media_type", "IMAGE");
      params.append("image_url", decodedImageUrl);
      params.append("text", captionWithTags);
      params.append("access_token", access_token);

      // Send the POST request to create the thread post
      const response = await axios.post(url, params);

      // Check for successful response
      if (response.status === 200) {
        const creation_id = response.data.id; // Get the creation ID

        // Now call the threads_publish endpoint with the creation_id
        const publishUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish?creation_id=${creation_id}&access_token=${access_token}`;

        // Send the POST request to publish the thread
        const publishResponse = await axios.post(publishUrl);

        // Check if publishing was successful
        if (publishResponse.status === 200) {
          return res.status(200).json({
            message: "Post created and published successfully!",
            data: publishResponse.data,
          });
        } else {
          return res.status(publishResponse.status).json({
            message: "Failed to publish post",
            error: publishResponse.data,
          });
        }
      } else {
        logActivity("error here respdata", response.data);
        return res.status(response.status).json({
          message: "Failed to create post",
          error: response.data,
        });
      }
    } catch (error) {
      logActivity("Error creating thread post:", error);
      return res.status(500).json({
        message: "An error occurred while creating the post.",
        error: error.message,
      });
    }
  }
};

// Update tags for a user based on email
exports.updateTags = async (req, res) => {
  try {
    const { email, tags } = req.body; // Extract email and tags from the request body

    // Validate input
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: "Tags must be an array" });
    }

    // Find the user by email and update the tags
    const updatedUser = await AdminUser.findOneAndUpdate(
      { email }, // Find user by email
      { tags }, // Replace old tags with new ones
      { new: true } // Return the updated document
    );

    // If user not found, send an error response
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return success response with updated user data
    res.status(200).json({
      message: "Tags updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    // Catch any errors and send a failure response
    res.status(500).json({
      message: "An error occurred while updating tags",
      error: error.message,
    });
  }
};
