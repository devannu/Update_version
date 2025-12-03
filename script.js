// ---------------- LOGIN ----------------
const users = {
    admin: { username: "admin", password: "admin123" },
    security: { username: "sec", password: "sec123" },
    staff: { username: "staff", password: "staff123" },
    visitor: { username: "visitor", password: "visitor123" },
    registrar: { username: "reg", password: "reg123" },
};

function login() {
    const role = document.getElementById("role").value;
    const uname = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const msg = document.getElementById("msg");

    if (!role || !uname || !pass) {
        msg.innerHTML = "Please enter all details!";
        msg.style.color = "red";
        return;
    }

    if (users[role].username === uname && users[role].password === pass) {
        localStorage.setItem("role", role);
        window.location.href = `${role}.html`;
    } else {
        msg.innerHTML = "Invalid login details!";
        msg.style.color = "red";
    }
}

// Logout
function logout() {
    localStorage.removeItem("role");
    window.location.href = "index.html";
}



// ---------------- AUTO SET CURRENT DATE ----------------
window.onload = function () {
    let today = new Date().toISOString().split("T")[0];
    if (document.getElementById("vdate")) {
        document.getElementById("vdate").value = today;
    }
};

// ---------------- NAME VALIDATION ----------------
document.getElementById("vname").addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-Z ]/g, "");
    if (this.value.length > 0)
        this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);
});

document.getElementById("vmeet").addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-Z ]/g, "");
    if (this.value.length > 0)
        this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);
});


// ---------------- PHONE VALIDATION ----------------
function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}



// ---------------- ADD VISITOR (Pending + QR Generate) ----------------
function handleAddVisitor() {

    let name = vname.value.trim();
    let phone = vphone.value.trim();
    let meet = vmeet.value.trim();
    let purpose = vpurpose.value.trim();
    let date = vdate.value;

    if (!name || !phone || !meet || !purpose || !date) {
        alert("Please fill all fields!");
        return;
    }

    if (!validatePhone(phone)) {
        alert("Enter a valid 10-digit Indian mobile number!");
        return;
    }

    let data = JSON.parse(localStorage.getItem("visitors")) || [];

    // Prevent duplicate QR on same day
    let existing = data.find(v => v.phone === phone && v.date === date);

    if (existing && existing.qrDownloaded === true) {
        alert("QR already generated for this visitor today!");
        return;
    }

    // Create NEW visitor with PENDING status
    let record = {
        id: Date.now(),
        name,
        phone,
        meet,
        purpose,
        date,
        timeIn: "",
        timeOut: "",
        status: "Pending",
        qrDownloaded: false
    };

    // Generate QR
    new QRious({
        element: document.getElementById("qrCanvas"),
        size: 220,
        value: JSON.stringify(record)
    });

    // Auto Download QR
    setTimeout(() => {
        let link = document.createElement("a");
        link.download = `${name}_visitor_qr.png`;
        link.href = document.getElementById("qrCanvas").toDataURL("image/png");
        link.click();

        record.qrDownloaded = true;

        if (existing) {
            let idx = data.indexOf(existing);
            data[idx] = record;
        } else {
            data.push(record);
        }

        localStorage.setItem("visitors", JSON.stringify(data));
    }, 300);

    document.getElementById("sec-msg").innerHTML =
        "QR Generated & Downloaded Successfully!";
}



// ---------------- TABLE RENDER ----------------
function renderVisitorsTable(bodyId) {
    let data = JSON.parse(localStorage.getItem("visitors")) || [];
    let tbody = document.getElementById(bodyId);
    tbody.innerHTML = "";

    data.forEach((v, i) => {

        let color = "";
        if (v.status === "In") color = "style='color: green; font-weight: bold;'";
        else if (v.status === "Out") color = "style='color: red; font-weight: bold;'";
        else color = "style='color: orange; font-weight: bold;'"; // Pending

        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${v.name}</td>
                <td>${v.phone}</td>
                <td>${v.purpose}</td>
                <td>${v.meet}</td>
                <td>${v.date}</td>
                <td>${v.timeIn || "-"}</td>
                <td>${v.timeOut || "-"}</td>
                <td ${color}>${v.status}</td>
            </tr>
        `;
    });
}



// ---------------- QR SCANNER ----------------
function startScanner() {
    const qr = new Html5Qrcode("reader");

    qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },

        (decoded) => {
            qr.stop();
            let visitor = JSON.parse(decoded);
            updateVisitorFromQR(visitor);
        }
    );
}



// ---------------- ENTRY / EXIT LOGIC (FIXED) ----------------
function updateVisitorFromQR(scannedVisitor) {

    let data = JSON.parse(localStorage.getItem("visitors")) || [];

    let index = data.findIndex(v => v.id == scannedVisitor.id);

    // ---------- 1️⃣ FIRST SCAN → ENTRY ----------
    if (index === -1) {

        scannedVisitor.timeIn = new Date().toLocaleTimeString();
        scannedVisitor.status = "In";

        data.push(scannedVisitor);

        alert(`Entry Marked!\nVisitor: ${scannedVisitor.name}`);
    }

    // ---------- 2️⃣ SECOND SCAN → EXIT ----------
    else if (data[index].status === "In" && data[index].timeOut === "") {

        data[index].timeOut = new Date().toLocaleTimeString();
        data[index].status = "Out";

        alert(`Exit Marked!\nVisitor: ${data[index].name}`);
    }

    // ---------- 3️⃣ THIRD SCAN → BLOCK ----------
    else if (data[index].status === "Out") {
        alert("⚠ Visitor already exited!\nScan blocked.");
        return;
    }

    localStorage.setItem("visitors", JSON.stringify(data));

    if (document.getElementById("visitor-table-body")) {
        renderVisitorsTable("visitor-table-body");
    }
}



// ---------------- CLEAR VISITORS ----------------
function clearVisitors() {
    if (confirm("Are you sure you want to delete all visitor records?")) {
        localStorage.removeItem("visitors");
        renderVisitorsTable("visitor-table-body");
    }
}
