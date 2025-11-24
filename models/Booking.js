const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Reference to the user making the booking
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Reference to the flight being booked
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },

  // Total price for the booking (will be recalculated if options change)
  totalPrice: { type: Number, required: true},

  // Booking status
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },

  // Passengers and their selections
  passengers: [{
    firstName: String,
    lastName: String,
    
    passportNumber: String,
    email: String,

    seatNumber: String,             // must match flight.aircraft.seats.seatNumber
    meal: { type: String },         // must match flight.mealOptions.name
    extraBaggage: { type: String }, // must match flight.baggageOptions.name
  }]

}, { timestamps: true });

bookingSchema.methods.calculatePrice = async function(update=false) {
  //flight model
  const Flight = require('./Flight');
  //flight object construction by id
  const flight = await Flight.findById(this.flight);
  if (!flight) throw new Error("Flight not found");

  //prices of each passenger is pushed to prices array
  const prices = [];
    //this refers to the instance of the current flight object
  for (const p of this.passengers) {
    const price = await flight.getPassengerPrice(p);
    //price of current passenger is pushed to pricces array
    prices.push(price);
  }

  //check to see prices of current flight
  console.log(prices)
  
  const total = prices.reduce((total, p) => total + p, 0)
  console.log(total)
  if (update) {
    this.totalPrice = total;
    await this.save()
  }

  return total;
};

// Setter for passengers
bookingSchema.methods.setPassengers = async function(passengers) {
  if (this.status === "cancelled") {
    throw new Error('Booking already cancelled');
  }

  const Flight = require('./Flight');
  const flight = await Flight.findById(this.flight);
  if (!flight) throw new Error("Flight not found");

  // Update flight seats
  await flight.updateSeats(passengers, this);

  // Update passengers in booking
  this.passengers = passengers ?? [];
  // Update prices (saves in calculatePrice)
  await this.calculatePrice(true);
};

bookingSchema.methods.cancel = async function() {
  if (this.status === "cancelled") {
    throw new Error('Booking already cancelled')
  }
  
  const Flight = require('./Flight');
  const flight = await Flight.findById(this.flight);
  if (!flight) throw new Error("Flight not found");
  
  await flight.clearSeats(this);

  this.status = "cancelled";
  await this.save();
}

module.exports = mongoose.model('Booking', bookingSchema);
