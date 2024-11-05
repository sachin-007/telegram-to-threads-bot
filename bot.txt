// bot.js
const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Function to post to Threads API
const postToThreads = async (imageUrl, caption) => {
  try {
    const response = await axios.post(
      'https://threads.api.meta.com/v1/posts',  // Example API endpoint for Threads
      {
        caption: caption,
        media: [{ url: imageUrl, type: 'image' }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.THREADS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Successfully posted to Threads:', response.data);
  } catch (error) {
    console.error('Error posting to Threads:', error.response ? error.response.data : error.message);
  }
};

// Listen for messages in the group
bot.on('message', async (ctx) => {
  if (ctx.message.photo) {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const caption = ctx.message.caption || '';

    console.log('Image URL:', fileUrl.href);
    console.log('Caption:', caption);

    // Post to Threads
    await postToThreads(fileUrl.href, caption);
  } else if (ctx.message.text) {
    const caption = ctx.message.text;

    console.log('Text message:', caption);

    // Post to Threads
    await postToThreads(null, caption); // Posting text-only if there's no image
  }
});

// Start the bot
bot.launch()
  .then(() => console.log('Bot started'))
  .catch((error) => console.error('Failed to start bot:', error));
