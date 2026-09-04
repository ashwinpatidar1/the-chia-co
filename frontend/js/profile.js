const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");

async function loadProfile() {
  try {
    const response = await fetch("http://localhost:5000/api/profile", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      profileMessage.textContent = data.message;
      return;
    }

    document.getElementById("name").value = data.name || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";

  } catch (error) {
    console.error(error);
    profileMessage.textContent = "Unable to connect to server";
  }
}

profileForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const updatedData = {
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value
  };

  try {
    const response = await fetch("http://localhost:5000/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(updatedData)
    });

    const data = await response.json();

    profileMessage.textContent = data.message;

  } catch (error) {
    console.error(error);
    profileMessage.textContent = "Unable to connect to server";
  }
});

document.getElementById("logoutButton").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

loadProfile();