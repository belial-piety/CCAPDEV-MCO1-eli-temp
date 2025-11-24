const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const User = require('../models/User');

const { loadUserById, loadFlightById } = require('../middlewares/utils');

// User/Admin: Create Booking ------------------------------------------------------------------------------------------
// body = {userId, flightId, passengers}
router.post('/create-booking', loadUserById, loadFlightById, async (req, res) => {
  try {

    const { user, flight } = req;
    const { passengers } = req.body;

    if (!passengers || passengers.length === 0) {
      return res.status(400).json({ error: "Passengers required" });
    }

    // Create booking
    const booking = new Booking({
      user: user._id,
      flight: flight._id,
      passengers,
      status: 'confirmed',
      totalPrice: 0,
    });

    // Calculate price
    const price = await booking.calculatePrice();
    booking.totalPrice = price;
    // Book the seats on the flight
    //booking object is passed as an argument to bookSeats method from flight schema
    await flight.bookSeats(booking);
    // Save the booking
    await booking.save();
    
    //CHANGE AS OF 11/21/2025
    //redirect user to the flight reservation page
    res.redirect('/reservation-list');

  } catch (err) {
    next(err);
  }
});

// User/Admin: Update Booking ------------------------------------------------------------------------------------------
// body = {bookingId, passengers}
router.post('/update-booking/:bookingId', async (req, res) => {
  try {

    const booking = await Booking.findById(req.params.bookingId);

    const { passengers } = req.body;

    if (!passengers || passengers.length === 0) {
      return res.status(400).json({ error: "Passengers required" });
    }

    console.log(passengers)

    // Update passenger details
    await booking.setPassengers(passengers);
    res.redirect('/reservation-list');

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// User/Admin: Cancel Booking ------------------------------------------------------------------------------------------
// body = {bookingId}
router.post('/cancel-booking/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    await booking.cancel();
    res.redirect('/reservation-list');

  } catch (err) {
   next(err);
  }
});

// Get Bookings by User ------------------------------------------------------------------------------------------------
// query = {userId}
router.get('/user-bookings', async (req, res) => {
  try {
    const userId = req.query.userId;
    const user = User.findById(userId);
    const bookings = await Booking.find({ user: userId }).lean();

    res.json({ bookings });

  } catch (err) {
    next(err);
  }
});



router.get('/partial/booking-display/:bookingId', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    if (!bookingId) return res.status(400).json({ error: "Booking ID required" });
    
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    
    const flight = await Flight.findById(booking.flight);
    if (!flight) return res.status(404).json({ error: "Flight not found" });
    
    const flightData = flight.toObject();
    flightData.duration = flight.getDuration();
    
    
    const bookingData = booking.toObject();
    const partialParams = {
      flight: flightData,
      layout: false,
      
      buttonLabel: "Details",
      buttonModal: true,
      modalName: "detailsModal",
      
      booking: bookingData,
    }
    
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fetchRes = await fetch(`${baseUrl}/api/bookings/partial/booking-display-modal?bookingId=${bookingId}`);
    const detailsModal = await fetchRes.text();
    
    
    res.render('partials/display-flight', partialParams, (err, html) => {
      if (err) return res.status(500).send(err.message);
      res.send(html + detailsModal);
    });

  } catch (err) {
    next(err);
  }
});


router.get('/partial/booking-display-modal', async (req, res) => {
  try {

    const bookingId = req.query.bookingId;
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId).lean();
      if (!booking) return res.status(404).json({ error: "Booking not found" });
    }

    const flight = await Flight.findById(booking.flight).populate('aircraft');
    if (!flight) return res.status(404).json({ error: "Flight not found" });

    const flightData = flight.toObject();

    res.render('partials/modal-booking-details', {
      layout: false,
      booking,
      flight: flightData
    }, (err, html) => {
      if (err) return res.status(500).send(err.message);
      res.send(html);
    });

  } catch (err) {
   next(err);
  }
});

module.exports = router;
