let usage = [];
let chart = null;

const $ = (id) => document.getElementById(id);

/* =========================
   LOGIN / REGISTER TABS
========================= */

function showLogin() {
    $("loginForm").hidden = false;
    $("registerForm").hidden = true;

    $("loginTab").classList.add("active");
    $("registerTab").classList.remove("active");

    $("authMsg").textContent = "";
}

function showRegister() {
    $("loginForm").hidden = true;
    $("registerForm").hidden = false;

    $("registerTab").classList.add("active");
    $("loginTab").classList.remove("active");

    $("authMsg").textContent = "";
}


/* =========================
   LOGIN
========================= */

$("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    $("authMsg").textContent = "Logging in...";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        console.log("LOGIN RESPONSE:", data);
        console.log("STATUS:", response.status);

        if (!response.ok) {
            $("authMsg").textContent =
                data.error || "Login failed.";
            return;
        }

        // Successful login
        $("authMsg").textContent = "Login successful!";

        // Save user
        localStorage.setItem("user", JSON.stringify(data.user));

        console.log("USER SAVED:", data.user);

        // Hide login page
        $("loginPage").hidden = true;

        // Show application
        $("app").hidden = false;

        // Show username
        if (data.user && data.user.name) {
            $("welcome").textContent = "Hi, " + data.user.name;
        } else {
            $("welcome").textContent = "Welcome!";
        }

        // Load electricity usage
        loadUsage();

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        $("authMsg").textContent =
            "Login error: " + error.message;
    }
});

/* =========================
   REGISTER
========================= */

$("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;

    if (!name || !email || !password) {
        $("authMsg").textContent =
            "Please fill all registration fields.";

        return;
    }

    $("authMsg").textContent = "Creating account...";

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error("Server response:", text);

            $("authMsg").textContent =
                "Server returned an invalid response.";

            return;
        }

        if (!response.ok) {
            $("authMsg").textContent =
                data.error || "Registration failed.";

            return;
        }

        $("authMsg").textContent =
            "Registered successfully. Please login.";

        // Clear registration form
        $("registerForm").reset();

        // Show login form
        showLogin();

    } catch (error) {
        console.error("Registration error:", error);

        $("authMsg").textContent =
            "Cannot connect to server.";
    }
});


/* =========================
   OPEN APPLICATION
========================= */

function openApp() {
    console.log("openApp() called");

    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
        console.log("No user found");
        return;
    }

    const user = JSON.parse(savedUser);

    console.log("User:", user);

    // Hide login page
    const loginPage = document.getElementById("loginPage");

    // Show application
    const app = document.getElementById("app");

    console.log("loginPage:", loginPage);
    console.log("app:", app);

    if (!loginPage) {
        alert("ERROR: loginPage ID not found in HTML");
        return;
    }

    if (!app) {
        alert("ERROR: app ID not found in HTML");
        return;
    }

    loginPage.style.display = "none";
    app.style.display = "block";

    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.textContent = "Hi, " + user.name;
    }

    loadUsage();
}


/* =========================
   LOGOUT
========================= */

function logout() {
    localStorage.removeItem("user");

    // Destroy chart if it exists
    if (chart) {
        chart.destroy();
        chart = null;
    }

    location.reload();
}


/* =========================
   DEFAULT DATE
========================= */

function setToday() {
    const today = new Date().toISOString().slice(0, 10);

    if ($("date")) {
        $("date").value = today;
    }
}

setToday();


/* =========================
   ADD USAGE
========================= */

$("usageForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const appliance = $("appliance").value.trim();
    const power = $("power").value;
    const hours = $("hours").value;
    const days = $("days").value;
    const date = $("date").value;

    if (!appliance || !power || !hours || !days || !date) {
        alert("Please fill all usage details.");
        return;
    }

    const payload = {
        appliance: appliance,
        power: Number(power),
        hours: Number(hours),
        days: Number(days),
        date: date
    };

    try {
        const response = await fetch("/api/usage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error("Server response:", text);

            alert("Server returned an invalid response.");
            return;
        }

        if (!response.ok) {
            alert(data.error || "Could not save usage.");
            return;
        }

        // Clear form
        e.target.reset();

        // Put today's date back
        setToday();

        // Reload usage
        loadUsage();

    } catch (error) {
        console.error("Usage error:", error);

        alert("Cannot connect to server.");
    }
});


/* =========================
   LOAD USAGE
========================= */

async function loadUsage() {
    try {
        const response = await fetch("/api/usage");

        if (!response.ok) {
            console.error("Failed to load usage.");
            return;
        }

        usage = await response.json();

        if (!Array.isArray(usage)) {
            usage = [];
        }

        render();

        updateChart();

    } catch (error) {
        console.error("Load usage error:", error);
    }
}


/* =========================
   DISPLAY DATA
========================= */

function render() {

    // Calculate total electricity units
    const total = usage.reduce(
        (sum, item) => sum + Number(item.units || 0),
        0
    );

    // Total units
    $("totalUnits").textContent =
        total.toFixed(2);

    // Electricity bill
    $("bill").textContent =
        "₹" + bill(total).toFixed(0);

    // Status
    const overLimit = total > 300;

    $("status").textContent =
        overLimit ? "High" : "Good";

    $("statusText").textContent =
        overLimit
            ? "Monthly limit exceeded"
            : "Within limit";


    /* =========================
       USAGE HISTORY
    ========================= */

    $("history").innerHTML =
        usage
            .slice()
            .reverse()
            .map(item => {

                return `
                    <tr>
                        <td>${esc(item.date)}</td>

                        <td>${esc(item.appliance)}</td>

                        <td>${Number(item.power).toFixed(0)} W</td>

                        <td>${Number(item.hours).toFixed(1)}</td>

                        <td>${Number(item.days).toFixed(0)}</td>

                        <td>
                            <b>${Number(item.units).toFixed(2)}</b>
                        </td>

                        <td>
                            <button
                                class="delete"
                                onclick="removeUsage(${item.id})">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;

            })
            .join("") ||

        `
            <tr>
                <td colspan="7">
                    No usage records yet.
                </td>
            </tr>
        `;
}


/* =========================
   ELECTRICITY BILL
========================= */

function bill(units) {

    if (units <= 100) {

        return units * 4;

    } else if (units <= 200) {

        return 400 + (units - 100) * 6;

    } else {

        return 1000 + (units - 200) * 8;
    }
}


/* =========================
   DELETE USAGE
========================= */

async function removeUsage(id) {

    if (!confirm("Delete this record?")) {
        return;
    }

    try {

        const response = await fetch(
            "/api/usage/" + id,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {

            alert("Could not delete record.");

            return;
        }

        // Reload data
        loadUsage();

    } catch (error) {

        console.error("Delete error:", error);

        alert("Cannot connect to server.");
    }
}


/* =========================
   HTML SECURITY
========================= */

function esc(value) {

    return String(value)

        .replace(
            /[&<>"']/g,
            function (character) {

                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[character];

            }
        );
}


/* =========================
   CHART
========================= */

function updateChart() {

    const applianceData = {};

    usage.forEach(item => {

        const appliance = item.appliance;

        applianceData[appliance] =
            (applianceData[appliance] || 0) +
            Number(item.units || 0);

    });


    const labels =
        Object.keys(applianceData);

    const values =
        Object.values(applianceData);


    // Destroy old chart
    if (chart) {

        chart.destroy();

        chart = null;
    }


    // No data
    if (labels.length === 0) {
        return;
    }


    // Create chart
    chart = new Chart(
        $("chart"),
        {
            type: "doughnut",

            data: {
                labels: labels,

                datasets: [
                    {
                        data: values
                    }
                ]
            },

            options: {
                responsive: true,

                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        }
    );
}


/* =========================
   CHECK LOGIN ON PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", function () {

    const savedUser =
        localStorage.getItem("user");

    if (savedUser) {

        openApp();

    } else {

        $("loginPage").hidden = false;
        $("app").hidden = true;

    }

});