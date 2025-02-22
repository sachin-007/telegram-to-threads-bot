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
const crypto = require("crypto");
const OAuth = require("oauth-1.0a");
const qs = require('querystring');
const TWITTER_API_BASE_URL = "https://api.twitter.com";
const googleSpreadSheetTrack = require("../../utils/googleSpreadsheetTrack");

// following for the authentication of the user with the twitter with V2 
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
      loggedInUsers[chatId] = { ...loggedInUsers[chatId],email, loggedIn: true, accessToken,isXTweeterAuthed: true };
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


const oauth = OAuth({
  consumer: { key: process.env.X_CONSUMER_KEY, secret: process.env.x_CONSUMER_KEY_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

async function getOAuthHeaders(url, method = 'POST') {
  const request_data = { url, method };

  return oauth.toHeader(oauth.authorize(request_data, {
    key: process.env.X_AUTH_A_TOKEN,
    secret: process.env.X_AUTH_A_S_TOKEN,
  }));
}

exports.postTweetWithImageUrl = async (req, res, bot) => {
  try {
    const { imageUrl, caption, email } = req.body;
    if (!imageUrl || !caption || !email) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const user = await AdminUser.findOne({ email }, "chatId x_access_token");
  console.log(`stringify upper: ${JSON.stringify(user)}`)
    
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const tempImagePath = path.resolve(__dirname, "tempimg.jpg");

    // Download image from URL
    await axios({
      url: decodeURIComponent(imageUrl),
      method: "GET",
      responseType: "stream",
    }).then((response) => {
      const writer = fs.createWriteStream(tempImagePath);
      response.data.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    }).catch((error) => {
      console.error("❌ Failed to download image:", error.message);
      throw error;
    });

    // Upload media to Twitter
    const mediaId = await uploadMedia(tempImagePath);
    fs.unlinkSync(tempImagePath); // Remove temp file after upload

    if (!mediaId) {
      return res.status(500).json({ error: "Media upload failed." });
    }

    // Post Tweet with media
    const tweet = await createTweet(caption, mediaId,user);

    // Send Telegram message (if bot is available)
    const chatId = user.chatId;
    if (chatId) {
      bot.sendMessage(chatId, `✅ Tweet successfully posted! Tweet ID: ${tweet.id}`);
      // googleSpreadSheetTrack[chatId] = { TweetmediaId:mediaId,TweetResponse:tweet,Tweetstatus: "Success" };
      googleSpreadSheetTrack[chatId] = {
        ...googleSpreadSheetTrack[chatId], // Preserve existing data
        TweetmediaId: mediaId,
        TweetResponse: tweet,
        Tweetstatus: "Success"
    };
    }

    res.status(200).json({ success: true, tweetId: tweet.id });
  } catch (error) {
    console.error("❌ Failed to post tweet with image URL:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Function to upload media to Twitter
async function uploadMedia(imagePath) {
  try {
    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const headers = await getOAuthHeaders(url, 'POST');

    const form = new FormData();
    form.append('media', fs.createReadStream(imagePath));
    form.append('media_category', 'tweet_image');

    const response = await axios.post(url, form, {
      headers: {
        ...headers,
        ...form.getHeaders(),
      },
    });
    logActivity(`✅ Media Uploaded: ${response.data} `);
    return response.data.media_id_string;
  } catch (error) {
    logActivity(`❌ Media Upload Failed: ${error.response?.data} || ${error.message} `);
    console.error("❌ Media Upload Failed:", error.response?.data || error.message);
    return null;
  }
}

// Function to post a tweet using Twitter API v2
async function createTweet(caption, mediaId,user) {
  console.log(`stringify : ${JSON.stringify(user)}`)
  const x_token = await user.x_access_token;
  try {
    const url = 'https://api.twitter.com/2/tweets';
    const headers = {
      Authorization: `Bearer ${x_token}`,
      "Content-Type": "application/json",
    };

    const body = {
      text: caption,
      media: { media_ids: [mediaId] },
    };

    const response = await axios.post(url, body, { headers });
    console.log("✅ Tweet Posted: ", response.data);
    return response.data.data;
  } catch (error) {
    logActivity(`❌ Tweet Post Failed: ${error.response?.data} || ${error.message} `);
    console.error("❌ Tweet Post Failed:", error.response?.data || error.message);
    throw error;
  }
}

