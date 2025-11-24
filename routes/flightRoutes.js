const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Aircraft = require('../models/Aircraft');
const { isAdmin } = require('../middlewares/auth');
const { loadFlightById, loadAircraftById } = require('../middlewares/utils');


const mealOptionsTemplate = [
  { name: 'standard', price: 0 },
  { name: 'vegetarian', price: 0 },
  { name: 'kosher', price: 0 },
];

const baggageOptionsTemplate = [
  { name: '0kg', price: 0 },
  { name: '10kg', price: 20 },
  { name: '15kg', price: 25 },
  { name: '20kg', price: 30 },
];

// Helper Functions ----------------------------------------------------------------------------------------------------
function parseOptions(options, template) {
  return parsed = (options && options.length > 0)
    ? options.filter(opt => opt.enabled).map(opt => ({
      name: opt.name || template[0].name,
      price: Number(opt.price) || template[0].price
    }))
    : [template[0]];
}

// Admin: Create Flight ------------------------------------------------------------------------------------------------
// body = {flightNumber, airline, aircraftId, origin, destination, departure, arrival, price, mealOptions, baggageOptions}
router.post('/admin/create-flight', isAdmin, loadAircraftById, async (req, res) => {
  try {
    const { aircraft } = req;
    const { flightNumber, airline, origin, destination, departure, arrival, price, mealOptions = [], baggageOptions = [] } = req.body;

    if (!flightNumber || !airline || !origin || !destination || !departure || !arrival || !price) {
      return res.status(400).json({ error: 'Missing required flight information' });
    }

    if (origin === destination) {
      return res.status(400).json({ error: 'Locations must be different' });
    }

    if (new Date(departure) >= new Date(arrival)) {
      return res.status(400).json({ error: 'Departure must be before arrival' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    // Initialize availableSeats from aircraft seats
    const availableSeats = aircraft.seats.map(s => ({
      seatNumber: s.seatNumber,
      isBooked: false
    }));

    // Parse meal and baggage options
    const parsedMeals = parseOptions(mealOptions, mealOptionsTemplate);
    const parsedBaggage = parseOptions(baggageOptions, baggageOptionsTemplate);

    const flight = new Flight({
      flightNumber, airline,
      aircraft: aircraft._id,
      origin,
      destination,
      departure,
      arrival,
      price,
      availableSeats,
      mealOptions: parsedMeals,
      baggageOptions: parsedBaggage
    });
    await flight.save();

    res.redirect('/admin-flights');

  } catch (err) {
  next(err);
  }
});

// Admin: Update Flight ------------------------------------------------------------------------------------------------
// body = {flightId, flightNumber, airline, aircraftId, origin, destination, departure, arrival, price, mealOptions, baggageOptions}
router.post('/admin/update-flight/:flightId', isAdmin, loadFlightById, async (req, res) => {
  try {
    const { flight } = req;
    const {
      flightNumber, airline, aircraftId, origin, destination,
      departure, arrival, price, mealOptions = [], baggageOptions = []
    } = req.body;

    // Validate aircraft
    const newAircraft = await Aircraft.findById(aircraftId);
    if (newAircraft) {
      const sameSeats = await newAircraft.compareSeats(flight.aircraft._id);
      if (!sameSeats) {
        return res.status(400).json({ error: "Aircrafts must have same seats" });
      }
    }

    // Origin/Destination
    const newOrigin = origin?.trim() || flight.origin;
    const newDestination = destination?.trim() || flight.destination;
    if (newOrigin === newDestination) {
      return res.status(400).json({ error: "Origin cannot be the same as destination" });
    }

    // Departure/Arrival
    const newDeparture = departure || flight.departure;
    const newArrival = arrival || flight.arrival;
    if (new Date(newDeparture) >= new Date(newArrival)) {
      return res.status(400).json({ error: 'Departure must be before arrival' });
    }

    // Price
    const newPrice = price ?? flight.price;
    if (isNaN(newPrice) || newPrice < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    // Parse meal and baggage options
    const parsedMeals = mealOptions.length ? parseOptions(mealOptions, mealOptionsTemplate) : flight.mealOptions;
    const parsedBaggage = baggageOptions.length ? parseOptions(baggageOptions, baggageOptionsTemplate) : flight.baggageOptions;

    // Update flight document
    flight.flightNumber = flightNumber ?? flight.flightNumber;
    flight.airline = airline ?? flight.airline;
    flight.aircraft = newAircraft ?? flight.aircraft;
    flight.origin = newOrigin;
    flight.destination = newDestination;
    flight.departure = newDeparture;
    flight.arrival = newArrival;
    flight.price = newPrice;
    flight.mealOptions = parsedMeals;
    flight.baggageOptions = parsedBaggage;

    await flight.save();

    // Recalculate booking prices if relevant fields changed
    const priceChanged =
      newPrice !== flight.price ||
      JSON.stringify(parsedMeals) !== JSON.stringify(flight.mealOptions) ||
      JSON.stringify(parsedBaggage) !== JSON.stringify(flight.baggageOptions);

    if (priceChanged) {
      const bookings = await flight.getBookings(false);
      for (const b of bookings) {
        await b.calculatePrice(true);
      }
    }

    res.redirect('/admin-flights');

  } catch (err) {
   next(err);
  }
});


// Admin: Cancel Flight
// body = {flightId}
router.post('/admin/cancel-flight/:flightId', isAdmin, loadFlightById, async (req, res) => {
  try {
    const { flight } = req;

    await flight.cancel();
    res.redirect('/admin-flights');

  } catch (err) {
   next(err);
  }
});

// Get All Flights -----------------------------------------------------------------------------------------------------
router.get('/get-all', async (req, res) => {
  try {
    const filter = {}
    if (req.query.scheduled === 'true') {
      filter.status = 'scheduled';
    }
    const flights = await Flight.find(filter).lean();
    res.json({ flights });

  } catch (err) {
  next(err);
  }
});

router.get('/get-flight/:flightNumber', async (req, res) => {
  try {
    const flightNumber = req.params.flightNumber;
    if (!flightNumber) {return res.status(400).json({ error: 'Flight number required' })};
    const flight = await Flight.findOne({flightNumber: flightNumber});
    if (!flight) {return};
    console.log("bbbb")
    const flightData = flight.toObject()
    res.json(flightData);

  } catch (err) {
  next(err);
  }
});


router.get('/partial/flight-display/:flightId', async (req, res) => {
  try {
    const flightId = req.params.flightId;
    if (!flightId) return res.status(400).json({ error: "Flight ID required" });

    const flight = await Flight.findById(flightId).populate('aircraft');
    if (!flight) return res.status(404).json({ error: "Flight not found" });

    const flightData = flight.toObject();
    flightData.duration = flight.getDuration();

    const partialParams = {
      flight: flightData,
      layout: false,
    }

    const management = req.query.management === 'true';
    let detailsModal = ""
    if (management) {
      partialParams.buttonLabel = "Details"
      partialParams.buttonModal = true
      partialParams.modalName = "detailsModal"
      partialParams.showAircraft = true

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fetchRes = await fetch(`${baseUrl}/api/flights/partial/flight-display-modal?flightId=${flightId}`);
      detailsModal = await fetchRes.text();

    } else {
      partialParams.buttonLabel = "Select"
      partialParams.buttonForm = true
      partialParams.formAction = `/Reservation?flightId=${flightId}`
      partialParams.formMethod = "GET"
    }

    // Render partial into HTML string
    res.render('partials/display-flight', partialParams, (err, html) => {
      if (err) return res.status(500).send(err.message);
      res.send(html + detailsModal);
    });

  } catch (err) {
    next(err);
  }
});

router.get('/partial/flight-display-modal', async (req, res) => {
  try {
    function buildTemplate(template, flightOptions = [], defaultOptions = false) {
      if (defaultOptions) {
        return template.map(b => ({
          price: b.price,
          name: b.name,
          enabled: true
        }));
      } else {
        return template.map(t => {
          const match = flightOptions.find(f => f.name === t.name);
          return {
            price: match ? match.price : t.price,
            name: t.name,
            enabled: match ? true : false
          }
        });
      }
    }

    const flightId = req.query.flightId;
    let flight = null;
    if (flightId) {
      flight = await Flight.findById(flightId).lean();
      if (!flight) return res.status(404).json({ error: "Flight not found" });
    }

    let baggageOptions = {};
    let mealOptions = {};

    if (flight) {
      baggageOptions = buildTemplate(baggageOptionsTemplate, flight.baggageOptions || []);
      mealOptions = buildTemplate(mealOptionsTemplate, flight.mealOptions || []);
    } else {
      baggageOptions = buildTemplate(baggageOptionsTemplate, [], true);
      mealOptions = buildTemplate(mealOptionsTemplate, [], true);
    }



    const aircrafts = await Aircraft.find().lean();
    res.render('partials/modal-flight-details', {
      layout: false,
      flight,
      aircrafts,
      baggageTemplate: baggageOptions,
      mealTemplate: mealOptions,
    }, (err, html) => {
      if (err) return res.status(500).send(err.message);
      res.send(html);
    });

  } catch (err) {
    next(err);
  }
});

router.get('/partial/create-flight-modal', async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fetchRes = await fetch(`${baseUrl}/api/flights/partial/flight-display-modal`);
    const html = await fetchRes.text();
    res.send(html);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
