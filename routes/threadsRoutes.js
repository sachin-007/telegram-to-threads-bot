// routes/threadsRoutes.js

const express = require("express");
const router = express.Router();
const { createThreadPost } = require("../controllers/threadsController");
const authController = require("../controllers/authController");

// Route for creating a post on a thread
router.post("/post", authController.createThreadPost);

module.exports = router;
