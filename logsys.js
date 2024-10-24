// logger.js
const fs = require('fs');
const path = require('path');

const logActivity = (message, variable) => {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFilePath = path.join(__dirname, 'logs', `${formattedDate}.log`);

    const logMessage = `${date.toISOString()}: ${message} | Value: ${JSON.stringify(variable)}\n`;

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
};

module.exports = logActivity;
