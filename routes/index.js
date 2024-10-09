const express = require('express');
const router = express.Router();

// You can include a simple route for the root path if needed
router.get('/', (req, res) => {
  res.send('Welcome to the Contacts API');
});

module.exports = router;