// // bot.js
// require("dotenv").config();
// const TelegramBot = require("node-telegram-bot-api");
// const axios = require("axios");
// const threadController = require("./threadsController");

// const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
// const trackedChannels = new Set();
// const pendingCaptions = {};
// const users = {}; // Temporary in-memory storage, replace with a DB for production

// console.log("Telegram bot started.");

// // function startBot() {
// // 1. /trackchannel to start tracking a channel
// bot.onText(/\/trackchannel (.+)/, (msg, match) => {
//   const channelId = match[1];
//   trackedChannels.add(channelId);
//   bot.sendMessage(msg.chat.id, `Tracking started for channel ID: ${channelId}`);
// });

// // 2. /untrackchannel to stop tracking a channel
// bot.onText(/\/untrackchannel (.+)/, (msg, match) => {
//   const channelId = match[1];
//   trackedChannels.delete(channelId);
//   bot.sendMessage(msg.chat.id, `Stopped tracking channel ID: ${channelId}`);
// });

// // 3. /pendingcaption to list pending captions for manual posting
// bot.onText(/\/pendingcaption/, (msg) => {
//   const chatId = msg.chat.id;
//   if (Object.keys(pendingCaptions).length === 0) {
//     return bot.sendMessage(chatId, "No pending captions.");
//   }

//   const pendingList = Object.entries(pendingCaptions)
//     .map(([id, caption]) => `ID: ${id} - Caption: ${caption}`)
//     .join("\n");
//   bot.sendMessage(chatId, `Pending Captions:\n${pendingList}`);
// });

// // 4. /post<ID> command to post a specific caption by ID
// bot.onText(/\/post(\d+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const id = match[1];
//   const caption = pendingCaptions[id];

//   if (!caption) {
//     return bot.sendMessage(chatId, `No pending caption found with ID: ${id}`);
//   }

//   try {
//     await threadController.postToThreads(caption);
//     bot.sendMessage(chatId, `Posted caption with ID: ${id} to Threads.`);
//     delete pendingCaptions[id];
//   } catch (error) {
//     bot.sendMessage(chatId, `Failed to post caption with ID: ${id}`);
//   }
// });

// // 5. /start command to send registration instructions
// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(
//     chatId,
//     `Welcome! SachN Please register on tmethreadbot.onrender.com using username, email, and password.\nUse /register to register and /login to log in.\nEndpoints:\n- Register: /api/auth/register\n- Login: /api/auth/login`
//   );
// });

// // 6. /guide command to explain how to get client_id and client_secret
// bot.onText(/\/guide/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(
//     chatId,
//     `To set up Threads API:\n1. Obtain Client ID and Client Secret from Threads Developer Portal.\nUse /client_id and /client_secret to set them here.`
//   );
// });

// // 7. Commands to set client_id and client_secret
// bot.onText(/\/client_id (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   if (!users[chatId]) users[chatId] = {};
//   users[chatId].client_id = match[1];
//   bot.sendMessage(
//     chatId,
//     "Client ID saved. Now set Client Secret using /client_secret [YOUR_SECRET]"
//   );
// });

// bot.onText(/\/client_secret (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   if (!users[chatId]) users[chatId] = {};
//   users[chatId].client_secret = match[1];
//   bot.sendMessage(chatId, "Client Secret saved. Now authenticate using /auth.");
// });

// // 8. /auth command to generate and send OAuth URL for authentication
// bot.onText(/\/auth/, (msg) => {
//   const chatId = msg.chat.id;
//   const user = users[chatId];

//   if (!user || !user.client_id || !user.client_secret) {
//     return bot.sendMessage(chatId, "Please set Client ID and Secret first.");
//   }

//   const authUrl = threadController.getAuthUrl(user.client_id);
//   bot.sendMessage(chatId, `Click to authenticate:\n${authUrl}`);
// });

// // 9. Start and Stop autopost commands
// bot.onText(/\/start_autopost/, (msg) => {
//   const chatId = msg.chat.id;
//   if (!users[chatId].access_token) {
//     return bot.sendMessage(chatId, "Please complete authentication first.");
//   }

//   users[chatId].autoPost = true;
//   bot.sendMessage(chatId, "Auto-posting started!");
// });

// bot.onText(/\/stop_autopost/, (msg) => {
//   const chatId = msg.chat.id;
//   users[chatId].autoPost = false;
//   bot.sendMessage(chatId, "Auto-posting stopped.");
// });

// // Listen for messages
// bot.on("message", async (msg) => {
//   const chatId = msg.chat.id;

//   if (trackedChannels.has(String(chatId))) {
//     // Check if the message has a photo
//     if (msg.photo) {
//       const fileId = msg.photo[msg.photo.length - 1].file_id;
//       const caption = msg.caption || "";

//       // Get image URL and send it to Threads with caption if available
//       const fileUrl = await bot.getFileLink(fileId);
//       await postToThreads(fileUrl, caption);
//     } else if (msg.text) {
//       // Only caption message
//       const captionId = Date.now().toString(); // Unique ID for the caption
//       pendingCaptions[captionId] = msg.text;
//       bot.sendMessage(
//         chatId,
//         `Received caption: "${msg.text}".\nType /post${captionId} to post it to Threads or view all pending captions with /pendingcaption.`
//       );
//     }
//   }
// });

// // Helper function to post image or caption to Threads
// async function postToThreads(fileUrl, caption) {
//   try {
//     const response = await threadController.postToThreads({
//       content: caption,
//       imageUrl: fileUrl,
//     });
//     console.log("Posted to Threads successfully:", response.data);
//   } catch (error) {
//     console.error("Failed to post to Threads:", error);
//   }
// }

// // Error handling
// bot.on("polling_error", (error) => {
//   console.error("Polling error:", error);
// });

// // }

// module.exports = bot;

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
// const threadController = require("./threadsController");
const authController = require("./authController");
const session = require("express-session");
const logActivity = require("../logActivity");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const trackedChannels = new Set();
const pendingCaptions = {};
const loggedInUsers = {}; // Temporary in-memory storage, replace with a DB for production
const authSteps = {}; // Temporary storage for tracking authorization steps

console.log("Telegram bot started.");

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const message = `
  Welcome to the Threads Bot! 🤖 Here's what you can do:

  1️⃣ **Register**: Register a new account with a username, name, email, and password. 
     Command: \`/register <username> <name> <email> <password>\`
     
  2️⃣ **Login**: Log in to your account using your email and password.
     Command: \`/login <email> <password>\`
     
  3️⃣ **Authorize**: Authorize the bot to access your Threads account and start using its features.
     Command: \`/auth <THREAD_APP_ID> <THREADS_APP_SECRET>\`
     
  4️⃣ **Start Listening**: Begin listening to Telegram channels and receive updates.

To get started, simply choose one of the commands above and follow the instructions.

If you need help with any command, type \`/help\`!

Good luck! 🚀`;

  bot.sendMessage(chatId, message);
});

// For /register, prompt user for details interactively
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  const messageParts = msg.text.split(" ");

  // Make sure the command has the correct number of parameters
  if (messageParts.length !== 5) {
    bot.sendMessage(
      chatId,
      "Please provide all required information: /register <username> <name> <email> <password>"
    );
    return;
  }

  const [, username, name, email, password] = messageParts;

  console.log(username, name, email, password);

  try {
    // Sending a POST request with the data
    const response = await axios.post(
      "https://tmethreadbot.onrender.com/api/auth/register",
      {
        username,
        name,
        email,
        password,
      }
    );

    bot.sendMessage(chatId, "Registration successful!");
  } catch (error) {
    bot.sendMessage(chatId, `Error registering: ${error.message}`);
  }
});

bot.onText(/\/login (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const messageParts = match[1].split(" "); // Expecting the format: "email password"
  const [email, password] = messageParts;

  console.log("Attempting login with:", email, password);

  try {
    // Replace with the actual backend URL
    const response = await axios.post(
      "https://tmethreadbot.onrender.com/api/auth/login",
      {
        email,
        password,
      }
    );

    // Send success message if login is successful
    if (response.status == 200) {
      loggedInUsers[chatId] = { email, loggedIn: true };
      bot.sendMessage(chatId, "Login successful! Welcome!");
    } else {
      bot.sendMessage(chatId, "Login failed! Invalid email or password.");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `Error logging in: ${error.message}`);
  }
});

// /auth command to initiate the authorization process
bot.onText(/\/auth/, (msg) => {
  const chatId = msg.chat.id;
  const user = loggedInUsers[chatId];

  // Ensure the user is logged in before authorizing
  if (!user || !user.loggedIn) {
    bot.sendMessage(chatId, "Please log in before authorizing the bot.");
    return;
  }

  // Prompt for THREAD_APP_ID and start the authorization process
  bot.sendMessage(chatId, "Please enter your THREAD_APP_ID:");
  authSteps[chatId] = { step: "awaiting_app_id" };
});

// Handle messages to capture THREAD_APP_ID and THREADS_APP_SECRET from the user
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const user = loggedInUsers[chatId];
  const userStep = authSteps[chatId] || {};

  // Capture THREAD_APP_ID
  if (userStep.step === "awaiting_app_id") {
    authSteps[chatId].THREAD_APP_ID = msg.text;
    bot.sendMessage(chatId, "Please enter your THREADS_APP_SECRET:");
    authSteps[chatId].step = "awaiting_app_secret";

    // Capture THREADS_APP_SECRET and proceed with the authorization request
  } else if (userStep.step === "awaiting_app_secret") {
    authSteps[chatId].THREADS_APP_SECRET = msg.text;
    const { THREAD_APP_ID, THREADS_APP_SECRET } = authSteps[chatId];
    const email = user.email;

    try {
      // Send GET request to your server with THREAD_APP_ID, THREADS_APP_SECRET, and email
      const response = await axios.get(
        "https://tmethreadbot.onrender.com/api/auth/auth",
        {
          params: {
            email,
            THREAD_APP_ID,
            THREADS_APP_SECRET,
          },
        }
      );

      // If the server provides an authorization URL, send it to the user
      if (response.status === 200 && response.data.authUrl) {
        bot.sendMessage(
          chatId,
          `Please authorize the application by visiting this URL: ${response.data.authUrl}`
        );
      } else {
        bot.sendMessage(
          chatId,
          "Authorization failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      bot.sendMessage(
        chatId,
        "An error occurred while initiating OAuth. Please try again."
      );
    }

    // Clean up the step tracking for this user
    delete authSteps[chatId];
  }
});

// Command to authorize with Threads
// bot.onText(/\/auth/, async (msg) => {
//   const chatId = msg.chat.id;
//   const user = loggedInUsers[chatId];
//   const email = user.email; // Assuming email is available in `msg.from`. Adjust as needed.

//   if (!email) {
//     bot.sendMessage(
//       chatId,
//       "Sorry, I couldn't retrieve your email. Please ensure your profile is complete."
//     );
//     return;
//   }

//   // Get the THREAD_APP_ID and THREADS_APP_SECRET from the environment or user input
//   const THREAD_APP_ID = process.env.THREAD_APP_ID; // You may want to get this dynamically from the user or session
//   const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;

//   if (!THREAD_APP_ID || !THREADS_APP_SECRET) {
//     bot.sendMessage(
//       chatId,
//       "Missing application credentials. Please provide THREAD_APP_ID and THREADS_APP_SECRET."
//     );
//     return;
//   }

//   try {
//     // Call the backend /auth endpoint to start the OAuth flow
//     const response = await axios.post(
//       "https://tmethreadbot.onrender.com/api/auth/auth",
//       {
//         THREAD_APP_ID,
//         THREADS_APP_SECRET,
//       }
//     );

//     // Notify the user that OAuth has started
//     bot.sendMessage(
//       chatId,
//       `Starting OAuth flow... Please check your browser for the authorization page.`
//     );
//   } catch (error) {
//     console.error("Error initiating OAuth flow:", error);
//     bot.sendMessage(
//       chatId,
//       "An error occurred while initiating OAuth. Please try again."
//     );
//   }
// });

// // Command to initiate the Threads authorization process
// bot.onText(/\/auth/, (msg) => {
//   const chatId = msg.chat.id;
//   const user = loggedInUsers[chatId];

//   if (!user || !user.loggedIn) {
//     bot.sendMessage(chatId, "Please log in before authorizing the bot.");
//     return;
//   }

//   bot.sendMessage(chatId, "Please enter your THREAD_APP_ID:");
//   authSteps[chatId] = { step: "awaiting_app_id" };
// });

// // Capture THREAD_APP_ID and THREADS_APP_SECRET for authorization
// bot.on("message", async (msg) => {
//   const chatId = msg.chat.id;
//   const user = loggedInUsers[chatId];
//   const userStep = authSteps[chatId] || {};

//   if (userStep.step === "awaiting_app_id") {
//     authSteps[chatId].THREAD_APP_ID = msg.text;
//     bot.sendMessage(chatId, "Please enter your THREADS_APP_SECRET:");
//     authSteps[chatId].step = "awaiting_app_secret";
//   } else if (userStep.step === "awaiting_app_secret") {
//     authSteps[chatId].THREADS_APP_SECRET = msg.text;
//     const { THREAD_APP_ID, THREADS_APP_SECRET } = authSteps[chatId];
//     logActivity(
//       `THREAD_APP_ID is : ${THREAD_APP_ID},\nTHREADS_APP_SECRET is:${THREADS_APP_SECRET}`
//     );
//     const email = user.email;
//     const REDIRECT_URI = process.env.REDIRECT_URI;
//     const scope =
//       "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies";

//     const response = await axios.get(
//       "https://tmethreadbot.onrender.com/api/auth/auth",
//       {
//         params: {
//           email,
//           THREAD_APP_ID,
//           THREADS_APP_SECRET,
//         },
//       }
//     );
//     // Send success message if login is successful
//     if (response.status == 200) {
//       const authUrl = `https://www.threads.net/oauth/authorize/?redirect_uri=${encodeURIComponent(
//         REDIRECT_URI
//       )}&client_id=${THREAD_APP_ID}&response_type=code&scope=${encodeURIComponent(
//         scope
//       )}&state=${encodeURIComponent(email)}`;

//       // Send the authorization URL to the user
//       bot.sendMessage(
//         chatId,
//         `Please authorize the application by visiting this URL: ${authUrl}`
//       );
//     } else {
//       bot.sendMessage(chatId, "Login failed! Invalid email or password.");
//     }

//     // try {
//     //   const response = await axios.post(
//     //     "https://tmethreadbot.onrender.com/api/auth/auth",
//     //     {
//     //       THREAD_APP_ID,
//     //       THREADS_APP_SECRET,
//     //     }
//     //   );

//     //   bot.sendMessage(
//     //     chatId,
//     //     "Starting OAuth flow... Please check your browser for the authorization page."
//     //   );
//     // } catch (error) {
//     //   bot.sendMessage(
//     //     chatId,
//     //     "An error occurred while initiating OAuth. Please try again.",
//     //     error
//     //   );
//     // }

//     // Construct the authorization URL

//     delete authSteps[chatId];
//   }
// });

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  // const username = msg.chat.username;
  const user = loggedInUsers[chatId]; // Replace with your actual user management logic

  if (user && user.loggedIn) {
    bot.sendMessage(chatId, `You are logged in as ${user.email}`);
  } else {
    bot.sendMessage(chatId, "You are not logged in.");
  }
});

module.exports = bot;
