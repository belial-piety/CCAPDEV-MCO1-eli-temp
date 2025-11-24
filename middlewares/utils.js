const bcrypt = require('bcrypt');

const User = require('../models/User');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Aircraft = require('../models/Aircraft');


async function loadUserById(req, res, next) {
  try {
    const userId = req.body.userId || req.query.userId || req.params.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

async function loadFlightById(req, res, next) {
  try {
    const flightId = (req.body && req.body.flightId) || req.query.flightId || req.params.flightId;
    if (!flightId) return res.status(400).json({ error: "Flight ID required" });

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ error: "Flight not found" });

    req.flight = flight;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}


async function loadAircraftById(req, res, next) {
  try {
    const aircraftId = req.body.aircraftId || req.query.aircraftId;
    if (!aircraftId) return res.status(400).json({ error: "Aircraft required" });

    const aircraft = await Aircraft.findById(aircraftId);
    if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

    req.aircraft = aircraft;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  loadUserById,
  loadFlightById,
  loadAircraftById,
};