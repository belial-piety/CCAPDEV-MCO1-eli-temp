const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { isAdmin, isLoggedIn } = require('../middlewares/auth');
const Booking = require('../models/Booking');

router.post('/admin/update-user/:userId', isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const {firstName, lastName, birthdate, gender, email, phoneNumber, role } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if email already exists (exclude current user)
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(400).json({ error: "Email already in use" });
    }

    // Validate birthdate
    if (birthdate && new Date(birthdate) > new Date()) {
      return res.status(400).json({ error: 'Birthdate must be in the past' });
    }

    // Update only the fields that are provided
    const updateData = { firstName, lastName, birthdate, gender, email, phoneNumber, role };
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    await User.findByIdAndUpdate(userId, updateData);

    res.redirect('/admin-users');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Admin: Delete user
router.post('/admin/delete-user/:userId', isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.deleteOne();

    res.redirect('/admin-users');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while deleting user');
  }
});

// Update User Info
router.post('/update-user', isLoggedIn, async (req, res) => {
  try {
    const { firstName, lastName, birthdate, gender, email, phoneNumber, password, role} = req.body;
    const userId = req.session.user.id;

    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Hash password and salt if updated
    const hashedPassword = password?.trim() ? await bcrypt.hash(password, 10) : user.password;

    // Only update provided fields
    const updateData = { password: hashedPassword };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (birthdate) updateData.birthdate = birthdate;
    if (gender) updateData.gender = gender;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (role) updateData.role = role;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    // Update session
    req.session.user = {
      role: updatedUser.role,
      id: updatedUser._id,
      username: updatedUser.firstName,
    };

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error in updating");
  }
});

router.get('/partial/admin/search-item/:userId', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const userData = user.toObject({ getters: true, virtuals: false });

    res.render('partials/display-user', {
      layout: false,
      user: userData
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/partial/user-details-modal/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    
    res.render('partials/modal-user-details', {
      user,
      layout: false
    }, (err, html) => {
      if (err) return res.status(500).send(err.message);
      res.send(html);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/get-users', async (req, res) => {
  try {
    const users = await User.find().lean();
    return res.json({ users });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
