// logger.js
const fs = require('fs');
const path = require('path');
const LogActivity = require('./models/logActivity');
const logActivity = async (message, variable, userId) => {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFilePath = path.join(__dirname, 'logs', `${formattedDate}.log`);

    const logMessage = `${date.toISOString()}: ${message} | Value: ${JSON.stringify(variable)}\n`;

    // Log to file
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });

     // Log to database
     try {
        const logEntry = new LogActivity({
            userId, // Associate log with a specific user
            logMessage: `${message} | Value: ${JSON.stringify(variable)}`,
            timestamp: date,
        });
        await logEntry.save();
        console.log('Log activity saved to the database successfully.');
    } catch (error) {
        console.error('Error saving log activity to the database:', error);
    }
};

module.exports = logActivity;
