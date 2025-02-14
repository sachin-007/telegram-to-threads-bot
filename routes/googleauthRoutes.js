const express = require("express");
const { google } = require("googleapis");
const AdminUser = require("../models/adminUser"); // Ensure you have this model
const logActivity = require("../logActivity");
require("dotenv").config();

const router = express.Router();

const CMP_GOOGLE_REDIRECT_URI  = `${process.env.SERVER_HOST}${process.env.GOOGLE_REDIRECT_URI}`


// ✅ Initialize Google OAuth Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET, // Fixed name
  CMP_GOOGLE_REDIRECT_URI
);

// ✅ Debugging: Check if environment variables are loaded
// console.log(`
//   process.env.GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID},
//   process.env.GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET},
//   process.env.GOOGLE_REDIRECT_URI: ${CMP_GOOGLE_REDIRECT_URI}
// `);

// ✅ Google OAuth Authentication Route
router.get("/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.email"], // Corrected scope
    prompt: "consent",
  });

  logActivity("Redirecting user to Google OAuth:", authUrl);
  res.redirect(authUrl);
});

// ✅ Google OAuth Callback Route
router.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is missing" });
  }

  try {
    // ✅ Exchange authorization code for access & refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token) {
      return res.status(400).json({ message: "Failed to retrieve access token." });
    }

    // console.log("✅ Google OAuth Tokens:", tokens);

    // ✅ Fetch User Info from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      return res.status(400).json({ message: "Failed to retrieve user email" });
    }

    const email = data.email;
    // console.log(`✅ Google User Info: ${email}`);
    const user = await AdminUser.findOne({ secondary_email: email });
    // console.log("User Found:", user);


    // ✅ Store tokens in the database for this email

    // ✅ Update only if `secondary_email` matches the authenticated email
    await AdminUser.updateOne(
      { secondary_email: email }, // Find user by secondary_email
      {
        $set: {
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token || undefined,
          spreadsheet_id: process.env.SPREADSHEET_ID || undefined,
        },
      },
      // { upsert: true } // ✅ Ensures the fields are created if missing
    );
    


    logActivity(`✅ Google OAuth successful for ${email}`);
    

    res.status(200).json({
      message: "Google Authentication Successful",
      email,
      tokens,
    });
  } catch (error) {
    console.error("❌ Google OAuth Error:", error);

    res.status(500).json({
      message: "OAuth authentication failed",
      error: error.response ? error.response.data : error.message,
    });
  }
});

module.exports = router;
