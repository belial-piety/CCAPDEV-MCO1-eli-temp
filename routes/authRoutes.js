const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Account Registration ------------------------------------------------------------------------------------------------
// body = {firstName, lastName, birthdate, gender, email, phoneNumber, password}
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, birthdate, gender, email, phoneNumber, password } = req.body;

    if (!firstName || !lastName || !birthdate || !gender || !email || !phoneNumber || !password) {
      return res.redirect('/register?error=Missing required user information');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.redirect('/register?error=Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      birthdate,
      gender,
      email: email.toLowerCase(),
      phoneNumber,
      password: hashedPassword
    });

    await newUser.save();

    // Save user info in session
    req.session.newUser = {
      role: newUser.role,
      id: newUser._id,
      username: newUser.firstName,
    };

    res.redirect('/');

  } catch (err) {
    next(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Account Login -------------------------------------------------------------------------------------------------------
// body = {email, password}
router.post('/login', async (req, res) => {
  try {
    // get inputs from user
    const email = (req.body.email || req.query.email || "").toLowerCase();
    const password = req.body.password || req.query.password;
    
    // if input fields are empty, place error
    if (!email) return res.redirect('/login?error=Enter email');
    if (!password) return res.redirect('/login?error=Enter password');

    //initialize log in attempts storage
    if (!req.session.loginAttempts) req.session.loginAttempts = {};

    // create entry for the specific email
    // if email does not have attempt record yet, place count and lockedUntil
    if (!req.session.loginAttempts[email]) {
      req.session.loginAttempts[email] = { count: 0, lockedUntil: null };
    }
    
    // initialize attempts 
    const attempt = req.session.loginAttempts[email];

    //check if the email has culminate 3 wrong attempts
    // if yes, lock login for 3 minutes
    if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
      const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      return res.redirect(`/login?error=Too many attempts. Try again in ${remaining} seconds`);
    }

    //find user using email
    const user = await User.findOne({ email });

    // if user doesnt exist 
    // add to count or lock the attempt
    if (!user) {
      attempt.count++;
      if (attempt.count >= 3) {
        attempt.lockedUntil = Date.now() + 3 * 60 * 1000;
        attempt.count = 0;
      }
      return res.redirect('/login?error=User Not Found');
    }

    //if user exist check password to match
    // if not add to count or lock the attempt 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      attempt.count++;
      if (attempt.count >= 3) {
        attempt.lockedUntil = Date.now() + 3 * 60 * 1000;
        attempt.count = 0;
      }
      return res.redirect('/login?error=Incorrect password');
    }

    attempt.count = 0;
    attempt.lockedUntil = null;

    req.session.user = {
      role: user.role,
      id: user._id,
      username: user.firstName,
    };

    res.redirect('/');
  } catch (err) {
    next(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Account Logout ------------------------------------------------------------------------------------------------------
// body = {}
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) next(err);
    res.redirect('/login');
  });
});

module.exports = router;
