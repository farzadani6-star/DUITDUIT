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

// 🔥 TAMBAHAN OWNER
const ownerSelect = document.getElementById("owner");

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
  return "Rp " + angka.toLocaleString("id-ID");
}

// ==========================
// INPUT FORMAT
// ==========================
const ketInput = document.getElementById("ket");
const jumlahInput = document.getElementById("jumlah");

jumlahInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) return (e.target.value = "");
  e.target.value = formatRupiah(parseInt(value));
});

// ==========================
// CHART UTAMA
// ==========================
const ctx = document.getElementById("myChart").getContext("2d");

let chart = new Chart(ctx, {
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
const ctxKategori = document.getElementById("kategoriChart").getContext("2d");

let kategoriChart = new Chart(ctxKategori, {
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
// 🔥 CHART OWNER BARU
// ==========================
const ctxOwner = document.getElementById("ownerChart").getContext("2d");

let ownerChart = new Chart(ctxOwner, {
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
// WARNA
// ==========================
function generateColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.floor((360 / count) * i);
    colors.push(`hsl(${hue},70%,55%)`);
  }
  return colors;
}

// ==========================
// SHOW/HIDE KATEGORI
// ==========================
tipeSelect.addEventListener("change", () => {
  kategoriSelect.style.display =
    tipeSelect.value === "keluar" ? "block" : "none";
});

// ==========================
// FIREBASE
// ==========================
async function loadData() {
  try {
    const snap = await fb.getDocs(fb.collection(db, "transaksi"));

    data = [];

    snap.forEach(docSnap => {
      data.push({ id: docSnap.id, ...docSnap.data() });
    });

    saveCache();
    render();

  } catch (err) {
    console.error("Firebase gagal load:", err);

    // fallback ke cache
    loadCache();
  }
}

async function addData(item) {
  await fb.addDoc(fb.collection(db, "transaksi"), item);
}

async function updateData(index, newData) {
  const id = data[index].id;
  await fb.updateDoc(fb.doc(db, "transaksi", id), newData);
}

async function deleteData(index) {
  const id = data[index].id;

  if (confirm("Hapus transaksi?")) {
    await fb.deleteDoc(fb.doc(db, "transaksi", id));

    data.splice(index, 1);
    saveCache();
    render();
  }
}

// ==========================
// GOOGLE SHEET SYNC
// ==========================
async function kirimKeSheet(item) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  } catch (err) {
    console.error("Sheet Error:", err);
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

  // 🔥 TAMBAHAN OWNER
  const owner = tipe === "masuk" ? ownerSelect.value : "-";

  const item = {
    id: editIndex !== null ? data[editIndex].id : Date.now().toString(),
    ket,
    jumlah,
    tipe,
    kategori,
    owner,
    tanggal: new Date().toISOString()
  };

  if (editIndex === null) {
    await addData(item);
    data.push(item);
  } else {
    await updateData(editIndex, item);
    data[editIndex] = item;
    editIndex = null;
  }

  kirimKeSheet(item);

  saveCache();
  render();

  form.reset();
  kategoriSelect.style.display = "none";
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

  let totalMasuk = 0;
  let totalKeluar = 0;

  let kategoriMap = {};
  let ownerMap = { sulala: 0, surere: 0 };

  data.forEach((item, index) => {
    if (item.tipe === "masuk") {
      totalMasuk += item.jumlah;

      // 🔥 OWNER CHART
      if (item.owner === "sulala") ownerMap.sulala += item.jumlah;
      if (item.owner === "surere") ownerMap.surere += item.jumlah;
    } else {
      totalKeluar += item.jumlah;

      if (!kategoriMap[item.kategori]) {
        kategoriMap[item.kategori] = 0;
      }
      kategoriMap[item.kategori] += item.jumlah;
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ket}</td>
      <td>${item.tipe}</td>
      <td>${item.kategori}</td>
      <td>${formatRupiah(item.jumlah)}</td>
      <td>
        <button onclick="editData(${index})">✏️</button>
        <button onclick="deleteData(${index})">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  const saldo = totalMasuk - totalKeluar;

  totalMasukEl.innerText = formatRupiah(totalMasuk);
  totalKeluarEl.innerText = formatRupiah(totalKeluar);
  saldoEl.innerText = formatRupiah(saldo);

  // chart utama
  chart.data.datasets[0].data = [totalMasuk, totalKeluar];
  chart.update();

  // kategori chart
  kategoriChart.data.labels = Object.keys(kategoriMap);
  kategoriChart.data.datasets[0].data = Object.values(kategoriMap);
  kategoriChart.data.datasets[0].backgroundColor =
    generateColors(Object.keys(kategoriMap).length);
  kategoriChart.update();

  // 🔥 OWNER CHART
  ownerChart.data.datasets[0].data = [
    ownerMap.sulala,
    ownerMap.surere
  ];
  ownerChart.update();

  saveCache();
}

// ==========================
// INIT
// ==========================
loadCache();
loadData();
