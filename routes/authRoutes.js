const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
// router.get('/auth', authController.startOAuth);
// router.get('/auth/callback', authController.handleOAuthCallback);
// router.get('/callback', authController.callback);
// app.use('/callback', authController.callback);
// app.use('/accesstoken', authController.getAccessToken);


// Define routes for OAuth
router.get('/auth', authController.getAuthorizationUrl);
router.get('/auth/callback', authController.handleCallback);

module.exports = router;



