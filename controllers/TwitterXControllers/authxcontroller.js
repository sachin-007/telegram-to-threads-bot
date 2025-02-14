const logActivity = require("../../logActivity");
const axios = require("axios");
const AdminUser = require("../../models/adminUser");
require("dotenv").config();
const loggedInUsers = require("../../controllers/loggedInUsers");
const { json } = require("body-parser");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const mime = require("mime-types"); 
const TWITTER_API_BASE_URL = "https://api.twitter.com";

exports.handleCallback = async (req, res,bot) => {
  const { code, state } = req.query;

  if (!code || !state) {
    logActivity("Missing code or state in callback request");
    return res.status(400).json({ error: "Invalid request. Code or state is missing." });
  }

  const email = decodeURIComponent(state);

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(`${TWITTER_API_BASE_URL}/2/oauth2/token`, null, {
      params: {
        code,
        grant_type: "authorization_code",
        client_id: process.env.X_CLIENT_ID,
        redirect_uri: `${process.env.SERVER_HOST}${process.env.X_REDIRECT_URI}`,
        code_verifier: "challenge",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      logActivity("Access token not received from Twitter");
      return res.status(500).json({ error: "Failed to retrieve access token." });
    }

    logActivity(`Twitter access token received: ${accessToken}`);

    await AdminUser.findOneAndUpdate({ email }, { x_access_token: accessToken });

    // Find user by email in the database
    const user = await AdminUser.findOne({ email }, "chatId");
    if (!user) {
      logActivity(`User with email ${email} not found.`);
      return res.status(404).json({ error: "User not found." });
    }

    const chatId = user.chatId;

    // Update user session or notify user via chat bot
    if (chatId) {
      loggedInUsers[chatId] = { email, loggedIn: true, accessToken,isXTweeterAuthed: true };
      await bot.sendMessage(chatId, `TwitterX Authorization successful! Token: ${accessToken}`);
      logActivity(`User ${email} successfully logged in with chatId ${chatId}`);
    } else {
      logActivity(`ChatId not found for email: ${email}`);
    }
    const resp2 = await axios.get("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log("data i want is "+JSON.stringify(resp2.data));


    res.send("Authentication successful! You can now post tweets.");
  } catch (error) {
    logActivity(`Error during Twitter OAuth callback: ${error.message}`);
    if (error.response) {
      logActivity(`Error response from Twitter: ${JSON.stringify(error.response.data)}`);
      return res.status(500).json({
        error: "Failed to retrieve access token",
        details: error.response.data,
      });
    } else {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }
};




// Function to download an image from a URL
exports.downloadImage = async (imageUrl, savePath) => {
  console.log("Downloading image from:", imageUrl + " to " + savePath);
  
  try {
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(savePath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`Image downloaded to: ${savePath}`);
  } catch (error) {
    console.error("Error downloading image:", error.message);
    throw new Error("Failed to download image.");
  }
};

// Function to upload an image to Twitter
// Function to upload an image to Twitter
// exports.uploadImage = async (accessToken, imagePath) => {
//   try {
//     const image = fs.readFileSync(imagePath, { encoding: "base64" });

//     const response = await axios.post(
//       `${TWITTER_MEDIA}/1.1/media/upload.json`,
//       { media_data: image },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return response.data.media_id_string;
//   } catch (error) {
//     console.error("Error uploading image:");
//     logActivity("Error uploading image:");
//     if (error.response) {
//       // Log Twitter API response for debugging
//       logActivity("Status:", error.response.status);
//       logActivity("Headers:", error.response.headers);
//       logActivity("Data:", error.response.data);
//       console.error("Status:", error.response.status);
//       console.error("Headers:", error.response.headers);
//       console.error("Data:", error.response.data);
//     } else {
//       logActivity("Error message:", error.message);
//       console.error("Error message:", error.message);
//     }
//     throw new Error("Image upload failed.");
//   }
// };

exports.uploadImage = async (accessToken, mediaPath) => {


  try {
    // Read file and get its size and type
    const mediaData = fs.readFileSync(mediaPath, { encoding: "base64" });
    const mediaStats = fs.statSync(mediaPath);
    const totalBytes = mediaStats.size;
    console.log(`Media file size: ${totalBytes} bytes and path: ${mediaPath} `);

    // Automatically determine the MIME type
    const mediaType = mime.lookup(mediaPath); // E.g., "image/jpeg" or "video/mp4"
    if (!mediaType) {
      throw new Error("Could not determine media type. Please check the file extension.");
    }

    // Log the detected MIME type
    console.log(`Detected media type: ${mediaType}`);

    // Step 1: INIT
    const initResponse = await axios.post(
      "https://api.x.com/2/media/upload",
      {
        command: "INIT",
        total_bytes: totalBytes,
        media_type: mediaType,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
console.log("Media data1: ",initResponse);
    const mediaId = initResponse.data.media_id;

    // Step 2: APPEND (Single Upload)
    await axios.post(
      "https://api.x.com/2/media/upload",
      {
        command: "APPEND",
        media_id: mediaId,
        segment_index: 0,
        media_data: mediaData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 3: FINALIZE
    const finalizeResponse = await axios.post(
      "https://api.x.com/2/media/upload",
      {
        command: "FINALIZE",
        media_id: mediaId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return finalizeResponse.data.media_id;
  } catch (error) {
    console.error("Error uploading media:", error.response?.data || error.message);
    throw new Error("Media upload failed.");
  }
};



// Function to create a tweet with an image and caption
exports.createTweet = async (accessToken, caption, mediaId) => {
  try {
    const response = await axios.post(
      `${TWITTER_API_BASE_URL}/1.1/statuses/update.json`,
      {
        status: caption,
        media_ids: mediaId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating tweet:", error.response?.data || error.message);
    throw new Error("Tweet creation failed.");
  }
};

// Function to combine all steps: download image, upload it, and create a tweet
exports.postTweetWithImageUrl = async (req, res,bot) => {
  console.log("Post Tweet with Image URL");
  // console.log('Full request:', req);

    
  
  try {
    const {imageUrl, caption, email} = req.body;
    const decodedImageUrl = decodeURIComponent(imageUrl);
    
    if (!imageUrl || !caption || !email) {
      return res.status(400).json({ error: "Missing required parameters." });
    }
    const user = await AdminUser.findOne({ email }, "x_access_token chatId");
    
    const accessToken = user.x_access_token;

    console.log("Access token : ", accessToken + " for email : " + email+"image url is : "+imageUrl+"caption is : "+caption);
    
    
        if (!accessToken) {
          return res.status(401).json({ error: "Unauthorized. Access token is missing." });
        }
    
    

    // Step 1: Download the image from the URL
    const tempImagePath = path.resolve(__dirname, "tempimgpath.jpg");
    logActivity(`Downloading image from URL: ${decodedImageUrl} to ${tempImagePath}`);
    await this.downloadImage(decodedImageUrl, tempImagePath);

    // Step 2: Upload the image to Twitter
    const mediaId = await this.uploadImage(accessToken, tempImagePath);
    console.log("Media uploaded successfully. Media ID:", mediaId);

    // Step 3: Create the tweet with the image and caption
    const tweet = await this.createTweet(accessToken, caption, mediaId);
    console.log("Tweet posted successfully:", tweet);

    // Clean up: Delete the temporary image file
    fs.unlinkSync(tempImagePath);

    return tweet;
  } catch (error) {
    console.error("Failed to post tweet with image URL:", error.message);
    throw error;
  }
};