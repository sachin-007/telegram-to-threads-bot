const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AdminUser = require("../models/adminUser");
const logActivity = require("../logActivity");
const adminUser = require("../models/adminUser");
// commented cause now i don't want to start bot on server
// const bot = require("./bot"); // Import the bot instance
const loggedInUsers = require("./loggedInUsers"); // Import shared loggedInUsers
const { oauth2Client } = require("../routes/googleauthRoutes");
const { google } = require("googleapis");
require("dotenv").config();

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

    // const { access_token, user_id } = response.data;
    const responseData = response.data;
    const access_token = responseData.access_token;
    const user_id = responseData.user_id

    // storing the long live access token 
    const longlive_endpointUrl = "https://graph.threads.net/access_token";
    const responseLongLiveToken = await axios.get(longlive_endpointUrl, {
      params: {
        grant_type: "th_exchange_token",
        client_secret: THREADS_APP_SECRET,
        access_token, // Use the access token from the first response
      },
    });

    const responseLongLiveTokenData = responseLongLiveToken.data;
    const long_lived_user_access_token = responseLongLiveTokenData.access_token;

    
    logActivity(
      `Successfully exchanged code for token. User ID: ${user_id}, Access Token: ${access_token}, Long Lived User Access Token: ${long_lived_user_access_token}`
    );

    // Now call getThreadUserId with the access token to fetch the THREADS_USER_ID
    const threadsUserId = await getThreadUserId(access_token);

    await AdminUser.findOneAndUpdate(
      { email },
      { access_token, user_id, threadsUserId,long_lived_user_access_token }
    );

    logActivity(`Successfully fetched THREADS_USER_ID: ${threadsUserId}`);

    // commented for bot offline
    // Send the access token to the user via Telegram
    if (chatId) {
      loggedInUsers[chatId] = { email, loggedIn: true, accessToken: true,isThreadAuthed: true };

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
    const { imageUrl, caption, email } = req.body;
  
    // Log the received request body for debugging
    logActivity(`Received request: imageUrl=${imageUrl}, caption=${caption}, email=${email}`);
  
    // Validate the required parameters
    if (!imageUrl || !caption || !email) {
      return res.status(400).json({
        message: "Missing required parameters: imageUrl, caption, or email.",
      });
    }
  
    try {
      // Retrieve the user data from the database
      const user = await AdminUser.findOne(
        { email },
        "threadsUserId access_token tags long_lived_user_access_token google_access_token spreadsheet_id"
      );
      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }
  
      const { long_lived_user_access_token,access_token, threadsUserId: THREADS_USER_ID, tags = [],google_access_token, google_refresh_token,spreadsheet_id } = user;
  
      if (!access_token||!long_lived_user_access_token) {
        return res.status(400).json({
          message: "Access token is missing.",
        });
      }
  
      // Log the user data for debugging
      logActivity(`User data: ${JSON.stringify({ THREADS_USER_ID, tags })}`);
  
      // Construct the API request
      const url = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;
      const params = new URLSearchParams();

      let decodedImageUrl;
      let decodedCaption = caption;
      try {
          // Decode the image URL
          decodedImageUrl = decodeURIComponent(imageUrl);
      } catch (decodeError) {
          // Log the decoding error and return a response
          return res.status(400).json({
              message: "Invalid URL encoding in imageUrl.",
              error: decodeError.message,
          });
      }

  
      var captionWithTags =
        tags.length > 0 ? `${decodedCaption}\n\n${tags.join(" ")}` : decodedCaption;
        // Limit the caption to a maximum of 500 characters
        captionWithTags = captionWithTags.substring(0, 500);
      params.append("media_type", "IMAGE");
      params.append("image_url", decodedImageUrl);
      params.append("text", captionWithTags);
      params.append("access_token", long_lived_user_access_token);
  
      logActivity(`Request URL: ${url}`);
      logActivity(`Request Params: ${JSON.stringify(Object.fromEntries(params))}`);
  
      // Make the API call to create the thread post
      const response = await axios.post(url, params);
  
      // Check if the post creation was successful
      if (response.status === 200) {
        const { id: creation_id } = response.data;
  
        // Publish the thread post
        const publishUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`;
        const publishParams = new URLSearchParams();
        publishParams.append("creation_id", creation_id);
        publishParams.append("access_token", long_lived_user_access_token);
  
        logActivity(`Publish URL: ${publishUrl}`);
        logActivity(`Publish Params: ${JSON.stringify(Object.fromEntries(publishParams))}`);
  
        const publishResponse = await axios.post(publishUrl, publishParams);
  
        if (publishResponse.status === 200) {
          logActivity("Post created and published successfully.");
           
          if (google_access_token) {
            try {
              const SHEET_NAME = "Posts"; // Ensure this sheet exists
              const range = SHEET_NAME; // Use just the sheet name for appending
              // Set OAuth token
              oauth2Client.setCredentials({ access_token: google_access_token });
  
              const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  
              await sheets.spreadsheets.values.append({
                spreadsheetId: spreadsheet_id,
                range: range,
                valueInputOption: "RAW",
                insertDataOption: "INSERT_ROWS",
                requestBody: {
                  values: [
                    [new Date().toISOString(), email, decodedImageUrl, captionWithTags, "Success"]
                  ],
                },
              });
  
              logActivity("✅ Data added to Google Sheets successfully.");
            } catch (sheetError) {
              logActivity(`❌ Error appending to Google Sheets:${sheetError}`, sheetError);
            }
          } else {
            logActivity("⚠ Google access token not found. Skipping Google Sheets update.");
          }
          return res.status(200).json({
            message: "Post created and published successfully!",
            data: publishResponse.data,
          });
        } else {
          logActivity("Failed to publish post", publishResponse.data);
          return res.status(publishResponse.status).json({
            message: "Failed to publish post.",
            error: publishResponse.data,
          });
        }
      } else {
        logActivity("Failed to create post", response.data);
        return res.status(response.status).json({
          message: "Failed to create post.",
          error: response.data,
        });
      }
    } catch (error) {
      logActivity("Unexpected error:", error);
      return res.status(500).json({
        message: "An unexpected error occurred while creating the post.",
        error: error.message,
        stack: error.stack, // Provide stack trace for debugging
      });
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
