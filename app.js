require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors'); // Ensure cors is required correctly

// Import Contact-related logic and utilities from the package
const { ContactModel, filterContacts, sortContacts, Pager } = require('@jworkman-fs/asl');

const app = express();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(cors()); // Allow CORS for testing and cross-origin requests

// Routing to contacts endpoint
app.use('/v1/contacts', require('./routes/contacts'));

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

// Starting the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});