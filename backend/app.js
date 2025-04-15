const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/invoices', invoiceRoutes);

// Fallback-Route
app.use('/', (req, res) => {
  res.send('ERP-System API');
});

// Fehlerbehandlung
app.use(errorHandler);

module.exports = app;

