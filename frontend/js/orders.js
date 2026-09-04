const token = localStorage.getItem("token");

if (!token) {
  window.location.replace("login.html");
}

const ordersMessage = document.getElementById("ordersMessage");
const ordersTableBody = document.getElementById("ordersTableBody");

async function loadOrders() {
  try {
    const response = await fetch("http://localhost:5000/api/orders", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      ordersMessage.textContent = data.message || "Failed to load orders";
      return;
    }

    if (data.length === 0) {
      ordersMessage.textContent = "You have not placed any orders yet.";
      return;
    }

    data.forEach(order => {
      const row = document.createElement("tr");

      const orderDate = new Date(order.created_at).toLocaleString();

      row.innerHTML = `
        <td>${order.id}</td>
        <td>₹${Number(order.total_amount).toFixed(2)}</td>
        <td>${order.order_status}</td>
        <td>${order.payment_status}</td>
        <td>${orderDate}</td>
      `;

      ordersTableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Orders error:", error);
    ordersMessage.textContent = "Unable to connect to server";
  }
}

loadOrders();