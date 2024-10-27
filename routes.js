// const express = require('express');
// const axios = require('axios');
// const router = express.Router();
// const logActivity = require('./logActivity'); // Import the logger

// // Callback URL route to handle OAuth2 callback
// router.get('/callback', async (req, res) => {
//     const authorizationCode = req.query.code;

//     if (!authorizationCode) {
//         return res.status(400).json({ error: 'Authorization code not provided' });
//     }

//     try {
//         // Exchange authorization code for access token
//         const response = await axios.post('https://www.facebook.com/v12.0/dialog/oauth', {
//             client_id: process.env.CLIENT_ID,
//             client_secret: process.env.CLIENT_SECRET,
//             code: authorizationCode,
//             grant_type: 'authorization_code',
//             redirect_uri: process.env.REDIRECT_URI,
//         });

//         const { access_token } = response.data;
        
//         logActivity(access_token);
        
        
        
//         // Save or process the access token as needed
//         return res.status(200).json({ access_token });
//     } catch (error) {
//         return res.status(500).json({ error: 'Error exchanging code for access token' });
//     }
// });

// module.exports = router;
