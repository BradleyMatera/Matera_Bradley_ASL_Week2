const express = require('express');
const router = express.Router();
const { filterContacts, sortContacts, Pager } = require('@jworkman-fs/asl');
const Contact = require('../models/Contact'); // Mongoose model

// Get all contacts with filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    let contacts = await Contact.find();  // Fetch all contacts from MongoDB

    // Filtering
    const filterBy = req.get('X-Filter-By');
    const filterOperator = req.get('X-Filter-Operator');
    const filterValue = req.get('X-Filter-Value');
    if (filterBy && filterOperator && filterValue) {
      contacts = filterContacts(contacts, filterBy, filterOperator, filterValue);
    }

    // Sorting
    const sortBy = req.query.sort || 'lname';
    const direction = req.query.direction || 'asc';
    contacts = sortContacts(contacts, sortBy, direction);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const pager = new Pager(contacts, page, limit);

    const paginatedResults = pager.results(); // Get the paginated results
    const totalResults = contacts.length; // Total number of contacts before pagination

    // Set headers for pagination
    res.set('X-Page-Total', totalResults);
    res.set('X-Page-Next', pager.next());
    res.set('X-Page-Prev', pager.prev());

    // Send the paginated contacts as the response
    res.json(paginatedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new contact
router.post('/', async (req, res) => {
  try {
    validateContact(req.body);
    const newContact = new ContactModel(req.body);
    await newContact.save();
    res.status(201).location(`/v1/contacts/${newContact._id}`).json(newContact);
  } catch (e) {
    if (e instanceof DuplicateContactResourceError) {
      return res.status(400).json({ message: e.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred.' });
  }
});

// Get a specific contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await ContactModel.findById(req.params.id);
    if (!contact) throw new ContactNotFoundError();
    res.json(contact);
  } catch (e) {
    if (e instanceof ContactNotFoundError) {
      res.status(404).json({ message: 'Contact not found' });
    } else {
      res.status(500).json({ error: 'Error fetching contact' });
    }
  }
});

// Update a specific contact by ID
router.put('/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    const contactData = req.body;

    // Validate contact data
    try {
      validateContact(contactData);
    } catch (error) {
      if (error instanceof InvalidContactError) {
        return res.status(400).json({ message: `An error has occurred: ${error.message}` });
      }
      throw error;
    }

    const contact = await ContactModel.findById(contactId);
    if (!contact) throw new ContactNotFoundError();

    // Update contact
    Object.assign(contact, contactData);
    await contact.save();

    res.status(303).location(`/v1/contacts/${contactId}`).send();
  } catch (error) {
    if (error instanceof ContactNotFoundError) {
      res.status(404).json({ message: 'Contact not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete a specific contact by ID
router.delete('/:id', async (req, res) => {
  try {
    const contact = await ContactModel.findByIdAndDelete(req.params.id);
    if (!contact) throw new ContactNotFoundError();
    res.status(204).send();
  } catch (e) {
    if (e instanceof ContactNotFoundError) {
      res.status(404).json({ message: 'Contact not found' });
    } else {
      res.status(500).json({ error: 'Error deleting contact' });
    }
  }
});

module.exports = router;