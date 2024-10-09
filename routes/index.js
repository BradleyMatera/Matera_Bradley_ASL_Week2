const express = require('express');
const router = express.Router();

// Root route to return a simple welcome message
router.get('/', (req, res) => {
  res.send('Welcome to the Contacts API');
});

module.exports = router;