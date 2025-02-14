const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

// router.post("/register", authController.register);
// router.post("/login", authController.login);
// // router.get('/auth', authController.startOAuth);
// // router.get('/auth/callback', authController.handleOAuthCallback);
// // router.get('/callback', authController.callback);
// // app.use('/callback', authController.callback);
// // app.use('/accesstoken', authController.getAccessToken);

// // Define routes for OAuth
// // router.get('/auth', authController.getAuthorizationUrl);
// router.get("/auth", authController.startOAuth);
// router.get("/auth/callback", authController.handleCallback);
// router.post("/save-chatid", authController.saveChatId);

// updated routes with the bot passed

// Pass req.bot to the controller functions
router.post("/register", (req, res) =>
  authController.register(req, res, req.bot)
);
router.post("/login", (req, res) => authController.login(req, res, req.bot));

// router.get("/genreftoken", (req, res) => authController.genreftoken(req, res, req.bot));
router.get("/auth", (req, res) => authController.startOAuth(req, res, req.bot));
router.get("/auth/callback", (req, res) =>
  authController.handleCallback(req, res, req.bot)
);
router.post("/save-chatid", (req, res) =>
  authController.saveChatId(req, res, req.bot)
);
router.post("/updateTags", (req, res) =>
  authController.updateTags(req, res, req.bot)
);

module.exports = router;
