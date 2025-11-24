document.addEventListener('DOMContentLoaded', async () => {
  try {

    async function createDisplayItem(bookingId) {
      const res = await fetch(`/api/bookings/partial/booking-display/${bookingId}?management=true`);
      if (!res.ok) throw new Error(`Failed to create: booking item: ${bookingId}`);
      const html = await res.text();
      return html;
    }

    const reservationList = document.getElementById('reservation-list');

    async function displayItems(input, container) {
      try {
        if (!input || !container) return;

        // Normalize input to array of IDs
        let idArray;
        if (input.length > 0 && typeof input[0] === 'object' && input[0]._id) {
          // Input is objects then extract IDs
          idArray = input.map(f => f._id);
        } else {
          // Input is already IDs or single ID
          idArray = Array.isArray(input) ? input : [input];
        }

        // Fetch and render each flight partial
        for (const id of idArray) {
          const item = await createDisplayItem(id);
          container.insertAdjacentHTML('beforeend', item);
        }

      } catch (err) {
        console.error(err);
      }
    }

    async function getAllBookings() {
      try {
        const res = await fetch(`/api/bookings/user-bookings?userId=${window.sessionUser.id}`);
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        return data.bookings || [];
      } catch (err) {
        console.error(err);
        return [];
      }
    }
    const allBookings = await getAllBookings();


    async function updateDisplays(bookings) {
      await displayItems(bookings, reservationList);
    }

    async function displayAllBookings() {
      updateDisplays(allBookings);
    }

    displayAllBookings();
    function reindexPassengers(form) {
      const cards = form.querySelectorAll('.passenger-card');

      cards.forEach((card, index) => {
        const inputs = card.querySelectorAll('[name^="passengers["]');
        inputs.forEach(input => {
          // Expect names like: passengers[3][seatNumber]
          const match = input.name.match(/^passengers\[\d+\]\[(.+)\]$/);
          if (!match) return;
          const field = match[1]; // e.g. "seatNumber"
          input.name = `passengers[${index}][${field}]`;
        });
      });
    }

    // -------------------------------------------------------------------------
    // NEW: Click handler for "Remove passenger" buttons in any booking modal
    // -------------------------------------------------------------------------

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-passenger');
      if (!btn) return;

      const card = btn.closest('.passenger-card');
      if (!card) return;

      const form = btn.closest('form');
      if (!form) return;

      const allCards = form.querySelectorAll('.passenger-card');

      // Prevent removing the last passenger from a booking
      if (allCards.length <= 1) {
        alert('A booking must have at least one passenger.');
        return;
      }

      card.remove();
    });

    // -------------------------------------------------------------------------
    // NEW: Before submitting an update-booking form, reindex passengers
    // -------------------------------------------------------------------------

    document.addEventListener('submit', (e) => {
      const form = e.target;

      // Only act on the update-booking forms
      if (!form.id || !form.id.startsWith('update-booking-form-')) return;

      const cards = form.querySelectorAll('.passenger-card');

      if (cards.length === 0) {
        e.preventDefault();
        alert('Booking must have at least one passenger.');
        return;
      }

      // Fix passengers[INDEX][field] naming so the backend sees a clean array
      reindexPassengers(form);
      // Let the submit continue
    });

  } catch (err) {
    console.error(err);
  }
});
