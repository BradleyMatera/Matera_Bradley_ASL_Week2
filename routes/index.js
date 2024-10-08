const express = require('express');
const router = express.Router();

// Import the individual route handlers
const contactRoutes = require('./contacts');

// Mount the contact routes under the `/contacts` path
router.use('/contacts', contactRoutes);

// Export the router to be used in the main app file
module.exports = router;