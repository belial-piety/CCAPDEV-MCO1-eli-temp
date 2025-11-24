const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  // Example: JL742
  flightNumber: { type: String, required: true },

  // Airline 
  airline: {
    type: String,
    required: true
  },

  // Aircraft (from Aircraft.js)
  aircraft: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aircraft',
    required: true,
  },

  // Flight status
  status: {
    type: String,
    enum: ['scheduled', 'in flight', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  // Origin and destination
  origin: { type: String, required: true },
  destination: { type: String, required: true },

  // Departure and arrival times
  departure: { type: Date, required: true },
  arrival: { type: Date, required: true },

  // Ticket price
  price: { type: Number, required: true },

  // Copy of aircraft seats for this flight
  availableSeats: [{
    seatNumber: String,
    isBooked: { type: Boolean, default: false }
  }],

  // Meal options
  mealOptions: [{
    name: { type: String, enum: ['standard', 'vegetarian', 'kosher'], required: true },
    price: { type: Number, required: true } // additional cost
  }],

  // Flight-specific extra baggage options
  baggageOptions: [{
    name: { type: String, enum: ['0kg', '10kg', '15kg', '20kg'], required: true },
    price: { type: Number, required: true } // additional cost
  }],

}, { timestamps: true });


function getSeatNumbers(input) {
  if (Array.isArray(input) && input.length === 0) {
    console.log("a");

    return input
  }
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'string') {
    console.log("b");
    // Array of seat numbers
    return input;
  } else if (Array.isArray(input) && input.length > 0 && input[0].seatNumber) {
    console.log("c");
    // Array of passengers
    return input.map(p => p.seatNumber);
  } else if (input && typeof input === 'object' && input.passengers) {
    console.log("d");
    // Booking object
    return input.passengers.map(p => p.seatNumber);
  } else {
    console.log("e");
    throw new Error("Invalid input to getSeatNumbers. Pass an array of seat numbers, a passenger array, or a booking.");
  }
}

flightSchema.methods.getInvalidSeats = function (seatNumbers, available = false) {
  if (available) {
    // Only consider unbooked seats as valid

    const availableSeats = new Set(this.availableSeats.filter(s => !s.isBooked).map(s => s.seatNumber));
    console.log(availableSeats)
    return seatNumbers.filter(x => !availableSeats.has(x));
  } else {
    // Consider all seats in the flight
    const allSeats = new Set(this.availableSeats.map(s => s.seatNumber));
    return seatNumbers.filter(x => !allSeats.has(x));
  }
};

//default method for updating seats i.e. new bookings, edited bookings,
//cancelled or removed bookings
flightSchema.methods.updateSeats = async function (include, remove) {

  function difference(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter(el => !set2.has(el));
  }

  //get the seat number for the seat to be filled in
  const inpInclude = getSeatNumbers(include);
  //get the seat number for the seat to be set as empty
  const inpRemove = getSeatNumbers(remove);

  const toInclude = difference(inpInclude, inpRemove);
  const toRemove = difference(inpRemove, inpInclude);

  // Validate seats
  console.log('validating')
  const invalidSeats = this.getInvalidSeats([...toInclude, ...toRemove]);
  if (invalidSeats.length > 0) {
    throw new Error(`Seats ${invalidSeats} not found`);
  }
  const bookedSeats = this.getInvalidSeats(toInclude, true);
  console.log(toInclude)
  console.log('booked')
  console.log(bookedSeats)

  if (bookedSeats.length > 0) {
    throw new Error(`Seats ${bookedSeats} are already booked`);
  }

  const seatMap = new Map(this.availableSeats.map(s => [s.seatNumber, s]));
  for (const seatNumber of toRemove) seatMap.get(seatNumber).isBooked = false;
  for (const seatNumber of toInclude) seatMap.get(seatNumber).isBooked = true;

  await this.save();
}

//method for booking a flight with all empty seats(?)
flightSchema.methods.bookSeats = async function (input) {
  //include the input object as the seat(s) to be filled in, blank input for remove since all seats
  // are assumed empty
  await this.updateSeats(input, [])
};

flightSchema.methods.clearSeats = async function (input) {
  //include the input object as the seat(s) to be removed, blank input for seats
  //to be filled in since there are none
  await this.updateSeats([], input)
}

flightSchema.methods.getBookings = async function (lean = true) {
  const Booking = require('./Booking');
  return lean
    ? await Booking.find({ flight: this._id }).lean()
    : await Booking.find({ flight: this._id });
};

flightSchema.methods.getPassengerPrice = async function (passenger) {
  const baggage = this.baggageOptions.find(b => b.name === passenger.extraBaggage);
  const meal = this.mealOptions.find(m => m.name === passenger.meal);
  return price = this.price + meal.price + baggage.price;
};

flightSchema.methods.getDuration = function () {
  const departure = new Date(this.departure);
  const arrival = new Date(this.arrival);

  const durationMs = arrival - departure;
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return { hours: hours, minutes: minutes }
};

flightSchema.methods.cancel = async function () {
  if (this.status === 'cancelled') {
    throw new Error('Flight already cancelled');
  }

  // Mark flight as cancelled
  this.status = 'cancelled';
  await this.save();

  // Fetch all bookings for this flight and cancel them
  const bookings = await this.getBookings();

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;

    try {
      await booking.cancel();
    } catch (err) {
      console.error(`Failed to cancel booking ${booking._id}:`, err);
    }
  }

  return true;
};

module.exports = mongoose.model('Flight', flightSchema);
