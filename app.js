const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const {
  ContactModel,
  Pager,
  sortContacts,
  filterContacts,
  InvalidContactError,
  ContactNotFoundError,
  DuplicateContactResourceError
} = require('@jworkman-fs/asl');

const app = express();

// Middleware
app.use(bodyParser.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contactsDB';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

// Define the Contact schema and model
const contactSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  birthday: { type: Date, required: true },
});
const Contact = mongoose.model('Contact', contactSchema);

// Filtering, Sorting, and Pagination Middleware

// Filter contacts based on custom headers
app.use((req, res, next) => {
  const filterBy = req.get('X-Filter-By');
  const filterOperator = req.get('X-Filter-Operator');
  const filterValue = req.get('X-Filter-Value');

  if (filterBy && filterOperator && filterValue) {
    Contact.find()
      .then((contacts) => {
        req.filteredContacts = filterContacts(contacts, filterBy, filterOperator, filterValue);
        next();
      })
      .catch(err => res.status(500).json({ error: 'Error fetching contacts for filtering' }));
  } else {
    next();
  }
});

// Sorting Middleware
app.use((req, res, next) => {
  const sortBy = req.query.sort || 'lname';
  const sortDirection = req.query.direction || 'asc';
  
  if (req.filteredContacts) {
    req.sortedContacts = sortContacts(req.filteredContacts, sortBy, sortDirection);
  } else {
    Contact.find()
      .then((contacts) => {
        req.sortedContacts = sortContacts(contacts, sortBy, sortDirection);
        next();
      })
      .catch(err => res.status(500).json({ error: 'Error fetching contacts for sorting' }));
  }
  next();
});

// Pagination Middleware
app.use((req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 10;
  
  const pager = new Pager(req.sortedContacts, page, size);
  
  res.set('X-Page-Total', pager.total());
  res.set('X-Page-Next', pager.next());
  res.set('X-Page-Prev', pager.prev());
  
  req.paginatedContacts = pager.results();
  next();
});

// Get all contacts with filtering, sorting, and pagination
app.get('/contacts', async (req, res) => {
  try {
    // Apply filtering logic if headers are provided
    const filterBy = req.get('X-Filter-By');
    const filterOperator = req.get('X-Filter-Operator');
    const filterValue = req.get('X-Filter-Value');

    let filters = {};
    if (filterBy && filterOperator && filterValue) {
      if (filterOperator === 'gte') {
        filters[filterBy] = { $gte: new Date(filterValue) };
      } else if (filterOperator === 'eq') {
        filters[filterBy] = filterValue;
      } else {
        return res.status(400).json({ error: 'Invalid filter operator' });
      }
    }

    // Get the contacts based on filters
    const contacts = await Contact.find(filters).sort({ [req.query.sort || 'lname']: req.query.direction === 'asc' ? 1 : -1 });

    const totalContacts = contacts.length;
    const pageSize = Number(req.query.size) || 10;

    // Check if there are no contacts
    if (totalContacts === 0) {
      return res.status(200).json({
        contacts: [],
        pagination: {
          totalPages: 0,
          totalContacts: 0,
          currentPage: 1
        }
      });
    }

    const totalPages = Math.ceil(totalContacts / pageSize);
    const requestedPage = Number(req.query.page) || 1;

    // Ensure requested page is within valid range
    if (requestedPage < 1 || requestedPage > totalPages) {
      return res.status(416).json({ error: `Requested page ${requestedPage} is out of range. Any value of 1 through ${totalPages} is allowed.` });
    }

    // Paginate the contacts
    const pager = new Pager(contacts, requestedPage, pageSize);

    res.set('X-Page-Total', pager.total());
    res.set('X-Page-Next', pager.next());
    res.set('X-Page-Prev', pager.prev());

    res.json({
      contacts: pager.results(),
      pagination: {
        totalPages,
        totalContacts,
        currentPage: requestedPage
      }
    });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Error fetching contacts' });
  }
});

// Get a specific contact by ID
app.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      throw new ContactNotFoundError();
    }
    res.json(contact);
  } catch (err) {
    if (err instanceof ContactNotFoundError) {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Error fetching contact' });
    }
  }
});

// Create a new contact
app.post('/contacts', async (req, res) => {
  try {
    const { fname, lname, email, birthday } = req.body;
    ContactModel.validate({ fname, lname, email, birthday });
    const newContact = new Contact({ fname, lname, email, birthday });
    await newContact.save();
    res.status(303).redirect(`/contacts/${newContact._id}`);
  } catch (err) {
    if (err instanceof InvalidContactError || err instanceof DuplicateContactResourceError) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Error creating contact' });
    }
  }
});

// Update a specific contact by ID
app.put('/contacts/:id', async (req, res) => {
  try {
    const { fname, lname, email, birthday } = req.body;
    ContactModel.validate({ fname, lname, email, birthday });
    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, { fname, lname, email, birthday }, { new: true });
    if (!updatedContact) {
      throw new ContactNotFoundError();
    }
    res.status(303).redirect(`/contacts/${updatedContact._id}`);
  } catch (err) {
    if (err instanceof InvalidContactError || err instanceof ContactNotFoundError) {
      res.status(err instanceof ContactNotFoundError ? 404 : 400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Error updating contact' });
    }
  }
});

// Delete a specific contact by ID
app.delete('/contacts/:id', async (req, res) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      throw new ContactNotFoundError();
    }
    res.json(deletedContact);
  } catch (err) {
    res.status(err instanceof ContactNotFoundError ? 404 : 500).json({ message: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});