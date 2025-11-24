const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const { isLoggedIn, isAdmin } = require('../middlewares/auth');
const User = require('../models/User');

router.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.session.user });
});

router.get('/login', (req, res) => {
  res.render('user-login', {
    title: 'Sign In',
    error: req.query.error || null
  });
});

router.get('/register', (req, res) => {
  res.render('user-register', {
    title: 'Sign up',
    error: req.query.error || null
  });
});

router.get('/profile', async (req, res) => {
  const user = await User.findById(req.session.user.id);

  res.render('user-update', {
    title: 'Profile',
    error: req.query.error || null,
    user: user.toJSON()
  });
});


router.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.session.user });
});

router.get('/flight-search', async (req, res) => {
  try {
    res.render('flight-search', {
      title: 'Flight Search',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reservation', isLoggedIn, async (req, res) => {
  try {
    const flightId = req.query.flightId;
    let flight = await Flight.findById(flightId).lean();
    res.render('reservation', {
      title: 'Reservation',
      flight,
      user: req.session.user
    });

  } catch (err) {
    next(err);
  }
});



router.get('/reservation-list', isLoggedIn, async (req, res) => {
  try {
    res.render('reservation-list', {
      title: 'Reservation List',
      user: req.session.user
    });

  } catch (err) {
    next(err);
  }
});

router.get('/admin-flights', isAdmin, async (req, res) => {
  try {

    res.render('admin-flights', {
      title: 'Admin Panel - Flights',
      user: req.session.user,
    });

  } catch (err) {
   next(err);
  }
});

router.get('/admin-users', isAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();

    // Format birthdate for each user
    const formattedUsers = users.map(u => ({
      ...u,
      birthdateFormatted: u.birthdate ? u.birthdate.toISOString().split('T')[0] : ''
    }));

    res.render('admin-users', { title: 'Admin Panel - Users', users: formattedUsers });
  } catch (err) {
   next(err);
  }
});


module.exports = router;
