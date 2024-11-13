const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const threadsRoutes = require("./routes/threadsRoutes");
const fs = require("fs");
const path = require("path");
const logActivity = require("./logActivity");
const session = require("express-session");
const mokaController = require('./controllers/mokaController')
const bot = require("./controllers/bot"); // Import bot.js to initialize it

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure express-session
app.use(
  session({
    secret: process.env.APP_SECRET, // Replace with a strong secret key
    resave: false, // Prevents saving session if unmodified
    saveUninitialized: true, // Creates a session even if no data is stored
    cookie: { secure: false }, // Set to true if using HTTPS in production
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/thread", threadsRoutes);
app.use('/api', mokaController);
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "privacy.html"));
});
// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logActivity(`Server running on port ${PORT}`);
  logActivity("Bot is now running alongside the server.");
});
