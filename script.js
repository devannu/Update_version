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
// For visitor name
// -------------------- ONLY LETTERS FOR VISITOR NAME ---------------------
document.getElementById("vname").addEventListener("input", function () {
    // Remove numbers + special chars
    this.value = this.value.replace(/[^a-zA-Z ]/g, "");

    // Capitalize first letter
    let v = this.value;
    if (v.length > 0) {
        this.value = v.charAt(0).toUpperCase() + v.slice(1);
    }
});

// -------------------- ONLY LETTERS FOR 'TO MEET' FIELD ---------------------
document.getElementById("vmeet").addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-Z ]/g, "");

    let v = this.value;
    if (v.length > 0) {
        this.value = v.charAt(0).toUpperCase() + v.slice(1);
    }
});


// ---------------- PHONE VALIDATION ----------------
function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

// ---------------- ADD VISITOR (QR GENERATE ONLY ONCE) ----------------
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

    // ---- CHECK IF VISITOR QR ALREADY GENERATED ----
    let existing = data.find(v => v.phone === phone && v.date === date);

    if (existing && existing.qrDownloaded === true) {
        alert("QR already generated for this visitor. Duplicate not allowed!");
        return;
    }

    // ---- CREATE NEW RECORD ----
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

    // ---- GENERATE QR ----
    new QRious({
        element: document.getElementById("qrCanvas"),
        size: 220,
        value: JSON.stringify(record)
    });

    // ---- AUTO DOWNLOAD ONLY 1 TIME ----
    setTimeout(() => {
        let link = document.createElement("a");
        link.download = `${name}_visitor_qr.png`;
        link.href = document.getElementById("qrCanvas").toDataURL("image/png");
        link.click();

        record.qrDownloaded = true; // Mark downloaded

        // Save or update in localStorage
        if (existing) {
            let index = data.indexOf(existing);
            data[index] = record;
        } else {
            data.push(record);
        }

        localStorage.setItem("visitors", JSON.stringify(data));
    }, 400);

    document.getElementById("sec-msg").innerHTML =
        "QR Generated & Downloaded Successfully!";
}

// ---------------- DOWNLOAD QR BUTTON ----------------
function downloadQR() {
    alert("QR already downloaded when created!");
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
        else color = "style='color: orange; font-weight: bold;'";

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

// ---------------- ENTRY / EXIT UPDATE ----------------
function updateVisitorFromQR(visitor) {
    let data = JSON.parse(localStorage.getItem("visitors")) || [];

    let index = data.findIndex(v => v.id == visitor.id);

    if (index === -1) {
        // FIRST SCAN = ENTRY
        visitor.timeIn = new Date().toLocaleTimeString();
        visitor.timeOut = "";
        visitor.status = "In";

        data.push(visitor);
        alert(`Entry Marked!\nVisitor: ${visitor.name}`);
    } 
    
    else {
        // SECOND SCAN = EXIT
        if (!data[index].timeOut) {
            data[index].timeOut = new Date().toLocaleTimeString();
            data[index].status = "Out";
            alert(`Exit Marked!\nVisitor: ${data[index].name}`);
        } else {
            alert("Visitor already exited!");
            return;
        }
    }

    localStorage.setItem("visitors", JSON.stringify(data));
    renderVisitorsTable("visitor-table-body");
}

// ---------------- CLEAR VISITORS ----------------
function clearVisitors() {
    if (confirm("Are you sure you want to delete all visitor records?")) {
        localStorage.removeItem("visitors");
        renderVisitorsTable("visitor-table-body");
    }
}

// ---------------- EXCEL DOWNLOAD ----------------
function downloadExcel() {
    let data = JSON.parse(localStorage.getItem("visitors")) || [];

    if (data.length === 0) {
        alert("No records found!");
        return;
    }

    let worksheet = XLSX.utils.json_to_sheet(data);
    let workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Visitors");

    XLSX.writeFile(workbook, "Visitor_Records.xlsx");
}

// PDF downlaod
function downloadPDF() {
    let data = JSON.parse(localStorage.getItem("visitors")) || [];

    if (data.length === 0) {
        alert("No records found!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Visitor Records Report", 14, 10);

    const tableData = data.map((v, i) => [
        i + 1,
        v.name,
        v.phone,
        v.date,
        v.timeIn || "-",
        v.timeOut || "-",
        v.status
    ]);

    doc.autoTable({
        head: [["Serial No.", "Name", "Phone", "Date", "In Time", "Out Time", "Status"]],
        body: tableData,
        startY: 20,
    });

    doc.save("Visitor_Records.pdf");
}
// // Watch
// function updateMarqueeClock() {
//   const now = new Date();

//   let hrs = now.getHours().toString().padStart(2, "0");
//   let mins = now.getMinutes().toString().padStart(2, "0");
//   let secs = now.getSeconds().toString().padStart(2, "0");

//   let timeString = `⏱️  Current Time: ${hrs}:${mins}:${secs}   |   Visitor Management System`;

//   document.getElementById("marqueeClock").innerText = timeString;
// }

// setInterval(updateMarqueeClock, 1000);
// updateMarqueeClock();

