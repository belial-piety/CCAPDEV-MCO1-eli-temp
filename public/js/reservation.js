document.addEventListener("DOMContentLoaded", async () => {
  function createPassengerCard(seatNumber, mealOptions, baggageOptions) {
    const wrapper = document.createElement("div");
    wrapper.className = "card mb-2";
    wrapper.id = `passenger-${seatNumber}`;

    wrapper.innerHTML = `
    <div class="card-header d-flex justify-content-between align-items-center" 
         data-bs-toggle="collapse"
         data-bs-target="#passenger-collapse-${seatNumber}"
         style="cursor:pointer;">
      <span>Seat: ${seatNumber}</span>
      <span class="fw-bold">▼</span>
    </div>

    <div id="passenger-collapse-${seatNumber}" class="collapse show">
      <div class="card-body">

        <div class="mb-2">
          <label>First Name</label>
          <input type="text" class="form-control passenger-firstName">
        </div>

        <div class="mb-2">
          <label>Last Name</label>
          <input type="text" class="form-control passenger-lastName">
        </div>

        <div class="mb-2">
          <label>Email</label>
          <input type="email" class="form-control passenger-email">
        </div>

        <div class="mb-2">
          <label>Meal Option</label>
          <select class="form-select passenger-meal">
            ${mealOptions.map(m =>
      `<option value="${m.name}">${m.name} (+$${m.price})</option>`
    ).join('')}
          </select>
        </div>

        <div class="mb-2">
          <label>Extra Baggage</label>
          <select class="form-select passenger-baggage">
            ${baggageOptions.map(b =>
      `<option value="${b.name}">${b.name} (+$${b.price})</option>`
    ).join('')}
          </select>
        </div>

      </div>
    </div>
  `;

    return wrapper;
  }

  function handleSeatSelection(seatNumber, selected) {
    const passengerList = document.getElementById("passenger-list");

    if (selected) {
      const card = createPassengerCard(seatNumber, flight.mealOptions, flight.baggageOptions)
      passengerList.appendChild(card);

    } else {
      const card = document.getElementById(`passenger-${seatNumber}`);
      if (card) passengerList.removeChild(card);
    }
  }

  function createSeatButton(seat) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = seat.seatNumber;
    btn.className = "btn btn-outline-primary seat-btn";

    if (seat.isBooked) {
      btn.disabled = true;
      btn.classList.add("disabled");
    }

    btn.addEventListener("click", () => {
      btn.classList.toggle("btn-primary");
      btn.classList.toggle("btn-outline-primary");

      const isSelected = btn.classList.contains("btn-primary");
      handleSeatSelection(seat.seatNumber, isSelected);

      updatePricing();
    });

    return btn;
  }

  function renderSeats(flight) {
    const seatContainer = document.getElementById("seat-map");
    seatContainer.innerHTML = "";

    flight.availableSeats.forEach(seat => {
      const btn = createSeatButton(seat)

      seatContainer.appendChild(btn);
    });
  }

  function updatePricing() {
    if (!flight) return;

    let ticketsTotal = 0;
    let baggageTotal = 0;
    let mealTotal = 0;

    const passengerCards = document.querySelectorAll("#passenger-list .card");

    passengerCards.forEach(card => {
      // Base ticket price
      const seatPrice = parseFloat(flight.price || 0);
      ticketsTotal += seatPrice;

      // Meal price
      const mealSelect = card.querySelector(".passenger-meal");
      const mealName = mealSelect ? mealSelect.value : null;
      const mealOption = flight.mealOptions.find(opt => opt.name === mealName);
      mealTotal += mealOption ? parseFloat(mealOption.price) : 0;

      // Baggage price
      const baggageSelect = card.querySelector(".passenger-baggage");
      const baggageWeight = baggageSelect ? baggageSelect.value : 0;
      const baggageOption = flight.baggageOptions.find(opt => opt.name === baggageWeight);
      baggageTotal += baggageOption ? parseFloat(baggageOption.price) : 0;
    });

    // Update the HTML
    document.getElementById("price-tickets").textContent = ticketsTotal.toFixed(2);
    document.getElementById("price-baggage").textContent = baggageTotal.toFixed(2);
    document.getElementById("price-meal").textContent = mealTotal.toFixed(2);
    document.getElementById("price-total").textContent = (ticketsTotal + baggageTotal + mealTotal).toFixed(2);
  }

  const flight = window.selectedFlight;
  if (flight) renderSeats(flight);

  // Listen for changes in meal or baggage selects
  document.addEventListener("change", e => {
    if (e.target.classList.contains("passenger-meal") || e.target.classList.contains("passenger-baggage")) {
      updatePricing();
    }
  });

  // Cancel button
  document.getElementById("cancel-btn").addEventListener("click", async () => {
    window.location.href = '/flight-search'
  });

  // Finish button
  document.getElementById("finish-btn").addEventListener("click", async () => {
    if (!flight || !window.sessionUser) return alert("No flight selected!");

    const passengerCards = document.querySelectorAll("#passenger-list .card");
    if (passengerCards.length === 0) return alert("Please select at least one seat!");

    const passengers = Array.from(passengerCards).map(card => ({
      seatNumber: card.querySelector(".card-header span").textContent.replace("Seat: ", ""),
      firstName: card.querySelector(".passenger-firstName").value.trim(),
      lastName: card.querySelector(".passenger-lastName").value.trim(),
      email: card.querySelector(".passenger-email").value.trim(),
      meal: card.querySelector(".passenger-meal").value,
      extraBaggage: card.querySelector(".passenger-baggage").value,
    }));

    // Validate passenger info
    for (let p of passengers) {
      if (!p.firstName || !p.lastName) {
        return alert("Please fill out first and last names for all passengers");
      }
    }

    const bookingData = {
      userId: window.sessionUser.id,
      flightId: flight._id,
      passengers
    }
    console.log(bookingData)

    try {
      const res = await fetch("/api/bookings/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });

      if (!res.ok) throw new Error("Booking failed");

      const result = await res.json();
      alert("Booking successful!");
      // Optionally redirect to reservation list
      window.location.href = "/reservation-list";

    } catch (err) {
      console.error(err);
      alert("Error completing booking. Please try again.");
    }
  });

  // Flight search bar
  const searchInput = document.getElementById("search-inp");
  const searchBtn = document.getElementById("search-btn");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", async () => {
      const flightNumber = searchInput.value.trim();
      try {
        const res = await fetch(`/api/flights/get-flight/${flightNumber}`);
        if (!res.ok) throw new Error("Flight not found");
        const flight = await res.json();
        console.log(flight)

        window.location.href = `/reservation?flightId=${flight._id}`;

      } catch (err) {
        console.error(err);
        alert("Flight not found. Please try again.");
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keyup", async (e) => {
      if (e.key !== "Enter") return;
      searchBtn.click();
    });
  }
});
