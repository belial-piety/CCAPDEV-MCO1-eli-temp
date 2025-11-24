const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const dayjs = require('dayjs')


// Routes
const bookingRoutes = require('./routes/bookingRoutes');
const flightRoutes = require('./routes/flightRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');

const app = express();
const port = 3000;

// Database Connection -------------------------------------------------------------------------------------------------
const databaseName = "CCAPDEV_MONGODB-main";
mongoose.connect(`mongodb://localhost:27017/${databaseName}`)
  .then(() => console.log("MongoDB: Successfully connected"))
  .catch(err => console.error("MongoDB: Failed to connect", err));


// Session Setup -------------------------------------------------------------------------------------------------------
app.use(session({
  secret: 'my_super_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Middleware ----------------------------------------------------------------------------------------------------------
// Enable CORS
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user info available in all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === 'admin';
  next();
});


// View Engine Setup ---------------------------------------------------------------------------------------------------
const enginePartials = [
  path.join(__dirname, 'views', 'partials'),
  path.join(__dirname, 'views', 'partials/forms'),
  path.join(__dirname, 'views', 'partials/layout'),
];

const engineHelpers = {
  neq: (a, b) => a !== b,
  eq: (a, b) => a === b,
  array: context => Array.isArray(context) ? context : [context],
  formatDate: function (date, format) {
    // Default format
    const defaultFormat = "MMM D, YYYY hh:mm A";

    // If format is not a string, use default
    if (typeof format !== 'string') format = defaultFormat;

    // Ensure date is a valid Date object
    if (!date) return 'N/A';
    if (!(date instanceof Date)) date = new Date(date);
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Format with Day.js
    return dayjs(date).format(format);
  },
  json: (context) => JSON.stringify(context),
  and: (a, b) => a && b,
  containsName: (arr, name) => {
    if (!arr) return false;
    return arr.some(o => o.name === name);
  },
  getPrice: (arr, name, defaultPrice) => {
    if (!arr) return defaultPrice;
    const item = arr.find(o => o.name === name);
    return item ? item.price : defaultPrice;
  },
  selectMatch: (a, b) => (a == b ? 'selected' : ''),
  ifEquals : (a, b, options) => {
  return (a === b) ? options.fn(this) : options.inverse(this);
}
};


app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: enginePartials,
  helpers: engineHelpers,
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ---------------- Logging ----------------
const { logUserAction, logError } = require('./middlewares/logger'); 
app.use(logUserAction); // logs all user/admin/anonymous activity

// Routes --------------------------------------------------------------------------------------------------------------
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/', pageRoutes);

// ---------------- Error Logging ----------------
app.use(logError); // log uncaught errors after all routes

// Start Server --------------------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
  console.log("SERVER STARTED FROM:", __dirname);
});

