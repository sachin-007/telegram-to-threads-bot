const express = require('express');
const authxcontroller = require('../controllers/TwitterXControllers/authxcontroller');
const authxv1controller = require('../controllers/TwitterXControllers/authxv1controller');
const logActivity = require('../logActivity');
const { default: axios } = require('axios');
const router = express.Router();
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const qs = require('qs');
// const oauthTokenStore = {}; // Shared storage for email mapping
const oauthTokenStore = require('../utils/oauthTokenStoreEmailTweeterX');

// router.post('/postToThreads', authxcontroller.postToThreads);

// router.get('/auth', authxcontroller.initiateAuth);
// router.get('/callback', authxcontroller.handleCallback);
router.get("/callback", (req, res) =>
    authxcontroller.handleCallback(req, res, req.bot)
);

// following for the authentication of the user with the twitter with V0.1
const oauth = OAuth({
    consumer: { key: process.env.X_CONSUMER_KEY, secret: process.env.x_CONSUMER_KEY_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
  
  router.get('/auth', async (req, res) => {
    const email = req.query.email;
    const callbackUrl = `${process.env.SERVER_HOST}${process.env.XV1_REDIRECT_URI}`;
    console.log(`callbackUrl is :${callbackUrl}`);
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  
    const request_data = {
      url: requestTokenUrl,
      method: 'POST',
      data: { oauth_callback: callbackUrl },
    };
  
    try {
      const headers = oauth.toHeader(oauth.authorize(request_data));
  
      // Send the request with the OAuth header and body
      const response = await axios.post(requestTokenUrl, qs.stringify(request_data.data), {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      });
  
      // Parse the response to get the oauth_token
      const { oauth_token } = qs.parse(response.data);

      // Store oauth_token and associated email in shared store
      oauthTokenStore[oauth_token] = email;

      console.log(`oauthTokenStore getting from state is ${JSON.stringify(oauthTokenStore)}`);

      

      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}&state=${encodeURIComponent(email)}`;
      console.log(`auth url is : ${authUrl}`);
      
      res.redirect(authUrl);
    } catch (error) {
      console.log(`Error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get request token', details: error.message });
    }
  });

// the following for the V0.1 version of the twitterx 
router.get("/v1/callback", (req, res) =>
    authxv1controller.handleCallback(req,res,req.bot)
);

// the following for creating a tweet with image and caption image with V0.1 and tweet with image and caption with V0.2
router.post("/posttotweet", (req, res) =>
    authxcontroller.postTweetWithImageUrl(req, res, req.bot)
);


module.exports = { router }; // Export store