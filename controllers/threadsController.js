// controllers/threadController.js
const axios = require("axios");

async function postToThreads({ content, imageUrl }) {
  try {
    const response = await axios.post(
      "https://graph.threads.net/v1/posts", // Replace with the correct Threads API endpoint
      {
        content,
        media: imageUrl ? [{ media_type: "IMAGE", media_url: imageUrl }] : [],
      },
      {
        headers: {
          Authorization: `Bearer THQWJXVlh3ZA0wtbkRlVUxTejFRMkdkQS0xN3J1TjVld3RxamF4cGtocDNWanFNUGNTY09tRnhKdV81bmIxZAVFVaXd6Qkc5eVpJWmNvQl9vcjYtSlNZANHZAXSFF5a25jZAFRNcVNGcGxNLWxnakhQc1VIZAW5sUENienM1OUtDSGRWZATFSZAExuRUY2OTJpb2ZAqdURkakEZD`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error posting to Threads:",
      error.response?.data || error.message
    );
    throw new Error("Failed to post to Threads.");
  }
}

module.exports = { postToThreads };

// const axios = require("axios");
// const AdminUser = require("../models/adminUser");

// // exports.postToThreads = async (req, res) => {
// //   const { image, caption } = req.body;
// //   const admin = await AdminUser.findOne({ username: "admin" });

// //   try {
// //     const response = await axios.post(`https://api.threads.net/v1/post`, {
// //       app_id: process.env.THREAD_APP_ID,
// //       image,
// //       caption
// //     }, {
// //       headers: {
// //         Authorization: `Bearer ${admin.access_token}`
// //       }
// //     });

// //     res.status(200).json({ message: 'Posted to Threads', data: response.data });
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // };

// function getAuthUrl(clientId) {
//   const scope = [
//     "threads_basic",
//     "threads_content_publish",
//     "threads_manage_insights",
//     "threads_manage_replies",
//     "threads_read_replies",
//   ].join(",");

//   return `https://www.threads.net/oauth/authorize/?client_id=${clientId}&redirect_uri=${encodeURIComponent(
//     process.env.REDIRECT_URI
//   )}&response_type=code&scope=${encodeURIComponent(scope)}`;
// }

// async function exchangeCodeForToken(clientId, clientSecret, code) {
//   try {
//     const response = await axios.post(
//       "https://graph.threads.net/oauth/access_token",
//       null,
//       {
//         params: {
//           client_id: clientId,
//           client_secret: clientSecret,
//           grant_type: "authorization_code",
//           redirect_uri: process.env.REDIRECT_URI,
//           code,
//         },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error(
//       "Error exchanging code for token:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to exchange code for token.");
//   }
// }

// // Fetch channels
// async function getChannels(accessToken) {
//   try {
//     const response = await axios.get("https://graph.threads.net/v1/channels", {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });
//     return response.data.data; // Assume the channels are in data array
//   } catch (error) {
//     console.error(
//       "Error fetching channels:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to fetch channels.");
//   }
// }

// // Post content to Threads
// async function postToThreads(accessToken, content) {
//   try {
//     const response = await axios.post(
//       "https://graph.threads.net/v1/posts", // Replace with actual endpoint
//       { content },
//       {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error(
//       "Error posting to Threads:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to post to Threads.");
//   }
// }

// module.exports = {
//   getAuthUrl,
//   exchangeCodeForToken,
//   getChannels,
//   postToThreads,
// };
