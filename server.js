// server.js or app.js

const express = require('express');
const dotenv = require('dotenv');
const routes = require('./routes')

dotenv.config(); // Load environment variables

const app = express();

// Middleware and Routes
app.use(express.json());
app.use('/api', routes); // Define API routes

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});


// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
