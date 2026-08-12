const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const complaintsRouter = require('./routes/complaints');
const adminRouter = require('./routes/admin');
const officerRouter = require('./routes/officer');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// setup CSRF protection endpoint (token returned for forms)
const csrfProtection = csurf({ cookie: true });
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({
    project: 'Smart Public Grievance Management System',
    version: '1.0.0',
    status: 'Backend Running'
  });
});

app.use('/api/complaints', complaintsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/officer', officerRouter);

module.exports = app;