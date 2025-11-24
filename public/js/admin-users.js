document.addEventListener('DOMContentLoaded', async () => {
  try {
    const customerList = document.getElementById('customer-list');
    const adminList = document.getElementById('admin-list');


    async function createSearchItem(userId) {
      const res = await fetch(`/api/users/partial/admin/search-item/${userId}`);
      if (!res.ok) throw new Error(`Failed to create search item: ${userId}`);
      const html = await res.text();
      const detailsModal = await createDetailsModal(userId);

      const combinedHtml = html + detailsModal;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = combinedHtml;

      const reservationList = tempDiv.querySelector(`#reservation-list-${userId}`);
      await insertBookings(await getAllBookings(userId), reservationList);
      return tempDiv.innerHTML;
    }

    async function createDetailsModal(userId) {
      const res = await fetch(`api/users/partial/user-details-modal/${userId}`);
      if (!res.ok) throw new Error("Failed to load modal");
      return await res.text();
    }

    async function displayItems(input, container) {
      try {
        if (!input || !container) return;

        // Normalize input to array of IDs
        let ids;
        if (input.length > 0 && typeof input[0] === 'object' && input[0]._id) {
          // Input is objects so extract IDs
          ids = input.map(f => f._id);
        } else {
          // Input is already IDs or single ID
          ids = Array.isArray(input) ? input : [input];
        }

        // Fetch and render each flight partial
        for (const id of ids) {
          const item = await createSearchItem(id);
          container.insertAdjacentHTML('beforeend', item);
        }

      } catch (err) {
        console.error(err);
      }
    }

    async function getItems() {
      try {
        const res = await fetch('/api/users/get-users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        return data.users || [];
      } catch (err) {
        showAlert('Failed to load users.', 'danger');
        console.error(err);
        return [];
      }
    }
    const allUsers = await getItems();

    async function updateDisplays(users) {
      const customers = users.filter(f => f.role === "customer");
      const admins = users.filter(f => f.role === "admin");

      await displayItems(customers, customerList);
      await displayItems(admins, adminList);
    }

    async function displayAllItems() {
      updateDisplays(allUsers);
    }

    displayAllItems();

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

  async function createBookingItem(bookingId) {
    const res = await fetch(`/api/bookings/partial/booking-display/${bookingId}?management=true`);
    if (!res.ok) throw new Error(`Failed to create: booking item: ${bookingId}`);
    const html = await res.text();
    return html;
  }

  async function insertBookings(input, container) {
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
        const item = await createBookingItem(id);
        container.insertAdjacentHTML('beforeend', item);
      }

    } catch (err) {
      console.error(err);
    }
  }

  async function getAllBookings(userId) {
    try {
      const res = await fetch(`/api/bookings/user-bookings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      return data.bookings || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }
});


