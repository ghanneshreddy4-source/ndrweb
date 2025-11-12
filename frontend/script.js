const API_URL = "https://ndr-quiz-backend.onrender.com/api"; // replace with your Render backend URL

async function signup() {
  const data = {
    name: document.getElementById("signupName").value,
    email: document.getElementById("signupEmail").value,
    password: document.getElementById("signupPassword").value,
  };
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });
  alert(await res.text());
}

async function login() {
  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });
  const result = await res.json();
  localStorage.setItem("token", result.token);
  localStorage.setItem("role", result.role);
  if (result.role === "admin") window.location.href = "admin.html";
  else window.location.href = "dashboard.html";
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
