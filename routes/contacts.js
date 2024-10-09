const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// Get all contacts with the correct schema mapping
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find();

    // Map _id to id in the response
    const formattedContacts = contacts.map(contact => ({
      id: contact._id,  // Use _id as id in the response
      fname: contact.fname,
      lname: contact.lname,
      email: contact.email,
      phone: contact.phone,
      birthday: contact.birthday,
    }));

    res.json(formattedContacts);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching contacts' });
  }
});

// Get a single contact by ID
router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({
      id: contact._id,
      fname: contact.fname,
      lname: contact.lname,
      email: contact.email,
      phone: contact.phone,
      birthday: contact.birthday,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching contact' });
  }
});

// Create a new contact
router.post('/contacts', async (req, res) => {
  try {
    const { fname, lname, email, phone, birthday } = req.body;

    const newContact = new Contact({ fname, lname, email, phone, birthday });
    await newContact.save();

    res.status(303).redirect(`/contacts/${newContact._id}`);
  } catch (err) {
    if (err.code === 11000) { // Duplicate email
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ error: 'Error creating contact' });
  }
});

// Update a contact by ID
router.put('/contacts/:id', async (req, res) => {
  try {
    const { fname, lname, email, phone, birthday } = req.body;

    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, { fname, lname, email, phone, birthday }, { new: true });
    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(303).redirect(`/contacts/${updatedContact._id}`);
  } catch (err) {
    res.status(500).json({ error: 'Error updating contact' });
  }
});

// Delete a contact by ID
router.delete('/contacts/:id', async (req, res) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(deletedContact);
  } catch (err) {
    res.status(500).json({ error: 'Error deleting contact' });
  }
});

module.exports = router;