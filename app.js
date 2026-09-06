require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');
const connectDB = require('./config/db');
const passport = require('./config/passport');
const { setUserLocals } = require('./middlewares/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

// Catch uncaught exceptions to keep the server running cleanly
process.on('uncaughtException', (err) => {
  if (err && err.message && (err.message.includes('SSL') || err.message.includes('connect'))) {
    console.warn('Network Notice (MongoDB Atlas IP whitelist required for database access):', err.message);
  } else {
    console.error('Uncaught Exception:', err);
  }
});

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Body Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Store Configuration - Safely bound to active Mongoose connection
let sessionStore;
try {
  sessionStore = MongoStore.create({
    clientPromise: new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        return resolve(mongoose.connection.getClient());
      }
      mongoose.connection.once('connected', () => {
        resolve(mongoose.connection.getClient());
      });
    }),
    dbName: 'womens-pg',
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60
  });
} catch (err) {
  console.warn('MemoryStore fallback active for sessions.');
  sessionStore = new session.MemoryStore();
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'womens_pg_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Initialize Passport (without passport.session() since OAuth uses session: false)
app.use(passport.initialize());

// Set user locals for EJS templates globally
app.use(setUserLocals);

// View Engine & Static Assets Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Mount Application Routes
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', tenantRoutes);

// Root Route Redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (req.session.user.role === 'tenant') {
      return res.redirect('/dashboard');
    }
  }
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

module.exports = app;
