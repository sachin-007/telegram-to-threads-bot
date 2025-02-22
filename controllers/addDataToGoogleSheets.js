const googleSpreadSheetTrack = require("../utils/googleSpreadsheetTrack");
const AdmUser = require("../models/adminUser");
const { google } = require("googleapis"); // Ensure google API is imported
const logActivity = require("../logActivity");
const { oauth2Client } = require("../routes/googleauthRoutes");


exports.addDataToGoogleSheets = async (req, res, bot) => {
  try {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Missing required parameter: email." });
    }

    // Fetch user details
    const user = await AdmUser.findOne(
        { email },
        "chatId google_refresh_token google_access_token spreadsheet_id"
    );

    if (!user) {
        logActivity("⚠ User not found. Skipping Google Sheets update.");
        return res.status(404).json({ error: "User not found." });
    }

    if (!user.google_access_token || !user.spreadsheet_id) {
        logActivity("⚠ Missing Google credentials. Skipping Google Sheets update.");
        return res.status(400).json({ error: "Google credentials missing." });
    }

    const chatId = user.chatId;
    const fullData = googleSpreadSheetTrack[chatId];

    if (!fullData) {
        return res.status(404).json({ error: "No data found for this chatId." });
    }

    // ✅ Format data for Google Sheets
    const values = [
        [
            new Date().toISOString(), // Timestamp
            fullData.email || "", // User Email
            fullData.ImageBaseFormat || "", // Image in Base64
            fullData.ThreadimageUrl || "", // Thread Image URL
            fullData.ThreadCaption || "", // Thread Caption
            JSON.stringify(fullData.ThreadResponse || {}), // Thread API Response
            fullData.Threadstatus || "", // Thread Status
            fullData.TweetmediaId || "", // Tweet Media ID
            JSON.stringify(fullData.TweetResponse || {}), // Tweet API Response
            fullData.Tweetstatus || "" // Tweet Status
        ]
    ];

    if (chatId) {
        bot.sendMessage(chatId, `✅ Data successfully posted to Google Sheets!`);
    }

    // Google Sheets API Setup
    oauth2Client.setCredentials({ access_token: user.google_access_token });
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // ✅ Append Data to Google Sheets
    await sheets.spreadsheets.values.append({
        spreadsheetId: user.spreadsheet_id,
        range: "Posts",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
    });

    logActivity("✅ Data added to Google Sheets successfully.");
    res.status(200).json({ message: "Data added successfully." });

} catch (error) {
        if (error.response && error.response.status === 401 && error.response.data.error === "invalid_grant") {
            logActivity("🔄 Access token expired. Refreshing token...");

            try {
                const newAccessToken = await refreshGoogleAccessToken(user);
                oauth2Client.setCredentials({ access_token: newAccessToken });

                // Retry Google Sheets API call
                const sheets = google.sheets({ version: "v4", auth: oauth2Client });

                await sheets.spreadsheets.values.append({
                    spreadsheetId: user.spreadsheet_id,
                    range: "Posts",
                    valueInputOption: "RAW",
                    insertDataOption: "INSERT_ROWS",
                    requestBody: { values },
                });

                logActivity("✅ Data added to Google Sheets successfully after token refresh.");
                res.status(200).json({ message: "Data added successfully after token refresh." });
            } catch (refreshError) {
                logActivity("❌ Failed to refresh token:", refreshError.message);
                res.status(500).json({ error: "Failed to refresh token." });
            }
        } else {
            logActivity("❌ Failed to add data to Google Sheets:", error.message);
            res.status(500).json({ error: "Failed to add data to Google Sheets." });
        }
    }
};


// refresh access token from refresh token
async function refreshGoogleAccessToken(user) {
  try {
    if (!user.google_refresh_token) {
      throw new Error("Google refresh token is missing.");
    }

    // ✅ Set refresh token and request new access token
    oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();

    const newAccessToken = credentials.access_token;

    // ✅ Update user with new access token
    await AdminUser.updateOne(
      { email: user.email },
      { $set: { google_access_token: newAccessToken } }
    );

    logActivity(`🔄 Google Access Token refreshed successfully.`);
    return newAccessToken;
  } catch (error) {
    logActivity(`❌ Failed to refresh Google access token: ${error.message}`);
    throw error;
  }
}