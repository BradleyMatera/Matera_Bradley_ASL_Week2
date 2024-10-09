const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Pager, sortContacts, filterContacts } = require('@jworkman-fs/asl');
const contactRoutes = require('./routes/contacts');

const app = express();

// Middleware
app.use(bodyParser.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contactsDB';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

// Filtering middleware
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

// Sorting middleware
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

// Pagination middleware
app.use((req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 10;

  if (req.sortedContacts) {
    const pager = new Pager(req.sortedContacts, page, size);
    
    // Set pagination headers
    res.set('X-Page-Total', pager.total());
    res.set('X-Page-Next', pager.next());
    res.set('X-Page-Prev', pager.prev());

    req.paginatedContacts = pager.results();
  }
  next();
});

// Routes
app.use('/v1', contactRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});