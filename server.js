// // server.js or app.js

// const express = require('express');
// const dotenv = require('dotenv');
// const routes = require('./routes');
// const fs = require('fs');
// const path = require('path');
// const logActivity = require('./logsys'); // Import the logger

// dotenv.config(); // Load environment variables

// const app = express();

// // Middleware and Routes
// app.use(express.json());
// app.use('/api', routes); // Define API routes

// // Error Handling Middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something went wrong!');
// });

// // Starting server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     logActivity(`Server running on port ${PORT}`);
// });

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const fs = require("fs");
const path = require("path");
const logActivity = require("./logActivity");
const session = require("express-session");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Configure express-session
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret key
    resave: false, // Prevents saving session if unmodified
    saveUninitialized: true, // Creates a session even if no data is stored
    cookie: { secure: false }, // Set to true if using HTTPS in production
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/telegram", telegramRoutes);
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "privacy.html"));
});
// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logActivity(`Server running on port ${PORT}`);
});

// // index.js
// const express = require('express');
// const axios = require('axios');
// const dotenv = require('dotenv');

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Step 1: Redirect to Authorization URL
// app.get('/auth', (req, res) => {
//     const authUrl = `https://threads.net/oauth/authorize?client_id=${process.env.THREADS_APP_ID}&redirect_uri=${process.env.REDIRECT_URI}&scope=threads_basic,threads_content_publish&response_type=code`;
//     console.log(authUrl);

//     res.redirect(authUrl);
// });

// // Step 2: Handle Redirect and Exchange Code for Token
// app.get('/callback', async (req, res) => {
//     const { code } = req.query;
//     console.log(req.query);

//     if (!code) {
//         return res.status(400).send('No authorization code provided.');
//     }

//     try {
//         const response = await axios.post('https://graph.threads.net/oauth/access_token', null, {
//             params: {
//                 client_id: process.env.THREADS_APP_ID,
//                 client_secret: process.env.THREADS_APP_SECRET,
//                 grant_type: 'authorization_code',
//                 redirect_uri: process.env.REDIRECT_URI,
//                 code,
//             },
//         });

//         const { access_token, user_id } = response.data;

//         // Handle successful authentication
//         res.send(`Access Token: ${access_token}, User ID: ${user_id}`);
//     } catch (error) {
//         console.error('Error exchanging code for token:', error.response.data);
//         res.status(500).send('Error exchanging code for token.');
//     }
// });

// // Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });
