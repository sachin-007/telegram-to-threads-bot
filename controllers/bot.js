require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");
const { Telegraf } = require("telegraf");
// const fetch = require("node-fetch");
// const threadController = require("./threadsController");
const authController = require("./authController");
const session = require("express-session");
const logActivity = require("../logActivity");
const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const trackedChannels = new Set();
const pendingCaptions = {};
const loggedInUsers = require("./loggedInUsers"); // Import shared loggedInUsers
const authSteps = {}; // Temporary storage for tracking authorization steps

logActivity("Telegram bot started.");

// Starting message
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const message = `
  Welcome to the Threads Bot! 🤖 Here's what you can do:

  1️⃣ **Register**: Register a new account with a username, name, email, and password. 
     Command: \`/register <username> <name> <email> <password>\`

  2️⃣ **Login**: Log in to your account using your email and password.
     Command: \`/login <email> <password>\`

  3️⃣ **Authorize**: Authorize the bot to access your Threads account and start using its features.
     Command: \`/auth\`

      You'll need to obtain these credentials from the Facebook Developer platform at:
     [Facebook Developer Console](https://developers.facebook.com/)

     After successful authorization, you can start posting to Threads

    4️⃣ **Post**: Once you're authorized, you can post images and captions to your Threads account.
  Send an image with a caption, and the bot will forward it to your Threads account.

    🔑 **Important Notes**:
  - You must be logged in to authorize the bot and make posts.
  - The bot uses your credentials to authenticate your Threads app and post on your behalf.
  - If you have any issues with these steps, feel free to reach out!
     
  To get started, simply choose one of the commands above and follow the instructions.

  If you need help with any command, type \`/help\`!

  Good luck! 🚀`;

  bot.sendMessage(chatId, message);
});

// /help command to guide users
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
  🚨 <b>HELP MENU</b> 🚨

  Welcome to the Threads Bot! Below are the available commands you can use:

  1️⃣ <b>Register</b>: Register a new account with a username, name, email, and password.
     Command: /register <username> <name> <email> <password>
     Example: /register johndoe John john@example.com 123456789
     
     This will create a new account for you!

  2️⃣ <b>Login</b>: If you already have an account, log in with your email and password.
     Command: /login <email> <password>
     Example: /login john@example.com 123456789

     After logging in, you'll be able to authorize the bot to access your Threads account.

  3️⃣ <b>Authorize</b>: Connect your Threads account to the bot by providing your THREAD_APP_ID and THREADS_APP_SECRET.
     Command: /auth
     
     You'll need to obtain these credentials from the Facebook Developer platform at:
     <a href="https://developers.facebook.com/">Facebook Developer Console</a>

     After successful authorization, you can start posting to Threads.

  4️⃣ <b>Post</b>: Once you're authorized, you can post images and captions to your Threads account.
     Send an image with a caption, and the bot will forward it to your Threads account.

  If you're new to this bot, please start with <b>/register</b> to create an account.

  <b>🔑 IMPORTANT NOTES</b>:
  - You must be logged in to authorize the bot and make posts.
  - The bot uses your credentials to authenticate your Threads app and post on your behalf.
  - If you have any issues with these steps, feel free to reach out!

  📩 If you need any further assistance, type <b>/help</b> again to get the instructions.

  Happy posting! 🚀`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: "HTML" });
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

  logActivity(username, name, email, password);

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
    registeredUsers[chatId] = { email, registered: true };

    bot.sendMessage(chatId, "Registration successful!");
  } catch (error) {
    bot.sendMessage(chatId, `Error registering: ${error.message}`);
  }
});

bot.onText(/\/login (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const messageParts = match[1].split(" "); // Expecting the format: "email password"
  const [email, password] = messageParts;

  logActivity("Attempting login with:", email, password);

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
      // Save chatId in the database associated with this user
      await axios.post(
        "https://tmethreadbot.onrender.com/api/auth/save-chatid",
        {
          email,
          chatId,
        }
      );
      bot.sendMessage(chatId, "Login successful! Welcome!");
    } else {
      bot.sendMessage(chatId, "Login failed! Invalid email or password.");
    }
  } catch (error) {
    logActivity(error);
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
      const response = await axios({
        method: "get",
        url: "https://tmethreadbot.onrender.com/api/auth/auth",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          email,
          THREAD_APP_ID,
          THREADS_APP_SECRET,
        },
      });
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
      logActivity("Error initiating OAuth:", error);
      bot.sendMessage(
        chatId,
        "An error occurred while initiating OAuth. Please try again."
      );
    }

    // Clean up the step tracking for this user
    delete authSteps[chatId];
  }
});

// Endpoint to receive notification from the server with access token and send to Telegram user
app.post("/api/auth/notify-token", async (req, res) => {
  const { email, access_token } = req.body;
  const chatId = getChatIdForEmail(email);

  if (chatId) {
    await bot.sendMessage(
      chatId,
      `Authorization successful! Your access token is: ${access_token}`
    );
    res.sendStatus(200);
  } else {
    res.status(404).send("Chat ID not found.");
  }
});

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

// Register Channel Command
bot.onText(/\/register_channel (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const channelUsername = match[1];

  try {
    // Send a message to the channel to get its ID (the bot must be an admin)
    const sentMessage = await bot.sendMessage(
      channelUsername,
      "Registering channel with bot"
    );

    // Channel ID is available from the sent message object
    const channelId = sentMessage.chat.id;

    // Find the admin user (this should be the user who triggered the command)
    const adminUser = await AdminUser.findOne({ chatId: msg.chat.id });

    if (!adminUser) {
      return bot.sendMessage(
        chatId,
        "Admin user not found. Please log in first."
      );
    }

    // Create and save a new channel
    const newChannel = new Channel({
      name: channelUsername,
      username: channelUsername,
      channelId: channelId,
      adminUser: adminUser._id, // Link the channel to the admin user
    });

    await newChannel.save();

    // Add the channel to the AdminUser's list of channels
    adminUser.channels.push(newChannel._id);
    await adminUser.save();

    // Send a success message to the user
    bot.sendMessage(
      chatId,
      `Channel ${channelUsername} registered successfully.`
    );
  } catch (error) {
    logActivity("Error registering channel:", error);
    bot.sendMessage(
      chatId,
      `Failed to register channel ${channelUsername}. Make sure the bot is an admin in the channel.`
    );
  }
});

// if (user.email) {
//   let adm_email = user.email;
//   const adm_auth_user = await AdminUser.findOne({ adm_email }, "access_token");
//   if(adm_auth_user){

//   }
// }

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const user = loggedInUsers[chatId];
  const email = user?.email;

  // Check if the user is logged in and authorized
  logActivity(`User: ${JSON.stringify(user)}, Email: ${email}`);
  if (!user || !user.loggedIn || !user.accessToken) {
    bot.sendMessage(
      chatId,
      "You must be logged in and authorized to use this feature. Please complete the login and authorization steps."
    );
    return;
  }

  // Check if the message contains an image
  if (msg.photo) {
    const caption = msg.caption || ""; // Get caption if exists

    // Get the file_id of the largest image
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;

    // Get the file URL using Telegram API
    try {
      const fileUrl = await bot.getFileLink(fileId);

      // Prepare data to send to your backend
      const postData = {
        imageUrl: fileUrl, // Send image URL
        caption: caption, // Send caption
        email: email,
      };

      logActivity(postData);

      if (postData.imageUrl && postData.caption && postData.email) {
        const backendApiUrl =
          "https://tmethreadbot.onrender.com/api/thread/post";
        // Send data to your backend
        const response = await axios.post(backendApiUrl, postData);

        // Respond to Telegram chat
        bot.sendMessage(
          chatId,
          "Image and caption forwarded successfully to Thread!"
        );
      } else {
        bot.sendMessage(chatId, "Only caption or text received, but no image.");
      }
    } catch (error) {
      logActivity("Error forwarding content to backend:", error);
      bot.sendMessage(
        chatId,
        `There was an error forwarding the content.${error}`
      );
    }
  } else {
    // If no image is found, send a message to inform the user
    bot.sendMessage(chatId, "Please send an image with a caption!");
  }
});

// // Handle incoming messages (including forwarded media)
// bot.on("message", async (msg) => {
//   // Check if the message contains an image
//   if (msg.photo) {
//     const chatId = msg.chat.id;
//     const caption = msg.caption || ""; // Get caption if exists

//     // Get the file_id of the largest image
//     const photo = msg.photo[msg.photo.length - 1];
//     const fileId = photo.file_id;

//     // Get the file URL using Telegram API
//     try {
//       const fileUrl = await bot.getFileLink(fileId);

//       // Prepare data to send to your backend
//       const postData = {
//         imageUrl: fileUrl, // Send image URL
//         caption: caption, // Send caption
//       };

//       console.log(postData);

//       if (postData.imageUrl) {
//         const backendApiUrl =
//           "https://tmethreadbot.onrender.com/api/thread/post";
//         // Send data to your backend
//         const response = await axios.post(backendApiUrl, postData);
//       } else {
//         bot.sendMessage(chatId, "only caption it got or text got.");
//       }

//       // Respond to Telegram chat
//       bot.sendMessage(
//         chatId,
//         "Image and caption forwarded successfully to Threads!"
//       );
//     } catch (error) {
//       console.error("Error forwarding content to backend:", error);
//       bot.sendMessage(chatId, "There was an error forwarding the content.");
//     }
//   } else {
//     // If no image is found, send a message to inform the user
//     bot.sendMessage(msg.chat.id, "Please send an image with a caption!");
//   }
// });

// The bot listens for photos
// bot.on("photo", async (ctx) => {
//   const { caption, photo } = ctx.message;
//   const fileId = photo[photo.length - 1].file_id;

//   try {
//     // Fetch the image from Telegram servers
//     const fileUrl = await ctx.telegram.getFileLink(fileId);
//     const imageUrl = fileUrl.href; // Image URL

//     const chatId = msg.chat.id;
//     const user = loggedInUsers[chatId];
//     const email = user.email;

//     // Post the image with caption to the backend API
//     const response = await fetch(
//       "https://tmethreadbot.onrender.com/api/thread/post",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           email,
//           caption, // Caption of the image
//           image: imageUrl, // Image URL
//         }),
//       }
//     );

//     const result = await response.json();
//     console.log(result); // Handle response from backend

//     ctx.reply(`Your post has been successfully posted to the thread.`);
//   } catch (error) {
//     console.error("Error posting to thread:", error);
//     ctx.reply("Sorry, there was an error posting to the thread.");
//   }
// });

// // Command to subscribe a user to a channel
// bot.onText(/\/subscribe (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   const channelName = match[1].trim();

//   if (!userChannels[chatId]) {
//     userChannels[chatId] = [];
//   }

//   if (!userChannels[chatId].includes(channelName)) {
//     userChannels[chatId].push(channelName);
//     bot.sendMessage(chatId, `Subscribed to ${channelName}.`);
//   } else {
//     bot.sendMessage(chatId, `Already subscribed to ${channelName}.`);
//   }
// });

// // Command to list subscribed channels and prompt the user to select multiple channels
// bot.onText(/\/listenon/, (msg) => {
//   const chatId = msg.chat.id;

//   if (!userChannels[chatId] || userChannels[chatId].length === 0) {
//     bot.sendMessage(chatId, "You have no subscribed channels. Use /subscribe @channel_name to add one.");
//     return;
//   }

//   // Initialize selected channels for this user
//   selectedChannels[chatId] = [];

//   const channelOptions = userChannels[chatId].map((channel) => [
//     {
//       text: selectedChannels[chatId].includes(channel) ? `✅ ${channel}` : channel,
//       callback_data: `toggle_${channel}`,
//     },
//   ]);

//   // Add a "Done" button to confirm selection
//   channelOptions.push([
//     {
//       text: "Done",
//       callback_data: `confirm_selection`,
//     },
//   ]);

//   bot.sendMessage(chatId, "Select channels to listen to (click again to deselect):", {
//     reply_markup: {
//       inline_keyboard: channelOptions,
//     },
//   });
// });

// // Handle callback queries for channel selection
// bot.on("callback_query", (query) => {
//   const chatId = query.message.chat.id;
//   const data = query.data;

//   if (data === "confirm_selection") {
//     if (selectedChannels[chatId].length > 0) {
//       bot.sendMessage(chatId, `Now listening to messages from: ${selectedChannels[chatId].join(", ")}`);
//     } else {
//       bot.sendMessage(chatId, "No channels selected. Use /listenon to select channels.");
//     }
//     return;
//   }

//   const channel = data.replace("toggle_", "");

//   if (userChannels[chatId].includes(channel)) {
//     if (selectedChannels[chatId].includes(channel)) {
//       // Deselect channel
//       selectedChannels[chatId] = selectedChannels[chatId].filter((ch) => ch !== channel);
//     } else {
//       // Select channel
//       selectedChannels[chatId].push(channel);
//     }

//     // Update the inline keyboard with new selection state
//     const channelOptions = userChannels[chatId].map((ch) => [
//       {
//         text: selectedChannels[chatId].includes(ch) ? `✅ ${ch}` : ch,
//         callback_data: `toggle_${ch}`,
//       },
//     ]);
//     channelOptions.push([
//       {
//         text: "Done",
//         callback_data: `confirm_selection`,
//       },
//     ]);

//     bot.editMessageReplyMarkup(
//       {
//         inline_keyboard: channelOptions,
//       },
//       {
//         chat_id: chatId,
//         message_id: query.message.message_id,
//       }
//     );
//   }
// });

// // Listener for image messages and captions from the selected channels
// bot.on("message", async (msg) => {
//   const chatId = msg.chat.id;

//   // Check if the message is an image and the user has selected channels
//   if (msg.photo && selectedChannels[chatId] && selectedChannels[chatId].length > 0) {
//     const photoId = msg.photo[msg.photo.length - 1].file_id;

//     try {
//       // Get the file URL from Telegram
//       const fileUrl = await bot.getFileLink(photoId);
//       const caption = msg.caption || "";

//       // Send the image URL and caption to the external endpoint for each selected channel
//       for (const channel of selectedChannels[chatId]) {
//         await axios.post(THREAD_POST_URL, {
//           channel,
//           image_url: fileUrl,
//           caption,
//         });
//       }

//       bot.sendMessage(chatId, "Image and caption forwarded successfully to selected channels.");
//     } catch (error) {
//       console.error("Failed to forward the message:", error);
//       bot.sendMessage(chatId, "Failed to forward the image and caption.");
//     }
//   }
// });

module.exports = bot;
