const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const phone = document.getElementById("phone").value;

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            password,
            phone
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        document.getElementById("registerError").textContent =
          data.message;
        return;
      }

      alert("Registration successful!");

      window.location.href = "login.html";

    } catch (error) {
      console.log(error);

      document.getElementById("registerError").textContent =
        "Unable to connect to server";
    }
  });
}