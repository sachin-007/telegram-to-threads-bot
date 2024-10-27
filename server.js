// // server.js or app.js

// const express = require('express');
// const dotenv = require('dotenv');
// const routes = require('./routes');
// const fs = require('fs');
// const path = require('path');
// const logActivity = require('./logsys'); // Import the logger

// dotenv.config(); // Load environment variables

// const app = express();

// // Middleware and Routes
// app.use(express.json());
// app.use('/api', routes); // Define API routes

// // Error Handling Middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something went wrong!');
// });

// // Starting server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     logActivity(`Server running on port ${PORT}`);
// });





const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const fs = require('fs');
const path = require('path');
const logActivity = require('./logActivity');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/telegram', telegramRoutes);

// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logActivity(`Server running on port ${PORT}`);
});
