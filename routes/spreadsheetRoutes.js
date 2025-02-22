// routes/spreadsheetRoutes.js

const express = require("express");
const router = express.Router();
const addDataToGoogleSheets = require("../controllers/addDataToGoogleSheets");

router.post("/posts", (req, res) =>
    addDataToGoogleSheets.addDataToGoogleSheets(req, res, req.bot)
);


module.exports = router;
