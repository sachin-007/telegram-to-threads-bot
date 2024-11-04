// controllers/telegramController.js
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const threadController = require("./threadController");
const trackedChannels = new Set(); // Track channel IDs
const pendingCaptions = {}; // Store pending captions by ID for manual posting

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const users = {}; // Temporary in-memory storage, replace with a DB for production

// 1. /trackchannel to start tracking a channel
bot.onText(/\/trackchannel (.+)/, (msg, match) => {
  const channelId = match[1];
  trackedChannels.add(channelId);
  bot.sendMessage(msg.chat.id, `Tracking started for channel ID: ${channelId}`);
});

// 2. /untrackchannel to stop tracking a channel
bot.onText(/\/untrackchannel (.+)/, (msg, match) => {
  const channelId = match[1];
  trackedChannels.delete(channelId);
  bot.sendMessage(msg.chat.id, `Stopped tracking channel ID: ${channelId}`);
});

// 3. /pendingcaption to list pending captions for manual posting
bot.onText(/\/pendingcaption/, (msg) => {
  const chatId = msg.chat.id;
  if (Object.keys(pendingCaptions).length === 0) {
    return bot.sendMessage(chatId, "No pending captions.");
  }

  const pendingList = Object.entries(pendingCaptions)
    .map(([id, caption]) => `ID: ${id} - Caption: ${caption}`)
    .join("\n");
  bot.sendMessage(chatId, `Pending Captions:\n${pendingList}`);
});

// 4. /post<ID> command to post a specific caption by ID
bot.onText(/\/post(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  const caption = pendingCaptions[id];

  if (!caption) {
    return bot.sendMessage(chatId, `No pending caption found with ID: ${id}`);
  }

  try {
    await threadController.postToThreads(caption);
    bot.sendMessage(chatId, `Posted caption with ID: ${id} to Threads.`);
    delete pendingCaptions[id];
  } catch (error) {
    bot.sendMessage(chatId, `Failed to post caption with ID: ${id}`);
  }
});

// 5. /start command to send registration instructions
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Welcome! Please register on tmethreadbot.onrender.com using username, email, and password.\nUse /register to register and /login to log in.\nEndpoints:\n- Register: /api/auth/register\n- Login: /api/auth/login`
  );
});

// 6. /guide command to explain how to get client_id and client_secret
bot.onText(/\/guide/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `To set up Threads API:\n1. Obtain Client ID and Client Secret from Threads Developer Portal.\nUse /client_id and /client_secret to set them here.`
  );
});

// 7. Commands to set client_id and client_secret
bot.onText(/\/client_id (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!users[chatId]) users[chatId] = {};
  users[chatId].client_id = match[1];
  bot.sendMessage(
    chatId,
    "Client ID saved. Now set Client Secret using /client_secret [YOUR_SECRET]"
  );
});

bot.onText(/\/client_secret (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!users[chatId]) users[chatId] = {};
  users[chatId].client_secret = match[1];
  bot.sendMessage(chatId, "Client Secret saved. Now authenticate using /auth.");
});

// 8. /auth command to generate and send OAuth URL for authentication
bot.onText(/\/auth/, (msg) => {
  const chatId = msg.chat.id;
  const user = users[chatId];

  if (!user || !user.client_id || !user.client_secret) {
    return bot.sendMessage(chatId, "Please set Client ID and Secret first.");
  }

  const authUrl = threadController.getAuthUrl(user.client_id);
  bot.sendMessage(chatId, `Click to authenticate:\n${authUrl}`);
});

// 9. Start and Stop autopost commands
bot.onText(/\/start_autopost/, (msg) => {
  const chatId = msg.chat.id;
  if (!users[chatId].access_token) {
    return bot.sendMessage(chatId, "Please complete authentication first.");
  }

  users[chatId].autoPost = true;
  bot.sendMessage(chatId, "Auto-posting started!");
});

bot.onText(/\/stop_autopost/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId].autoPost = false;
  bot.sendMessage(chatId, "Auto-posting stopped.");
});

// Listen for messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (trackedChannels.has(String(chatId))) {
    // Check if the message has a photo
    if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const caption = msg.caption || "";

      // Get image URL and send it to Threads with caption if available
      const fileUrl = await bot.getFileLink(fileId);
      await postToThreads(fileUrl, caption);
    } else if (msg.text) {
      // Only caption message
      const captionId = Date.now().toString(); // Unique ID for the caption
      pendingCaptions[captionId] = msg.text;
      bot.sendMessage(
        chatId,
        `Received caption: "${msg.text}".\nType /post${captionId} to post it to Threads or view all pending captions with /pendingcaption.`
      );
    }
  }
});

// Helper function to post image or caption to Threads
async function postToThreads(fileUrl, caption) {
  try {
    const response = await threadController.postToThreads({
      content: caption,
      imageUrl: fileUrl,
    });
    console.log("Posted to Threads successfully:", response.data);
  } catch (error) {
    console.error("Failed to post to Threads:", error);
  }
}

module.exports = bot;

// // controllers/telegramController.js
// const TelegramBot = require("node-telegram-bot-api");
// const axios = require("axios");
// const threadController = require("./threadController");
// const trackedChannels = new Set(); // Track channel IDs
// const pendingCaptions = {}; // Store pending captions by ID for manual posting

// const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
// const users = {}; // Temporary in-memory storage, replace with a DB for production

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

// // 1. /start command to send registration instructions
// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(
//     chatId,
//     `Welcome! Please register on tmethreadbot.onrender.com using username, email, and password.\nUse /register to register and /login to log in.\nEndpoints:\n- Register: /api/auth/register\n- Login: /api/auth/login`
//   );
// });

// // 2. /guide command to explain how to get client_id and client_secret
// bot.onText(/\/guide/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(
//     chatId,
//     `To set up Threads API:\n1. Obtain Client ID and Client Secret from Threads Developer Portal.\nUse /client_id and /client_secret to set them here.`
//   );
// });

// // 3. Commands to set client_id and client_secret
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

// // 4. /auth command to generate and send OAuth URL for authentication
// bot.onText(/\/auth/, (msg) => {
//   const chatId = msg.chat.id;
//   const user = users[chatId];

//   if (!user || !user.client_id || !user.client_secret) {
//     return bot.sendMessage(chatId, "Please set Client ID and Secret first.");
//   }

//   const authUrl = threadController.getAuthUrl(user.client_id);
//   bot.sendMessage(chatId, `Click to authenticate:\n${authUrl}`);
// });

// // 5. /linkchannel to list available channels for selection
// bot.onText(/\/linkchannel/, async (msg) => {
//   const chatId = msg.chat.id;
//   const user = users[chatId];

//   if (!user || !user.access_token) {
//     return bot.sendMessage(chatId, "Please authenticate first.");
//   }

//   try {
//     const channels = await threadController.getChannels(user.access_token); // Replace with actual function
//     const channelOptions = channels.map((ch, idx) => ({
//       text: ch.name,
//       callback_data: `channel_${ch.id}`,
//     }));

//     // Send inline keyboard with channels for selection
//     bot.sendMessage(chatId, "Select channels:", {
//       reply_markup: {
//         inline_keyboard: [channelOptions],
//       },
//     });
//   } catch (error) {
//     bot.sendMessage(chatId, "Failed to fetch channels.");
//   }
// });

// // 6. Start and Stop autopost commands
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
//     const chatId = msg.chat.id;

//     if (trackedChannels.has(String(chatId))) {
//       // Check if the message has a photo
//       if (msg.photo) {
//         const fileId = msg.photo[msg.photo.length - 1].file_id;
//         const caption = msg.caption || "";

//         // Get image URL and send it to Threads with caption if available
//         const fileUrl = await bot.getFileLink(fileId);
//         await postToThreads(fileUrl, caption);
//       } else if (msg.text) {
//         // Only caption message
//         const captionId = Date.now().toString(); // Unique ID for the caption
//         pendingCaptions[captionId] = msg.text;
//         bot.sendMessage(
//           chatId,
//           `Received caption: "${msg.text}".\nType /post${captionId} to post it to Threads or view all pending captions with /pendingcaption.`
//         );
//       }
//     }
//   });

//   // Helper function to post image or caption to Threads
//   async function postToThreads(fileUrl, caption) {
//     try {
//       const response = await threadController.postToThreads({
//         content: caption,
//         imageUrl: fileUrl,
//       });
//       console.log("Posted to Threads successfully:", response.data);
//     } catch (error) {
//       console.error("Failed to post to Threads:", error);
//     }
//   }

// module.exports = bot;
