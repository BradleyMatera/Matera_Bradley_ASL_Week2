const mongoose = require('mongoose');

// Define the Contact schema with the correct fields
const contactSchema = new mongoose.Schema({
  fname: { type: String, required: true },  // First name
  lname: { type: String, required: true },  // Last name
  email: { type: String, required: true, unique: true },  // Email must be unique
  phone: { type: String, required: true },  // Phone number
  birthday: { type: Date, required: true },  // Birthday
}, { versionKey: false });  // Disable __v field (optional)

// Export the Mongoose model
module.exports = mongoose.model('Contact', contactSchema);