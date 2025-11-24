document.addEventListener('DOMContentLoaded', async () => {
  try {
    const departureList = document.getElementById('departure-list');
    const returnList = document.getElementById('return-list');

    async function displayFlights(input, container) {
      try {
        if (!input || !container) return;

        // Normalize input to array of IDs
        let idArray;
        if (input.length > 0 && typeof input[0] === 'object' && input[0]._id) {
          // Input is flight objects → extract IDs
          idArray = input.map(f => f._id);
        } else {
          // Input is already IDs or single ID
          idArray = Array.isArray(input) ? input : [input];
        }

        // Fetch and render each flight partial
        for (const id of idArray) {
          const res = await fetch(`/api/flights/partial/flight-display/${id}`);
          if (!res.ok) throw new Error(`Failed to fetch flight ${id}`);
          const html = await res.text();
          container.insertAdjacentHTML('beforeend', html);
        }

      } catch (err) {
        console.error(err);
      }
    }

    async function getAllFlights() {
      try {
        const res = await fetch('/api/flights/get-all?scheduled=true');
        if (!res.ok) throw new Error('Failed to fetch flights');
        const data = await res.json();
        return data.flights || [];
      } catch (err) {
        showAlert('Failed to load flights.', 'danger');
        console.error(err);
        return [];
      }
    }
    const allFlights = await getAllFlights();
    console.log(allFlights.map(f => f.flightNumber))

    function filterFlights(origin, destination, departureDate, returnDate, count) {
      const formatLocalDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      const filter = (from, to, date, cnt, isReturn = false) => {
        return allFlights.filter(f => {
          const flightDate = formatLocalDate(f.departure);

          const matchesOrigin = !from
            || (!isReturn && f.origin.toLowerCase() === from.toLowerCase())
            || (isReturn && f.destination.toLowerCase() === from.toLowerCase());

          const matchesDestination = !to
            || (!isReturn && f.destination.toLowerCase() === to.toLowerCase())
            || (isReturn && f.origin.toLowerCase() === to.toLowerCase());

          const matchesDate = !date || flightDate === date;
          const matchesCount = !cnt || f.availableSeats.length >= parseInt(cnt);

          return matchesOrigin && matchesDestination && matchesDate && matchesCount;
        });
      };

      // Outbound flights: origin → destination
      const outbound = filter(origin, destination, departureDate, count, false);
      // Inbound flights: destination → origin (or same as origin if blank)
      const inbound = filter(origin, destination, returnDate, count, true);

      return { outbound, inbound };
    }

    function verifySearchForm(origin, destination, departureDate, returnDate) {
      if (origin && destination && origin === destination) {
        showAlert("Origin cannot be the same as destination.", "danger");
        return false;
      }
      if (departureDate && new Date(departureDate) < new Date(new Date().toDateString())) {
        showAlert("Departure date must be today or in the future.", "danger");
        return false;
      }
      if (departureDate && returnDate && new Date(returnDate) < new Date(departureDate)) {
        showAlert("Return date cannot be before departure date.", "danger");
        return false;
      }
      clearAlert();
      return true;
    }

    $("#flight-search-button").on("click", async () => {
      const origin = $("#search-origin").val() || null;
      const destination = $("#search-destination").val() || null;
      const departureDate = $("#search-departure").val() || null;
      const returnDate = $("#search-return").val() || null;
      const count = $("#search-count").val() || 1;

      departureList.innerHTML = "";
      returnList.innerHTML = "";

      if (!verifySearchForm(origin, destination, departureDate, returnDate)) return;

      const { outbound, inbound } = filterFlights(origin, destination, departureDate, returnDate, count);
      if (outbound.length + inbound.length === 0) {
        showAlert("No flights available for your search criteria.", "dark");
      } else {
        await displayFlights(outbound, departureList);
        await displayFlights(inbound, returnList);
      }
    });

    async function displayAllFlights() {
      await displayFlights(allFlights, departureList);
      await displayFlights(allFlights, returnList);
    }
    displayAllFlights();

    function populateLocations() {
      const locations = [...new Set(allFlights.flatMap(f => [f.origin, f.destination]))];

      const destinationSelect = $("#search-destination");
      const originSelect = $("#search-origin");

      // Remove all dynamically added options but keep the first default
      originSelect.find("option:not(:first)").remove();
      destinationSelect.find("option:not(:first)").remove();

      locations.forEach(loc => {
        originSelect.append(`<option value="${loc}">${loc}</option>`);
        destinationSelect.append(`<option value="${loc}">${loc}</option>`);
      });

      // Set default to the first option (Any Origin / Any Destination)
      originSelect.val("");
      destinationSelect.val("");
    }
    populateLocations();

    function showAlert(message, type) {
      const placeholder = $("#alert-placeholder");
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible" role="alert">
                <div>${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
      placeholder.empty().append(wrapper);
    }

    function clearAlert() {
      $("#alert-placeholder").empty();
    }

  } catch (err) {
    console.error(err);
  }
});