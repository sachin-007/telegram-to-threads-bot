const express = require('express');
const authxcontroller = require('../controllers/TwitterXControllers/authxcontroller');
const router = express.Router();

// router.post('/postToThreads', authxcontroller.postToThreads);

// router.get('/auth', authxcontroller.initiateAuth);
// router.get('/callback', authxcontroller.handleCallback);
router.get("/callback", (req, res) =>
    authxcontroller.handleCallback(req, res, req.bot)
);
// router.get("/posttotweet", (req, res) =>
//     authxcontroller.postTweetWithImageUrl(req, res, req.bot)
// );

router.post("/posttotweet", authxcontroller.postTweetWithImageUrl);


module.exports = router;

// init : ${SERVER_HOST}/auth/twitter
// callback : ${SERVER_HOST}/auth/twitter/callback
// CALLBACK_URL=${SERVER_HOST}/api/twitterx/callback