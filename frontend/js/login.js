document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  if (!loginForm) {
    console.error("loginForm was not found");
    return;
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginError.textContent = "Logging in...";

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      console.log("Login response:", data);

      if (!response.ok) {
        loginError.textContent = data.message || "Login failed";
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      loginError.textContent = "Login successful";

      window.location.href = "index.html";

    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "Unable to connect to server";
    }
  });
});