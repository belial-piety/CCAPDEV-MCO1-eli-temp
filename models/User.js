const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
// User's first name
firstName: { type: String, required: true },

// User's last name
lastName: { type: String, required: true },

// User's date of birth
birthdate: { type: Date, required: true },

// User's gender
gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },

// User's email address
email: { type: String, required: true, unique: true },

// User's phone number
phoneNumber: { type: String },

// Password for login
password: { type: String, required: true },

// User role (customer or admin)
role: { type: String, enum: ['customer', 'admin'], default: 'customer' }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
