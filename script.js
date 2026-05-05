// ==========================
// CONFIG
// ==========================
const SHEET_URL = "https://script.google.com/macros/s/AKfycbx2zrud9VaYCOFjH9rCz5b0gs1cKeTlN50zzbL-W3daHI6Ep5C0W6FOpdLOVZU4iiP8/exec";

// ==========================
// ELEMENT
// ==========================
const form = document.getElementById("form");
const tbody = document.getElementById("tbody");

const totalMasukEl = document.getElementById("totalMasuk");
const totalKeluarEl = document.getElementById("totalKeluar");
const saldoEl = document.getElementById("saldo");

const tipeSelect = document.getElementById("tipe");
const kategoriSelect = document.getElementById("kategori");
const ownerSelect = document.getElementById("owner");

const ketInput = document.getElementById("ket");
const jumlahInput = document.getElementById("jumlah");

// ==========================
// STATE
// ==========================
let currentDate = new Date().toISOString().split("T")[0];
let data = [];
let editId = null;
let cart = [];
// ==========================
// FORMAT
// ==========================
function formatRupiah(num) {
  return "Rp " + Number(num).toLocaleString("id-ID");
}

function cleanDate(tgl) {
  if (!tgl) return "";
  return tgl.split("T")[0];
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return d.getFullYear() + "-" + (d.getMonth() + 1);
}

function formatBulanTahun(dateStr) {
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const d = new Date(dateStr);
  return `${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ==========================
// DATE NAV
// ==========================
function changeDate(offset) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + offset);
  currentDate = d.toISOString().split("T")[0];
  render();
}
window.changeDate = changeDate;

// ==========================
// DATE PICKER
// ==========================
function openDatePicker() {
  const picker = document.getElementById("datePickerHidden");
  if (!picker) return;

  const scrollY = window.scrollY;
  picker.showPicker?.();
  setTimeout(() => window.scrollTo(0, scrollY), 50);
}
window.openDatePicker = openDatePicker;

document.addEventListener("change", (e) => {
  if (e.target.id === "datePickerHidden") {
    currentDate = e.target.value;
    render();
  }
});

// ==========================
// INPUT FORMAT
// ==========================
jumlahInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");

  if (!value) {
    e.target.value = "";
    return;
  }

  // cuma angka → ubah jadi 1.000 style (tanpa Rp)
  e.target.value = Number(value).toLocaleString("id-ID");
});

// ==========================
// CHART
// ==========================
const chart = new Chart(document.getElementById("myChart"), {
  type: "doughnut",
  data: {
    labels: ["Pemasukan", "Pengeluaran"],
    datasets: [{
      data: [0, 0],
      backgroundColor: ["#22c55e", "#ef4444"]
    }]
  }
});

const kategoriChart = new Chart(document.getElementById("kategoriChart"), {
  type: "pie",
  data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
});

const ownerChart = new Chart(document.getElementById("ownerChart"), {
  type: "bar",
  data: {
    labels: ["SULALA", "SURERE"],
    datasets: [{ data: [0, 0], backgroundColor: ["#3b82f6", "#f97316"] }]
  }
});

const bulanChart = new Chart(document.getElementById("bulanChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Pemasukan",
      data: [],
      borderColor: "#22c55e",
      backgroundColor: "rgba(34,197,94,0.25)",
      fill: true,
      tension: 0.4
    }]
  }
});

// ==========================
// COLORS
// ==========================
function generateColors(count) {
  return Array.from({ length: count }, (_, i) =>
    `hsl(${(360 / count) * i},70%,55%)`
  );
}

// ==========================
// SHOW CATEGORY
// ==========================
tipeSelect.addEventListener("change", () => {
  kategoriSelect.style.display =
    tipeSelect.value === "keluar" ? "block" : "none";
});

// ==========================
// FIREBASE
// ==========================
function startRealtime() {
  fb.onSnapshot(fb.collection(db, "transaksi"), (snap) => {
    data = snap.docs.map(d => {
      const raw = d.data();
      return {
        id: d.id,
        ...raw,
        tanggal: cleanDate(raw.tanggal)
      };
    });
    render();
  });
}

// ==========================
// CRUD
// ==========================
async function addData(item) {
  await fb.addDoc(fb.collection(db, "transaksi"), item);
}

async function updateData(id, item) {
  await fb.updateDoc(fb.doc(db, "transaksi", id), item);
}

async function deleteData(id) {
  const yakin = await customConfirm("Hapus transaksi ini?");

  if (!yakin) return;

  await fb.deleteDoc(fb.doc(db, "transaksi", id));

  showToast("Dah terhaposs!", "success");
}
window.deleteData = deleteData;

function customConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");

    modal.innerHTML = `
      <div class="confirm-box">
        <p>${message}</p>
        <div class="confirm-btn">
          <button id="no">Batal</button>
          <button id="yes">Hapus</button>
        </div>
      </div>
    `;

    modal.className = "confirm-overlay";
    document.body.appendChild(modal);

    document.getElementById("yes").onclick = () => {
      modal.remove();
      resolve(true);
    };

    document.getElementById("no").onclick = () => {
      modal.remove();
      resolve(false);
    };
  });
}


// ==========================
// SUBMIT
// ==========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = {
    ket: ketInput.value,
    jumlah: parseInt(jumlahInput.value.replace(/\D/g, "")),
    tipe: tipeSelect.value,
    kategori: tipeSelect.value === "keluar" ? kategoriSelect.value : "-",
    owner: tipeSelect.value === "masuk" ? ownerSelect.value : "-",
    tanggal: new Date().toISOString()
  };

  if (!editId) await addData(item);
  else {
    await updateData(editId, item);
    editId = null;
  }

  form.reset();
  kategoriSelect.style.display = "none";
});

// ==========================
// EDIT
// ==========================
function editData(id) {
  const item = data.find(d => d.id === id);
  if (!item) return;

  ketInput.value = item.ket;
  jumlahInput.value = formatRupiah(item.jumlah);
  tipeSelect.value = item.tipe;

  if (item.tipe === "keluar") {
    kategoriSelect.style.display = "block";
    kategoriSelect.value = item.kategori;
  }

  ownerSelect.value = item.owner || "";
  editId = id;
}
window.editData = editData;

// ==========================
// RENDER
// ==========================
function render() {
  tbody.innerHTML = "";

  let totalMasukGlobal = 0;
  let totalKeluarGlobal = 0;
  let totalMasukBulan = 0;
  let totalKeluarBulan = 0;

  let kategoriMap = {};
  let ownerMap = { sulala: 0, surere: 0 };
  let bulanMap = {};

  const currentMonth = getMonthKey(currentDate);
  const list = data.filter(i => cleanDate(i.tanggal) === currentDate);

  let no = 1;

  tbody.innerHTML = `
    <tr class="date-row" onclick="openDatePicker()">
      <td colspan="6">
        <button onclick="event.stopPropagation(); changeDate(-1)"><</button>
        📅 ${formatTanggalIndo(currentDate)}
        <button onclick="event.stopPropagation(); changeDate(1)">></button>

        <input type="date" id="datePickerHidden" value="${currentDate}"
        style="position:fixed; bottom:0; left:0; opacity:0;">
      </td>
    </tr>
  `;

  data.forEach(item => {
    const d = new Date(item.tanggal);
    const itemMonth = getMonthKey(item.tanggal);

    if (item.tipe === "masuk") totalMasukGlobal += item.jumlah;
    else totalKeluarGlobal += item.jumlah;

    if (itemMonth === currentMonth) {
      if (item.tipe === "masuk") {
        totalMasukBulan += item.jumlah;

        if (item.owner === "sulala") ownerMap.sulala += item.jumlah;
        if (item.owner === "surere") ownerMap.surere += item.jumlah;

        bulanMap[d.getMonth()] =
          (bulanMap[d.getMonth()] || 0) + item.jumlah;
      }

      if (item.tipe === "keluar") {
        totalKeluarBulan += item.jumlah;

        kategoriMap[item.kategori] =
          (kategoriMap[item.kategori] || 0) + item.jumlah;
      }
    }
  });

  list.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${no++}</td>
        <td>${item.ket}</td>
        <td class="${item.tipe}">${item.tipe}</td>
        <td>${item.kategori}</td>
        <td>${formatRupiah(item.jumlah)}</td>
        <td>
          <button onclick="editData('${item.id}')">✏️</button>
          <button onclick="deleteData('${item.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  const saldo = totalMasukGlobal - totalKeluarGlobal;

  totalMasukEl.textContent = formatRupiah(totalMasukBulan);
  totalKeluarEl.textContent = formatRupiah(totalKeluarBulan);
  saldoEl.textContent = formatRupiah(saldo);

  chart.data.datasets[0].data = [totalMasukBulan, totalKeluarBulan];
  chart.update();

  kategoriChart.data.labels = Object.keys(kategoriMap);
  kategoriChart.data.datasets[0].data = Object.values(kategoriMap);
  kategoriChart.data.datasets[0].backgroundColor =
    generateColors(Object.keys(kategoriMap).length);
  kategoriChart.update();

  ownerChart.data.datasets[0].data = [
    ownerMap.sulala,
    ownerMap.surere
  ];
  ownerChart.update();

  const namaBulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  bulanChart.data.labels = Object.keys(bulanMap).map(i => namaBulan[i]);
  bulanChart.data.datasets[0].data = Object.values(bulanMap);
  bulanChart.update();
  
  renderBoros();
}

// ==========================
// EXPORT PDF (FINAL FIX)
// ==========================
window.exportPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const currentMonth = getMonthKey(currentDate);

  // ==========================
  // FILTER + SORT (FIX URUT TANGGAL)
  // ==========================
  const list = data
    .filter(item => getMonthKey(item.tanggal) === currentMonth)
    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)); 
    // ↑ ASC (lama → baru)
    // kalau mau baru ke lama: balik jadi b - a

  let totalMasuk = 0;
  let totalKeluar = 0;

  list.forEach(item => {
    if (item.tipe === "masuk") totalMasuk += item.jumlah;
    else totalKeluar += item.jumlah;
  });

  const saldo = totalMasuk - totalKeluar;

  // ==========================
  // HALAMAN 1 - HEADER + SUMMARY
  // ==========================
  doc.setFontSize(18);
  doc.text("LAPORAN KEUANGAN", 14, 15);

  doc.setFontSize(11);
  doc.text(`Periode: ${formatBulanTahun(currentDate)}`, 14, 22);

  doc.text(`Pemasukan : ${formatRupiah(totalMasuk)}`, 14, 35);
  doc.text(`Pengeluaran : ${formatRupiah(totalKeluar)}`, 14, 42);
  doc.text(`Saldo : ${formatRupiah(saldo)}`, 14, 49);

  // CHART UTAMA
  try {
    const img = document.getElementById("myChart").toDataURL("image/png");
    doc.addImage(img, "PNG", 30, 60, 150, 100);
  } catch {}

  // ==========================
  // HALAMAN 2 - KATEGORI & OWNER
  // ==========================
  doc.addPage();

  doc.setFontSize(14);
  doc.text("Analisis Pengeluaran & Owner", 14, 15);

  try {
    const kategoriImg = document.getElementById("kategoriChart").toDataURL("image/png");
    doc.addImage(kategoriImg, "PNG", 15, 25, 80, 80);
  } catch {}

  try {
    const ownerImg = document.getElementById("ownerChart").toDataURL("image/png");
    doc.addImage(ownerImg, "PNG", 110, 25, 80, 80);
  } catch {}

  // ==========================
  // HALAMAN 3 - TREND
  // ==========================
  doc.addPage();

  doc.setFontSize(14);
  doc.text("Trend Pemasukan", 14, 15);

  try {
    const bulanImg = document.getElementById("bulanChart").toDataURL("image/png");
    doc.addImage(bulanImg, "PNG", 15, 30, 180, 100);
  } catch {}

  // ==========================
  // HALAMAN 4 - TABLE (SUDAH URUT)
  // ==========================
  doc.addPage();

  doc.setFontSize(14);
  doc.text("Detail Transaksi", 14, 15);

  const body = list.map(item => ([
    formatTanggalIndo(item.tanggal),   // ← ini tanggal biar jelas
    item.ket || "-",
    item.tipe || "-",
    item.kategori || "-",
    formatRupiah(item.jumlah || 0)
  ]));

  doc.autoTable({
    startY: 20,
    head: [["Tanggal", "Keterangan", "Tipe", "Kategori", "Jumlah"]],
    body: body,

    theme: "grid",

    styles: {
      fontSize: 8,
      cellPadding: 2
    },

    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255
    },

    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  doc.save(`Laporan-${currentMonth}.pdf`);
};

// ==========================
// FORMAT TANGGAL
// ==========================
function formatTanggalIndo(dateStr) {
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const d = new Date(dateStr);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ==========================
// INIT
// ==========================
window.addEventListener("load", () => {
  startRealtime();        // transaksi
  startCartRealtime();    // cart
  startTagihanRealtime(); // 🔥 tagihan
});

let mode = "bulanan";

// FIX ERROR: setMode is not defined
window.setMode = function (newMode) {
  mode = newMode;

  // optional UI active state
  document.querySelectorAll(".mode-btn")?.forEach(btn => {
    btn.classList.remove("active");
  });

  const active = document.querySelector(`[data-mode="${newMode}"]`);
  if (active) active.classList.add("active");

  render();
};

// OPTIONAL: helper biar aman kalau HTML panggil mode
window.getMode = function () {
  return mode;
};


if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    reg.update();
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}


// ==========================
// START REALTIME CART
// ==========================
function startCartRealtime() {
  fb.onSnapshot(fb.collection(db, "cart"), (snap) => {
    cart = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderCart();
  });
}
window.startCartRealtime = startCartRealtime;


// ==========================
// ADD ITEM
// ==========================
async function addCartItem() {
  const namaInput = document.getElementById("namaBelanja");
  if (!namaInput) return;

  const nama = namaInput.value.trim();
  if (!nama) return showToast("Tuku apa kauni!");

  await fb.addDoc(fb.collection(db, "cart"), {
    nama,
    harga: 0,
    checked: false,
    createdAt: new Date().toISOString()
  });

  namaInput.value = "";
}
window.addCartItem = addCartItem;


// ==========================
// TOGGLE CHECKBOX
// ==========================
async function toggleCart(index) {
  const item = cart[index];
  if (!item) return;

  await fb.updateDoc(
    fb.doc(db, "cart", item.id),
    { checked: !item.checked }
  );
}
window.toggleCart = toggleCart;


// ==========================
// UPDATE HARGA (NO LAG)
// ==========================
let cartTimeout;

function updateCartPriceDebounce(index, el) {
  clearTimeout(cartTimeout);

  cartTimeout = setTimeout(async () => {
    const item = cart[index];
    if (!item) return;

    const clean = parseInt((el.value || "").replace(/\D/g, ""));

    await fb.updateDoc(
      fb.doc(db, "cart", item.id),
      { harga: isNaN(clean) ? 0 : clean }
    );

  }, 300);
}
window.updateCartPriceDebounce = updateCartPriceDebounce;


// ==========================
// DELETE ITEM
// ==========================
async function removeCart(index) {
  const item = cart[index];
  if (!item) return;

  await fb.deleteDoc(fb.doc(db, "cart", item.id));
}
window.removeCart = removeCart;


// ==========================
// RENDER CART
// ==========================
function renderCart() {
  const tbody = document.getElementById("cartBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let total = 0;

  cart.forEach((item, i) => {
    if (item.checked) total += item.harga || 0;

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>

        <td>${item.nama}</td>

        <td>
          <input type="text"
            value="${item.harga ? formatRupiah(item.harga) : ""}"
            oninput="updateCartPriceDebounce(${i}, this)"
            placeholder="Rp">
        </td>

        <td>
          <input type="checkbox"
            ${item.checked ? "checked" : ""}
            onchange="toggleCart(${i})">
        </td>

        <td>
          <button onclick="removeCart(${i})">🗑️</button>
        </td>
      </tr>
    `;
  });

  const totalEl = document.getElementById("totalBelanja");
  if (totalEl) {
    totalEl.innerText = formatRupiah(total);
  }
}


// ==========================
// SAVE KE KEUANGAN
// ==========================
async function saveCartToFinance() {
  for (let item of cart) {
    if (!item.checked) continue;

    await addData({
      ket: item.nama,
      jumlah: item.harga || 0,
      tipe: "keluar",
      kategori: "Belanja",
      owner: "-",
      tanggal: new Date().toISOString()
    });

    await fb.deleteDoc(fb.doc(db, "cart", item.id));
  }

  showToast("Cihuyyy!");
}
window.saveCartToFinance = saveCartToFinance;
// ==========================
// TOAST SYSTEM (REPLACE showToast)
// ==========================
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.className = "toast " + type;
  toast.innerText = message;

  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
window.showToast = showToast;

function analyzeBoros() {
  const map = {};

  data.forEach(item => {
    if (item.tipe !== "keluar") return;

    const kategori = item.kategori || "lainnya";
    map[kategori] = (map[kategori] || 0) + (item.jumlah || 0);
  });

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1]); // terbesar ke kecil

  return sorted;
}

function renderBoros() {
  const result = analyzeBoros();
  const container = document.getElementById("borosList");
  if (!container) return;

  let html = "";

  result.forEach(([kategori, total], i) => {
    html += `
      <div class="boros-item">
        <span>#${i + 1} ${kategori}</span>
        <b>Rp ${total.toLocaleString("id-ID")}</b>
      </div>
    `;
  });

  container.innerHTML = html;

  // 🔥 AUTO HEIGHT CONTROL
  if (result.length > 5) {
    container.style.overflowY = "auto";
    container.style.maxHeight = "100px";
  } else {
    container.style.overflowY = "visible";
    container.style.maxHeight = "none";
  }
}

// ==========================
// TAGIHAN REALTIME (FINAL)
// ==========================
let tagihan = [];

// ==========================
// START REALTIME
// ==========================
function startTagihanRealtime() {
  fb.onSnapshot(fb.collection(db, "tagihan"), (snap) => {
    tagihan = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderTagihan();
  });
}
window.startTagihanRealtime = startTagihanRealtime;


// ==========================
// ADD TAGIHAN
// ==========================
async function addTagihan() {
  const namaEl = document.getElementById("tagihanNama");
  const tanggalEl = document.getElementById("tagihanTanggal");
  const hargaEl = document.getElementById("tagihanHarga");

  if (!namaEl || !tanggalEl || !hargaEl) return;

  const nama = namaEl.value.trim();
  const tanggal = tanggalEl.value;
  const harga = parseInt((hargaEl.value || "").replace(/\D/g, ""));

  if (!nama || !tanggal || isNaN(harga)) {
    return showToast("Isi Lahh boss!");
  }

  await fb.addDoc(fb.collection(db, "tagihan"), {
    nama,
    tanggal,
    harga,
    done: false,
    pushed: false,
    createdAt: new Date().toISOString()
  });

  namaEl.value = "";
  tanggalEl.value = "";
  hargaEl.value = "";
}
window.addTagihan = addTagihan;


// ==========================
// TOGGLE BAYAR
// ==========================
async function toggleTagihan(id) {
  const item = tagihan.find(t => t.id === id);
  if (!item) return;

  const newDone = !item.done;

  // update status dulu
  await fb.updateDoc(
    fb.doc(db, "tagihan", id),
    { done: newDone }
  );

  // 🔥 kalau jadi "dibayar" → masuk ke keuangan
  if (newDone && !item.pushed) {
    await addData({
      ket: item.nama,
      jumlah: item.harga,
      tipe: "keluar",
      kategori: "Tagihan",
      owner: "-",
      tanggal: new Date().toISOString()
    });

    await fb.updateDoc(
      fb.doc(db, "tagihan", id),
      { pushed: true }
    );
  }
}
window.toggleTagihan = toggleTagihan;


// ==========================
// DELETE
// ==========================
async function deleteTagihan(id) {
  await fb.deleteDoc(fb.doc(db, "tagihan", id));
}
window.deleteTagihan = deleteTagihan;


// ==========================
// FORMAT INPUT RUPIAH
// ==========================
document.addEventListener("input", (e) => {
  if (e.target.id === "tagihanHarga") {
    let v = e.target.value.replace(/\D/g, "");
    if (!v) return (e.target.value = "");
    e.target.value = formatRupiah(parseInt(v));
  }
});


// ==========================
// RENDER
// ==========================
function renderTagihan() {
  const aktifBox = document.getElementById("tagihanBody");
  const doneBox = document.getElementById("tagihanDone");

  if (!aktifBox) return;

  aktifBox.innerHTML = "";
  if (doneBox) doneBox.innerHTML = "";

  const now = new Date();

  tagihan.forEach(t => {
    const telat = new Date(t.tanggal) < now && !t.done;

    // ======================
    // BELUM BAYAR
    // ======================
    if (!t.done) {
      aktifBox.innerHTML += `
        <div class="note ${telat ? "danger" : ""}">
          <div class="note-title">${t.nama}</div>
          <div class="note-date">📅 ${t.tanggal}</div>
          <div class="note-date">${formatRupiah(t.harga)}</div>

          <div class="note-action">
            <label>
              <input type="checkbox"
                onchange="toggleTagihan('${t.id}')">
              Bayar
            </label>

            <button onclick="deleteTagihan('${t.id}')">🗑️</button>
          </div>
        </div>
      `;
    }

    // ======================
    // SUDAH BAYAR
    // ======================
    else if (doneBox) {
      doneBox.innerHTML += `
        <div class="note done">
          <div class="note-title">${t.nama}</div>
          <div class="note-date">✔ ${formatRupiah(t.harga)}</div>

          <div class="note-action">
            <button onclick="deleteTagihan('${t.id}')">
              🗑️ Hapus
            </button>
          </div>
        </div>
      `;
    }
  });
}