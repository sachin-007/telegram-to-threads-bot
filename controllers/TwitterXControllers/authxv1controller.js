const axios = require('axios');
const qs = require('querystring');
const AdminUser = require('../../models/adminUser');
const logActivity = require('../../logActivity');
const oauthTokenStore  = require('../../utils/oauthTokenStoreEmailTweeterX'); // Import store
const loggedInUsers = require('../../controllers/loggedInUsers')
const crypto = require("crypto");

exports.handleCallback = async (req, res, bot) => {
  // console.log(`logging whole query : ${JSON.stringify(req.query)}`);
  
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    logActivity("Missing oauth_token or oauth_verifier in callback request");
    return res.status(400).json({ error: "Invalid request. oauth_token or oauth_verifier is missing." });
  }

  try {
        // Retrieve the email associated with this oauth_token
        console.log(`oauthTokenStore getting from state is ${JSON.stringify(oauthTokenStore)}`);
        const email = oauthTokenStore[oauth_token];
        console.log(`email getting from state is ${email}`);

    // Exchange request token for access token
    const tokenExchangeUrl = 'https://api.twitter.com/oauth/access_token';

    const response = await axios.post(tokenExchangeUrl, qs.stringify({
      oauth_token,
      oauth_verifier,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Parse Twitter's response (x-www-form-urlencoded)
    const { oauth_token, oauth_token_secret , user_id, screen_name } = qs.parse(response.data);

    if (!oauth_token || !oauth_token_secret) {
      logActivity("Access token or secret not received from Twitter");
      return res.status(500).json({ error: "Failed to retrieve access token." });
    }

    // Store in database (MongoDB)
    await AdminUser.updateOne(
        { email },
        { 
            x_v1_user_access_token: oauth_token, 
            x_v1_user_access_secret: oauth_token_secret, 
            x_twitter_user_id: user_id, 
            x_twitter_username: screen_name 
        },
        { upsert: true } // Create if doesn't exist
    );

    logActivity(`Twitter access token received for user_id: ${user_id}`);
    const user = await AdminUser.findOne({ email }, "chatId");
    
    if (!user) {
      logActivity(`User with email ${email} not found.`);
      return res.status(404).json({ error: "User not found." });
    }else{
      console.log(`logging user :: ${user}`);
      
    }

    const chatId = user.chatId;

    // Update user record with access tokens
    // await AdminUser.findOneAndUpdate({ secondary_email }, { 
      // });
      
      await AdminUser.updateOne(
        { email }, // Find user by secondary_email
        {
          $set: {
          x_v1_access_token: accessToken, 
          x_v1_access_token_secret: accessTokenSecret 
        },
      },
      { upsert: true } // ✅ Ensures the fields are created if missing
    );

    // Notify user via bot
    if (chatId) {
      loggedInUsers[chatId] = { ...loggedInUsers[chatId] ,email, loggedIn: true, isXTweeterAuthed: true };
      await bot.sendMessage(chatId, `TwitterX Authorization successful! Welcome @${screen_name}`);
      logActivity(`User ${email} successfully logged in with chatId ${chatId}`);
    } else {
      logActivity(`ChatId not found for email: ${email}`);
    }

    // // Fetch user info from Twitter (optional)
    // const userInfoUrl = "https://api.twitter.com/1.1/account/verify_credentials.json";
    // const userInfoResponse = await axios.get(userInfoUrl, {
    //   headers: {
    //     Authorization: `OAuth oauth_consumer_key="${process.env.X_CONSUMER_KEY}", oauth_token="${accessToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${crypto.randomBytes(16).toString('hex')}", oauth_version="1.0"`,
    //   },
    // });

    // logActivity(`User Info: ${JSON.stringify(userInfoResponse.data)}`);

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


// exports.handleCallback = async (req, res, bot) => {
//   const { oauth_token, oauth_verifier } = req.query;

//   if (!oauth_token || !oauth_verifier) {
//     logActivity("Missing oauth_token or oauth_verifier in callback request");
//     return res.status(400).json({ error: "Invalid request. oauth_token or oauth_verifier is missing." });
//   }

//   router.get('/twitterx/auth', async (req, res) => {
//     const callbackUrl = `${process.env.SERVER_HOST}${process.env.X_REDIRECT_URI}`;
//     const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  
//     try {
//       const response = await axios.post(requestTokenUrl, null, {
//         headers: {
//           Authorization: `OAuth oauth_callback="${encodeURIComponent(callbackUrl)}", oauth_consumer_key="${process.env.X_CONSUMER_KEY}", oauth_nonce="${Math.random().toString(36).substring(2, 15)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_version="1.0"`,
//         },
//       });
  
//       const { oauth_token } = qs.parse(response.data);
//       const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`;
  
//       res.redirect(authUrl);
//     } catch (error) {
//       logActivity(`Failed to get request token: ${error.message}`);
//       res.status(500).json({ error: 'Failed to get request token', details: error.message });
//     }
//   });
//   try {
//     // Exchange request token for access token
//     const response = await axios.post('https://api.twitter.com/oauth/access_token', null, {
//       params: {
//         oauth_token,
//         oauth_verifier,
//       },
//       headers: {
//         Authorization: `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//     });

//     const stringresp = JSON.stringify(response.data);
//     console.log(`stringified response is : ${stringresp}`);
    

//     // Parse the response
//     const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret, user_id, screen_name } = qs.parse(response.data);

//     if (!accessToken || !accessTokenSecret) {
//       logActivity("Access token or secret not received from Twitter");
//       return res.status(500).json({ error: "Failed to retrieve access token." });
//     }

//     logActivity(`Twitter access token received: ${accessToken}`);

//     // Find user by Twitter user_id
//     const email = decodeURIComponent(req.query.state);
//     const user = await AdminUser.findOne({ email }, "chatId");
//     if (!user) {
//       logActivity(`User with email ${email} not found.`);
//       return res.status(404).json({ error: "User not found." });
//     }

//     const chatId = user.chatId;

//     // Update user with tokens
//     await AdminUser.findOneAndUpdate({ email }, { x_access_token: accessToken, x_access_token_secret: accessTokenSecret });

//     // Notify user via bot
//     if (chatId) {
//       loggedInUsers[chatId] = { email, loggedIn: true, accessToken, accessTokenSecret, isXTweeterAuthed: true };
//       await bot.sendMessage(chatId, `TwitterX Authorization successful! Welcome @${screen_name}`);
//       logActivity(`User ${email} successfully logged in with chatId ${chatId}`);
//     } else {
//       logActivity(`ChatId not found for email: ${email}`);
//     }

//     // Fetch user info (optional)
//     const userInfo = await axios.get("https://api.twitter.com/1.1/account/verify_credentials.json", {
//       headers: {
//         Authorization: `OAuth oauth_consumer_key="${process.env.X_CONSUMER_KEY}", oauth_token="${accessToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${Math.random().toString(36).substring(2, 15)}", oauth_version="1.0"`,
//       },
//     });
//     logActivity(`User Info: ${JSON.stringify(userInfo.data)}`);

//     res.send("Authentication successful! You can now post tweets.");
//   } catch (error) {
//     logActivity(`Error during Twitter OAuth callback: ${error.message}`);
//     if (error.response) {
//       logActivity(`Error response from Twitter: ${JSON.stringify(error.response.data)}`);
//       return res.status(500).json({
//         error: "Failed to retrieve access token",
//         details: error.response.data,
//       });
//     } else {
//       return res.status(500).json({ error: "Internal server error", details: error.message });
//     }
//   }
// };
