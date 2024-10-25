const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
// router.get('/callback', authController.callback);
app.use('/callback', authController.callback);
app.use('/accesstoken', authController.getAccessToken);

module.exports = router;



