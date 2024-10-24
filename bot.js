// bot.js
const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Listen for messages in the group
bot.on('message', async (ctx) => {
  if (ctx.message.photo) {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const caption = ctx.message.caption || '';

    // Log for testing
    console.log('Image URL:', fileUrl.href);
    console.log('Caption:', caption);

    // Post to Threads
    await postToThreads(fileUrl.href, caption);
  }
});

// Start the bot
bot.launch();
