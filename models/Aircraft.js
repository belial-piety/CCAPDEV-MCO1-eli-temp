const mongoose = require('mongoose');

const aircraftSchema = new mongoose.Schema({
  // Aircraft model, e.g., Airbus A320, Boeing 737
  model: { type: String, required: true },

  // Seating capacity
  capacity: { type: Number, required: true },

  // Full seat layout for this aircraft
  seats: [{
    seatNumber: String, // e.g., "12A"
  }]

}, { timestamps: true });

// Returns true if they have same seats
aircraftSchema.methods.compareSeats = async function (other) {
  let otherAircraft;

  if (typeof other === 'string' || other instanceof mongoose.Types.ObjectId) {
    // If it's an ID, fetch the aircraft document
    otherAircraft = await this.constructor.findById(other);
    if (!otherAircraft) throw new Error('Aircraft not found');
  } else {
    // Otherwise assume it's an aircraft object
    otherAircraft = other;
  }

  const nums1 = this.seats.map(s => s.seatNumber).sort();
  const nums2 = otherAircraft.seats.map(s => s.seatNumber).sort();

  return JSON.stringify(nums1) === JSON.stringify(nums2);
};


module.exports = mongoose.model('Aircraft', aircraftSchema);
