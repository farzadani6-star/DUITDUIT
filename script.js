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
// DATA
// ==========================
let data = [];
let editIndex = null;

// ==========================
// CACHE LOCAL STORAGE
// ==========================
function saveCache() {
  localStorage.setItem("transaksi_cache", JSON.stringify(data));
}

function loadCache() {
  const cache = localStorage.getItem("transaksi_cache");
  if (cache) {
    data = JSON.parse(cache);
    render();
  }
}

// ==========================
// FORMAT RUPIAH
// ==========================
function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

// ==========================
// INPUT FORMAT
// ==========================
jumlahInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) return (e.target.value = "");
  e.target.value = formatRupiah(parseInt(value));
});

// ==========================
// CHART UTAMA
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

// ==========================
// CHART KATEGORI
// ==========================
const kategoriChart = new Chart(document.getElementById("kategoriChart"), {
  type: "pie",
  data: {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  }
});

// ==========================
// CHART OWNER
// ==========================
const ownerChart = new Chart(document.getElementById("ownerChart"), {
  type: "bar",
  data: {
    labels: ["SULALA", "SURERE"],
    datasets: [{
      data: [0, 0],
      backgroundColor: ["#3b82f6", "#f97316"]
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
// FIREBASE LOAD (FIX AMAN)
// ==========================
async function loadData() {
  try {
    console.log("Loading Firestore...");

    const snap = await fb.getDocs(fb.collection(db, "transaksi"));

    data = [];

    snap.forEach(docSnap => {
      data.push({ id: docSnap.id, ...docSnap.data() });
    });

    console.log("DATA LOADED:", data.length);

    saveCache();
    render();

  } catch (err) {
    console.error("Firebase gagal load:", err);
    loadCache();
  }
}

// ==========================
// FIREBASE CRUD
// ==========================
async function addData(item) {
  await fb.addDoc(fb.collection(db, "transaksi"), item);
}

async function updateData(id, item) {
  await fb.updateDoc(fb.doc(db, "transaksi", id), item);
}

async function deleteData(index) {
  const id = data[index].id;

  if (confirm("Hapus transaksi?")) {
    await fb.deleteDoc(fb.doc(db, "transaksi", id));
    await loadData();
  }
}

// ==========================
// SHEET SYNC
// ==========================
async function kirimKeSheet(item) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  } catch (err) {
    console.error("Sheet error:", err);
  }
}

// ==========================
// SUBMIT
// ==========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const ket = ketInput.value;
  const jumlah = parseInt(jumlahInput.value.replace(/\D/g, ""));
  const tipe = tipeSelect.value;
  const kategori = tipe === "keluar" ? kategoriSelect.value : "-";
  const owner = tipe === "masuk" ? ownerSelect.value : "-";

  const item = {
    ket,
    jumlah,
    tipe,
    kategori,
    owner,
    tanggal: new Date().toISOString()
  };

  if (editIndex === null) {
    await addData(item);
  } else {
    const id = data[editIndex].id;
    await updateData(id, item);
    editIndex = null;
  }

  kirimKeSheet(item);

  form.reset();
  kategoriSelect.style.display = "none";

  await loadData(); // 🔥 FIX WAJIB (SYNC REAL FIREBASE)
});

// ==========================
// EDIT
// ==========================
function editData(index) {
  const item = data[index];

  ketInput.value = item.ket;
  jumlahInput.value = formatRupiah(item.jumlah);
  tipeSelect.value = item.tipe;

  if (item.tipe === "keluar") {
    kategoriSelect.style.display = "block";
    kategoriSelect.value = item.kategori;
  }

  ownerSelect.value = item.owner || "";

  editIndex = index;
}

// ==========================
// RENDER
// ==========================
function render() {
  tbody.innerHTML = "";

  let masuk = 0;
  let keluar = 0;

  let kategoriMap = {};
  let ownerMap = { sulala: 0, surere: 0 };

  data.forEach((item, i) => {
    if (item.tipe === "masuk") {
      masuk += item.jumlah;

      if (item.owner === "sulala") ownerMap.sulala += item.jumlah;
      if (item.owner === "surere") ownerMap.surere += item.jumlah;
    } else {
      keluar += item.jumlah;

      kategoriMap[item.kategori] =
        (kategoriMap[item.kategori] || 0) + item.jumlah;
    }

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.ket}</td>
        <td>${item.tipe}</td>
        <td>${item.kategori}</td>
        <td>${formatRupiah(item.jumlah)}</td>
        <td>
          <button onclick="editData(${i})">✏️</button>
          <button onclick="deleteData(${i})">🗑️</button>
        </td>
      </tr>
    `;
  });

  totalMasukEl.textContent = formatRupiah(masuk);
  totalKeluarEl.textContent = formatRupiah(keluar);
  saldoEl.textContent = formatRupiah(masuk - keluar);

  chart.data.datasets[0].data = [masuk, keluar];
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

  saveCache();
}

// ==========================
// INIT (FIX RACE CONDITION)
// ==========================
window.addEventListener("load", () => {
  loadCache();
  loadData();
});
