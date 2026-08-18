document.addEventListener("DOMContentLoaded", function() {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const API_URL = "http://localhost:5000/api/auth";
    // register
    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const username = registerForm.querySelector('input[name="Username"]').value;
            const email = registerForm.querySelector('input[name="Email"]').value;
            const password = registerForm.querySelector('input[name="Parola"]').value;
            const confirmPassword = registerForm.querySelector('input[name="Confirma parola"]').value;
            if (password !== confirmPassword) {
                alert("Parolele nu coincid!");
                return;
            }
            try {
                var res = await fetch(API_URL + "/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, email: email, password: password })
                });
                var data = await res.json();
                if (res.ok) {
                    window.location.href = "login.html";
                } else {
                    alert(data.message || "Eroare la inregistrare");
                }
            } catch (err) {
                console.error(err);
                alert("Eroare de conexiune la server.");
            }
        });
    }
    //login
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const email = loginForm.querySelector('input[name="email"]').value;
            const password = loginForm.querySelector('input[name="parola"]').value;
            try {
                var res = await fetch(API_URL + "/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email, password: password })
                });
                var data = await res.json();
                if (res.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "index.html";
                } else {
                    alert(data.message || "Eroare la logare");
                }
            } catch (err) {
                console.error(err);
                alert("Eroare de conexiune la server.");
            }
        });
    }
});