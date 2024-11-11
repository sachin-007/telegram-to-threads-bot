// Import required dependencies
const express = require('express');
const logActivity = require('../models/logActivity');
const router = express.Router();

// Endpoint to handle notifications from Microsoft Graph API
router.all('/notification', async (req, res) => {
    // Check for Microsoft Graph API validation token
    if (req.query.validationToken) {
        // Respond with the validation token to confirm webhook setup
        return res.status(200).send(req.query.validationToken);
    }

    // Handle incoming notifications
    if (req.body && req.body.value) {
        const notifications = req.body.value;
        notifications.forEach(notification => {
            logActivity('Received webhook notification:', notification);
            // Additional processing for each notification can be added here
        });
        return res.status(200).json({ status: 'Notification processed' });
    } else {
        return res.status(400).json({ status: 'No notifications found' });
    }
});

// Export the router to use in your main application
module.exports = router;
