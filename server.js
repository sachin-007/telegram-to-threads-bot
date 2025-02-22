const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const {router:googleauthRoutes} = require("./routes/googleauthRoutes");
const spreadsheetRoutes = require("./routes/spreadsheetRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const TelegramBot = require("node-telegram-bot-api");
const threadsRoutes = require("./routes/threadsRoutes");
const {router:twitterxRoutes} = require("./routes/twitterxRoutes");
const fs = require("fs");
const path = require("path");
const logActivity = require("./logActivity");
const session = require("express-session");
const mokaController = require("./controllers/mokaController");
const { refresh } = require("./controllers/refreshRouteController");
const cookieParser = require("cookie-parser");


dotenv.config();
connectDB();

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.render('index');
});

// Initialize the Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
logActivity("Telegram bot started. right with server");
require("./controllers/bot")(bot);
// require("./controllers/helperBot")(bot);

// Configure express-session
app.use(
  session({
    secret: process.env.APP_SECRET, // Replace with a strong secret key
    resave: false, // Prevents saving session if unmodified
    saveUninitialized: true, // Creates a session even if no data is stored
    cookie: { secure: false }, // Set to true if using HTTPS in production
  })
);

// Inject the bot instance into each request (optional)
app.use((req, res, next) => {
  req.bot = bot;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api", googleauthRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/thread", threadsRoutes);
app.use("/api/inserttosheet", spreadsheetRoutes);
app.use("/api/twitterx", twitterxRoutes);
app.use("/api", mokaController);
app.use("/refresh", refresh);
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "privacy.html"));
});
// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logActivity(`Server running on port ${PORT}`);
  logActivity("Bot is now running alongside the server.");
});
