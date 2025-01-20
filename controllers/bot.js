require("dotenv").config();
const axios = require("axios");
const express = require("express");
const session = require("express-session");
const app = express();
app.use(express.json());
// const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const loggedInUsers = require("./loggedInUsers"); // Import shared loggedInUsers
const logActivity = require("../logActivity");
const authSteps = {}; // Temporary storage for tracking authorization steps

// logActivity('',"Telegram bot started.");
logActivity("Telegram bot inside the bot.js.");

module.exports = (bot) => {
  bot.on("polling_error", (error) => {
    console.error("Polling error:", error); // Log the error for troubleshooting
    bot.stopPolling(); // Stop polling
    setTimeout(() => bot.startPolling(), 10000); // Restart polling after 10 seconds
  });

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

    logActivity("Attempting register with:", username, name, email, password);

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
      // logActivity(error);
      bot.sendMessage(chatId, `Error logging in: ${error.message}`);
    }
  });

  // /auth command to initiate the authorization process
  bot.onText(/\/auth/, async (msg) => {
    const chatId = msg.chat.id;
    const user = loggedInUsers[chatId];
    const email = user.email;
    const THREAD_APP_ID = process.enc.THREAD_APP_ID;
    const THREADS_APP_SECRET = process.enc.THREADS_APP_SECRET;

    // Ensure the user is logged in before authorizing
    if (!user || !user.loggedIn) {
      bot.sendMessage(chatId, "Please log in before authorizing the bot.");
      return;
    }

    // authentication below 

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
      // logActivity("Error initiating OAuth:", error);
      bot.sendMessage(
        chatId,
        "An error occurred while initiating OAuth. Please try again."
      );
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
      // logActivity("Error registering channel:", error);
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
    // logActivity(`User: ${JSON.stringify(user)}, Email: ${email}`);
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
        const fileUrl = encodeURIComponent(await bot.getFileLink(fileId));

        // Prepare data to send to your backend
        const postData = {
          imageUrl: fileUrl, // Send image URL
          caption: caption, // Send caption
          email: email,
        };

        // logActivity(postData);

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
          bot.sendMessage(chatId, "Only caption or text or image is received.");
        }
      } catch (error) {
        // logActivity("Error forwarding content to backend:", error);
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

  bot.onText(/\/addtags/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id; // Get the user ID from the message
    const user = loggedInUsers[chatId];
    const email = user?.email;
    bot.sendMessage(
      chatId,
      "Please send the tags you want to add (e.g., #tag1, #tag2):"
    );

    // Listen for the user's tag input
    bot.once("message", async (tagsMsg) => {
      const tagsInput = tagsMsg.text;
      if (!tagsInput) {
        return bot.sendMessage(chatId, "No tags provided. Please try again.");
      }

      // Split the tags by commas and trim extra spaces
      const tags = tagsInput.split(",").map((tag) => tag.trim());

      // Make an API call to the backend to update the tags
      try {
        const response = await axios.post(
          "https://tmethreadbot.onrender.com/api/auth/updateTags",
          {
            email: email,
            tags: tags,
          }
        );

        if (response.status === 200) {
          bot.sendMessage(
            chatId,
            `Tags updated successfully: ${tags.join(", ")}`
          );
        } else {
          bot.sendMessage(chatId, `Error: ${response.data.message}`);
        }
      } catch (error) {
        bot.sendMessage(chatId, `Error updating tags: ${error.message}`);
      }
    });
  });
};
// module.exports = bot;
