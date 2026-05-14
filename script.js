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
window.addEventListener(
  "load",
  () => {

    const tabunganJumlahInput =

      document.getElementById(
        "tabunganJumlah"
      );

    if(!tabunganJumlahInput)
      return;

    tabunganJumlahInput
      .addEventListener(
        "input",
        (e) => {

          let value =

            e.target.value
            .replace(/\D/g,"");

          if(!value){

            e.target.value = "";

            return;

          }

          e.target.value =

            Number(value)
            .toLocaleString(
              "id-ID"
            );

        }
      );

  }
);
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

  // ==========================
  // PENGUIN REF
  // ==========================
  const penguinRef =

    fb.doc(
      db,
      "game",
      "penguin"
    );

  // ==========================
  // REALTIME TRANSAKSI
  // ==========================
  fb.onSnapshot(

    fb.collection(
      db,
      "transaksi"
    ),

    (snap) => {

      data = snap.docs.map(d => {

        const raw =
          d.data();

        return {

          id:d.id,

          ...raw,

          tanggal:
            raw.tanggal ||
            new Date()
            .toISOString()

        };

      });

      // urut
      data.sort(
        (a,b)=>

        new Date(a.tanggal)
        -
        new Date(b.tanggal)
      );

      // render
      render(
        penguinRef
      );

    }

  );

  // ==========================
  // REALTIME COIN
  // ==========================
  fb.onSnapshot(

    penguinRef,

    (snap) => {

      if(
        snap.exists()
      ){

        const data =
          snap.data();

        penguinCoin =
          data.coin || 0;

        updateCoinUI();

      }

    }

  );

  // ==========================
  // REALTIME TABUNGAN
  // ==========================
  fb.onSnapshot(

    fb.collection(
      db,
      "tabungan"
    ),

    (snapshot) => {

      tabunganData =

        snapshot.docs.map(doc => ({

          id:doc.id,

          ...doc.data()

        }));

      setTimeout(() => {

        renderTabungan();

      },100);

    }

  );

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

const selectedDate =
  tanggalInput.value;

let finalTanggal;

// kalau user pilih tanggal
if(selectedDate){

  const now = new Date();

  const [year, month, day] =
    selectedDate.split("-");

  finalTanggal = new Date(

    year,

    month - 1,

    day,

    now.getHours(),

    now.getMinutes(),

    now.getSeconds()

  ).toISOString();

} else {

  finalTanggal =
    new Date().toISOString();

}

const item = {

  ket: ketInput.value,

  jumlah: parseInt(
    jumlahInput.value.replace(/\D/g, "")
  ),

  tipe: tipeSelect.value,

  kategori:
    tipeSelect.value === "keluar"
    ? kategoriSelect.value
    : "-",

  owner:
    tipeSelect.value === "masuk"
    ? ownerSelect.value
    : "-",

  tanggal: finalTanggal

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
let penguinCoin = 0;

let lastIncomeCount = 0;

let firstLoadIncome = true;
let saldoGlobal = 0;

function render(
  penguinRef
){
  tbody.innerHTML = "";

  let totalMasukGlobal = 0;
  let totalKeluarGlobal = 0;

  let totalMasukBulan = 0;
  let totalKeluarBulan = 0;

  let kategoriMap = {};

  let ownerMap = {
    sulala: 0,
    surere: 0
  };

  let bulanMap = {};

  const currentMonth =
    getMonthKey(currentDate);

  // ==========================
  // FILTER + SORT
  // ==========================
  const list = data
    .filter(i =>
      cleanDate(i.tanggal)
      === currentDate
    )
    .sort((a,b)=>
      new Date(a.tanggal) -
      new Date(b.tanggal)
    );

  let no = 1;

  // ==========================
  // HEADER TANGGAL
  // ==========================
  tbody.innerHTML = `

    <tr
      class="date-row"
      onclick="openDatePicker()"
    >

      <td colspan="7">

        <button
          onclick="
            event.stopPropagation();
            changeDate(-1)
          "
        >
          <
        </button>

        📅
        ${formatTanggalIndo(currentDate)}

        <button
          onclick="
            event.stopPropagation();
            changeDate(1)
          "
        >
          >
        </button>

        <input
          type="date"
          id="datePickerHidden"
          value="${currentDate}"

          style="
            position:fixed;
            bottom:0;
            left:0;
            opacity:0;
          "
        >

      </td>

    </tr>

  `;

  // ==========================
  // HITUNG TOTAL
  // ==========================
  data.forEach(item => {

    const d =
      new Date(item.tanggal);

    const itemMonth =
      getMonthKey(item.tanggal);

    // global
    if(item.tipe === "masuk"){

      totalMasukGlobal +=
        item.jumlah;

    } else {

      totalKeluarGlobal +=
        item.jumlah;

    }

    // bulanan
    if(itemMonth === currentMonth){

      // pemasukan
      if(item.tipe === "masuk"){

        totalMasukBulan +=
          item.jumlah;

        if(item.owner === "sulala"){

          ownerMap.sulala +=
            item.jumlah;

        }

        if(item.owner === "surere"){

          ownerMap.surere +=
            item.jumlah;

        }

        bulanMap[d.getMonth()] =

          (
            bulanMap[d.getMonth()]
            || 0
          )

          + item.jumlah;

      }

      // pengeluaran
      if(item.tipe === "keluar"){

        totalKeluarBulan +=
          item.jumlah;

        kategoriMap[item.kategori] =

          (
            kategoriMap[item.kategori]
            || 0
          )

          + item.jumlah;

      }

    }

  });

  // ==========================
  // RENDER TABLE
  // ==========================
  list.forEach(item => {

    // jam
    const jam =
      new Date(item.tanggal)
      .toLocaleTimeString(
        "id-ID",
        {
          hour:"2-digit",
          minute:"2-digit"
        }
      );

    tbody.innerHTML += `

      <tr>

        <td>
          ${no++}
        </td>

        <td>

          <div>
            ${item.ket}
          </div>

          <small
            style="
              opacity:.6;
              font-size:11px;
            "
          >
            ${jam}
          </small>

        </td>

<td class="${item.tipe}">
  ${item.tipe}
</td>

<td>
  ${item.owner || "-"}
</td>

<td>
  ${item.kategori}
</td>

        <td>
          ${formatRupiah(item.jumlah)}
        </td>

        <td>

          <button
            onclick="editData('${item.id}')"
          >
            ✏️
          </button>

          <button
            onclick="deleteData('${item.id}')"
          >
            🗑️
          </button>

        </td>

      </tr>

    `;

  });

  // ==========================
  // SALDO
  // ==========================
  const saldo =
    totalMasukGlobal -
    totalKeluarGlobal;

  saldoGlobal = saldo;

  // ==========================
  // UPDATE UI
  // ==========================
  totalMasukEl.textContent =
    formatRupiah(totalMasukBulan);

  totalKeluarEl.textContent =
    formatRupiah(totalKeluarBulan);

  saldoEl.textContent =
    formatRupiah(saldo);


// 🔥 paling bawah
updatePenguinMood();
  // ==========================
  // CHART UTAMA
  // ==========================
  chart.data.datasets[0].data = [
    totalMasukBulan,
    totalKeluarBulan
  ];

  chart.update();

  // ==========================
  // KATEGORI CHART
  // ==========================
  kategoriChart.data.labels =
    Object.keys(kategoriMap);

  kategoriChart.data.datasets[0].data =
    Object.values(kategoriMap);

  kategoriChart.data.datasets[0].backgroundColor =
    generateColors(
      Object.keys(kategoriMap).length
    );

  kategoriChart.update();

  // ==========================
  // OWNER CHART
  // ==========================
  ownerChart.data.datasets[0].data = [

    ownerMap.sulala,

    ownerMap.surere

  ];

  ownerChart.update();
  
// ==========================
// CEK PEMASUKAN BESAR
// ==========================
const incomeList =

  data.filter(
    i => i.tipe === "masuk"
  );

// skip awal load
if(firstLoadIncome){

  lastIncomeCount =
    incomeList.length;

  firstLoadIncome =
    false;

}

// pemasukan baru
else if(

  incomeList.length >
  lastIncomeCount

){

  // ambil terakhir
  const latestIncome =

    incomeList[
      incomeList.length - 1
    ];

  // jumlah number
  const jumlahMasuk =

    Number(
      latestIncome.jumlah
    );

  // minimal 100rb
  if(
    jumlahMasuk >= 100000
  ){

    // animasi
    penguinHappy();

    // tambah coin firestore
fb.setDoc(

  penguinRef,

  {

    coin:
      penguinCoin + 50

  },

  {
    merge:true
  }

);

    console.log(
      "🪙 Coin bertambah!"
    );

  }

  // update counter
  lastIncomeCount =
    incomeList.length;

}
  // ==========================
  // BULAN CHART
  // ==========================
  const namaBulan = [

    "Jan","Feb","Mar","Apr",

    "Mei","Jun","Jul","Agu",

    "Sep","Okt","Nov","Des"

  ];

  bulanChart.data.labels =

    Object.keys(bulanMap)
    .map(i => namaBulan[i]);

  bulanChart.data.datasets[0].data =

    Object.values(bulanMap);

  bulanChart.update();

  // ==========================
  // BOROS
  // ==========================
  renderBoros();

  // ==========================
  // TABUNGAN
  // ==========================
  if(typeof updateTabunganUI
    === "function") {

    updateTabunganUI();

  }

  // ==========================
  // SALDO GOAL
  // ==========================
  const saldoGoalEl =
    document.getElementById(
      "saldoGoalText"
    );

  if(saldoGoalEl){

    saldoGoalEl.textContent =
      formatRupiah(saldoGlobal);

  }

}

// ==========================
// EXPORT PDF + excel (FINAL FIX)
// ==========================
window.exportPDF = function () {

  const { jsPDF } = window.jspdf;

  const doc =
    new jsPDF("p", "mm", "a4");

  const currentMonth =
    getMonthKey(currentDate);

  // ==========================
  // FILTER + SORT
  // ==========================
  const list = data
    .filter(item =>
      getMonthKey(item.tanggal)
      === currentMonth
    )
    .sort((a,b)=>
      new Date(a.tanggal) -
      new Date(b.tanggal)
    );

  // ==========================
  // TOTAL
  // ==========================
  let totalMasuk = 0;
  let totalKeluar = 0;

  list.forEach(item => {

    if(item.tipe === "masuk"){

      totalMasuk += item.jumlah;

    } else {

      totalKeluar += item.jumlah;

    }

  });

  const saldo =
    totalMasuk - totalKeluar;

  // ==========================
  // HEADER
  // ==========================
  doc.setFillColor(30,41,59);

  doc.rect(
    0,
    0,
    210,
    35,
    "F"
  );

  doc.setTextColor(255);

  doc.setFontSize(22);

  doc.text(
    "LAPORAN KEUANGAN",
    14,
    18
  );

  doc.setFontSize(11);

  doc.text(
    `Periode: ${formatBulanTahun(currentDate)}`,
    14,
    27
  );

  // ==========================
  // SUMMARY BOX
  // ==========================
  doc.setTextColor(0);

  const summaryY = 48;

  const cards = [

    {
      title:"Pemasukan",
      value:formatRupiah(totalMasuk),
      color:[34,197,94]
    },

    {
      title:"Pengeluaran",
      value:formatRupiah(totalKeluar),
      color:[239,68,68]
    },

    {
      title:"Saldo",
      value:formatRupiah(saldo),
      color:[59,130,246]
    }

  ];

  cards.forEach((c,i)=>{

    const x =
      14 + (i * 63);

    doc.setFillColor(...c.color);

    doc.roundedRect(
      x,
      summaryY,
      56,
      28,
      4,
      4,
      "F"
    );

    doc.setTextColor(255);

    doc.setFontSize(10);

    doc.text(
      c.title,
      x + 4,
      summaryY + 9
    );

    doc.setFontSize(13);

    doc.text(
      c.value,
      x + 4,
      summaryY + 19
    );

  });

  // ==========================
  // CHART
  // ==========================
  try {

    const chartImg =
      document
      .getElementById("myChart")
      .toDataURL("image/png");

    doc.addImage(
      chartImg,
      "PNG",
      35,
      88,
      140,
      90
    );

  } catch {}

  // ==========================
  // HALAMAN 2
  // ==========================
  doc.addPage();

  doc.setFontSize(16);

  doc.text(
    "Analisis Pengeluaran",
    14,
    16
  );

  try {

    const kategoriImg =
      document
      .getElementById("kategoriChart")
      .toDataURL("image/png");

    doc.addImage(
      kategoriImg,
      "PNG",
      12,
      28,
      85,
      85
    );

  } catch {}

  try {

    const ownerImg =
      document
      .getElementById("ownerChart")
      .toDataURL("image/png");

    doc.addImage(
      ownerImg,
      "PNG",
      108,
      28,
      85,
      85
    );

  } catch {}

  // ==========================
  // BOROS
  // ==========================
  const kategoriMap = {};

  list.forEach(item => {

    if(item.tipe === "keluar"){

      kategoriMap[item.kategori] =
        (kategoriMap[item.kategori] || 0)
        + item.jumlah;

    }

  });

  const borosRank =
    Object.entries(kategoriMap)
    .sort((a,b)=>
      b[1] - a[1]
    );

  let borosY = 132;

  doc.setFontSize(13);

  doc.text(
    "Kategori Paling Boros",
    14,
    borosY
  );

  borosY += 10;

  borosRank
    .slice(0,5)
    .forEach(([nama,total],i)=>{

      doc.setFontSize(11);

      doc.text(
        `#${i+1} ${nama}`,
        18,
        borosY
      );

      doc.text(
        formatRupiah(total),
        140,
        borosY
      );

      borosY += 8;

    });

  // ==========================
  // HALAMAN 3
  // ==========================
  doc.addPage();

  doc.setFontSize(16);

  doc.text(
    "Trend Pemasukan",
    14,
    16
  );

  try {

  const tempCanvas =
    document.createElement("canvas");

  tempCanvas.width = 800;
  tempCanvas.height = 400;

  const tempCtx =
    tempCanvas.getContext("2d");

  new Chart(tempCtx, {
    type: "bar",
    data: {
      labels: bulanChart.data.labels,
      datasets: bulanChart.data.datasets
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          position: "top"
        }
      }
    }
  });

  const img =
    tempCanvas.toDataURL("image/png");

  doc.setFontSize(14);

  doc.text(
    "📊 Pemasukan Bulanan (Sulala vs Surere)",
    14,
    18
  );

  doc.addImage(
    img,
    "PNG",
    12,
    25,
    185,
    80
  );

} catch (e) {}

  // ==========================
  // GOALS
  // ==========================
  if(typeof goals !== "undefined"){

    let y = 145;

    doc.setFontSize(15);

    doc.text(
      "Progress Goals",
      14,
      y
    );

    y += 10;

    goals.forEach(goal => {

      const percent =
        Math.min(
          (
            goal.terkumpul /
            goal.target
          ) * 100,
          100
        );

      // bg
      doc.setFillColor(230,230,230);

      doc.roundedRect(
        14,
        y,
        160,
        7,
        3,
        3,
        "F"
      );

      // fill
      doc.setFillColor(
        59,
        130,
        246
      );

      doc.roundedRect(
        14,
        y,
        160 * (percent / 100),
        7,
        3,
        3,
        "F"
      );

      doc.setTextColor(0);

      doc.setFontSize(11);

      doc.text(
        `${goal.nama} (${Math.round(percent)}%)`,
        14,
        y - 2
      );

      doc.text(
        `${formatRupiah(goal.terkumpul)} / ${formatRupiah(goal.target)}`,
        14,
        y + 14
      );

      y += 28;

    });

  }

  // ==========================
  // HALAMAN TABLE
  // ==========================
  doc.addPage();

  doc.setFontSize(16);

  doc.text(
    "Detail Transaksi",
    14,
    16
  );

  // ==========================
  // BODY TABLE
  // ==========================
  const body =
    list.map((item,index) => {

      const tanggal =
        new Date(item.tanggal);

      const tanggalText =
        tanggal.toLocaleDateString(
          "id-ID",
          {
            day:"2-digit",
            month:"2-digit",
            year:"numeric"
          }
        );

      const jamText =
        tanggal.toLocaleTimeString(
          "id-ID",
          {
            hour:"2-digit",
            minute:"2-digit"
          }
        );

      return [

        index + 1,

        `${tanggalText}\n${jamText}`,

        item.ket || "-",

        item.tipe || "-",

        item.kategori || "-",

        formatRupiah(item.jumlah || 0)

      ];

    });

  // ==========================
  // TABLE
  // ==========================
  doc.autoTable({

    startY: 24,

    head: [[
      "No",
      "Tanggal & Jam",
      "Keterangan",
      "Tipe",
      "Kategori",
      "Jumlah"
    ]],

    body: body,

    theme:"grid",

    styles:{
      fontSize:8,
      cellPadding:2,
      valign:"middle"
    },

    headStyles:{
      fillColor:[30,41,59],
      textColor:255
    },

    alternateRowStyles:{
      fillColor:[245,245,245]
    },

    columnStyles:{

      0:{ cellWidth:10 },

      1:{ cellWidth:28 },

      2:{ cellWidth:55 },

      3:{ cellWidth:22 },

      4:{ cellWidth:30 },

      5:{ cellWidth:35 }

    }

  });

  // ==========================
  // SAVE
  // ==========================
  doc.save(
    `Laporan-${currentMonth}.pdf`
  );

};


window.exportExcel = function () {

  const currentMonth =
    getMonthKey(currentDate);

  // ==========================
  // FILTER + SORT
  // ==========================
  const list = data
    .filter(item =>
      getMonthKey(item.tanggal)
      === currentMonth
    )
    .sort((a,b)=>
      new Date(a.tanggal) -
      new Date(b.tanggal)
    );

  // ==========================
  // TOTAL
  // ==========================
  let totalMasuk = 0;
  let totalKeluar = 0;

  list.forEach(item => {

    if(item.tipe === "masuk"){

      totalMasuk += item.jumlah;

    } else {

      totalKeluar += item.jumlah;

    }

  });

  const saldo =
    totalMasuk - totalKeluar;

  // ==========================
  // WORKBOOK
  // ==========================
  const wb = XLSX.utils.book_new();

  // ==========================
  // SHEET SUMMARY
  // ==========================
  const summaryData = [

    ["LAPORAN KEUANGAN"],
    ["Periode", formatBulanTahun(currentDate)],
    [],

    ["Pemasukan", totalMasuk],
    ["Pengeluaran", totalKeluar],
    ["Saldo", saldo]

  ];

  const wsSummary =
    XLSX.utils.aoa_to_sheet(summaryData);

  wsSummary["!cols"] = [
    { wch: 20 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(
    wb,
    wsSummary,
    "Summary"
  );

  // ==========================
  // SHEET TRANSAKSI
  // ==========================
  const transaksiData = [

    [
      "No",
      "Tanggal",
      "Jam",
      "Keterangan",
      "Tipe",
      "Kategori",
      "Jumlah"
    ]

  ];

  list.forEach((item,index)=>{

    const tgl =
      new Date(item.tanggal);

    const tanggal =
      tgl.toLocaleDateString(
        "id-ID"
      );

    const jam =
      tgl.toLocaleTimeString(
        "id-ID",
        {
          hour:"2-digit",
          minute:"2-digit"
        }
      );

    transaksiData.push([

      index + 1,

      tanggal,

      jam,

      item.ket || "-",

      item.tipe || "-",

      item.kategori || "-",

      item.jumlah || 0

    ]);

  });

  const wsTransaksi =
    XLSX.utils.aoa_to_sheet(transaksiData);

  wsTransaksi["!cols"] = [

    { wch: 8 },
    { wch: 15 },
    { wch: 10 },
    { wch: 35 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 }

  ];

  XLSX.utils.book_append_sheet(
    wb,
    wsTransaksi,
    "Transaksi"
  );

  // ==========================
  // SHEET BOROS
  // ==========================
  const kategoriMap = {};

  list.forEach(item => {

    if(item.tipe === "keluar"){

      kategoriMap[item.kategori] =
        (kategoriMap[item.kategori] || 0)
        + item.jumlah;

    }

  });

  const borosRank =
    Object.entries(kategoriMap)
    .sort((a,b)=>
      b[1] - a[1]
    );

  const borosData = [

    ["Ranking", "Kategori", "Total"]

  ];

  borosRank.forEach((item,index)=>{

    borosData.push([

      "#" + (index + 1),

      item[0],

      item[1]

    ]);

  });

  const wsBoros =
    XLSX.utils.aoa_to_sheet(borosData);

  wsBoros["!cols"] = [

    { wch: 12 },
    { wch: 25 },
    { wch: 20 }

  ];

  XLSX.utils.book_append_sheet(
    wb,
    wsBoros,
    "Boros"
  );

  // ==========================
  // SHEET GOALS
  // ==========================
  if(typeof goals !== "undefined"){

    const goalsData = [

      [
        "Nama Goal",
        "Terkumpul",
        "Target",
        "Progress"
      ]

    ];

    goals.forEach(goal => {

      const percent =
        Math.min(
          (
            goal.terkumpul /
            goal.target
          ) * 100,
          100
        );

      goalsData.push([

        goal.nama,

        goal.terkumpul,

        goal.target,

        Math.round(percent) + "%"

      ]);

    });

    const wsGoals =
      XLSX.utils.aoa_to_sheet(goalsData);

    wsGoals["!cols"] = [

      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 }

    ];

    XLSX.utils.book_append_sheet(
      wb,
      wsGoals,
      "Goals"
    );

  }

  // ==========================
  // EXPORT
  // ==========================
  XLSX.writeFile(
    wb,
    `Keuangan-${currentMonth}.xlsx`
  );

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
  startGalleryRealtime(); 
  
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

function renderBoros(){

  const borosList =
    document.getElementById("borosList");

  if(!borosList) return;

  borosList.innerHTML = "";

  const currentMonth =
    getMonthKey(currentDate);

  const kategoriMap = {};

  // GROUPING
  data.forEach(item => {

    if(
      item.tipe === "keluar" &&
      getMonthKey(item.tanggal) === currentMonth
    ){

      if(!kategoriMap[item.kategori]){

        kategoriMap[item.kategori] = {
          total:0,
          items:[]
        };

      }

      kategoriMap[item.kategori].total +=
        item.jumlah;

      kategoriMap[item.kategori].items.push(item);

    }

  });

  // SORT
  const sorted =
    Object.entries(kategoriMap)
    .sort((a,b)=>
      b[1].total - a[1].total
    );

  // EMPTY
  if(sorted.length === 0){

    borosList.innerHTML =
      "<p>Belum ada pengeluaran 😄</p>";

    return;

  }

  // RENDER
  sorted.forEach(([kategori,info],index)=>{

    const id =
      "detail-" + index;

    borosList.innerHTML += `

      <div class="boros-card">

        <div class="boros-top">

          <div class="boros-kiri">

            <div class="boros-rank">
              #${index + 1}
            </div>

            <div class="boros-kategori">
              ${kategori}
            </div>

          </div>

          <div class="boros-total">
            ${formatRupiah(info.total)}
          </div>

        </div>

        <button
          class="boros-btn"
          onclick="toggleBoros('${id}')"
        >
          Lihat Detail
        </button>

        <div
          class="boros-detail"
          id="${id}"
        >

          ${info.items.map(item => `

            <div class="boros-detail-item">

              • ${item.ket}
              —
              ${formatRupiah(item.jumlah)}

            </div>

          `).join("")}

        </div>

      </div>

    `;

  });

}

function toggleBoros(id){

  const el =
    document.getElementById(id);

  if(!el) return;

  el.classList.toggle("show");

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

const tanggalInput = document.getElementById("tanggalInput");

if (tanggalInput) {
  tanggalInput.value = new Date().toISOString().split("T")[0];
}

function setPage(page) {
  const index = pages.indexOf(page);
  if (index !== -1) {
    goToPage(index);
  }
}
window.setPage = setPage;


let photos = [];
let latestPhoto = null;

// ==========================
// INIT REALTIME
// ==========================
function startGalleryRealtime() {
  fb.onSnapshot(fb.collection(db, "gallery"), (snap) => {
    photos = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log("PHOTOS:", photos);

    renderGallery();
  });
}

// ==========================
// OPEN FILE PICKER
// ==========================
function openUpload() {
  document.getElementById("photoInput")?.click();
}
window.openUpload = openUpload;

// ==========================
// HANDLE UPLOAD (FIXED CLEAN)
// ==========================
window.addEventListener("load", () => {
  const photoInput = document.getElementById("photoInput");

  if (!photoInput) return;

photoInput.addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    console.log("SMART COMPRESS START");

    const compressed = await compressImageSmart(file, 700);

    console.log("FINAL SIZE:", Math.round(compressed.length / 1024), "KB");

    await fb.addDoc(fb.collection(db, "gallery"), {
      url: compressed,
      date: new Date().toISOString()
    });

    console.log("UPLOAD SUCCESS");

  } catch (err) {
    console.error(err);
    showToast("Upload gagal");
  }

  e.target.value = "";
});
});

// ==========================
// RENDER GALLERY + HERO
// ==========================
let slideIndex = 0;
let slideInterval;

function renderGallery() {
  let startX = 0;
let isTouching = false;


  const el = document.getElementById("gallery");
  const hero = document.getElementById("heroPhoto");

  if (!el || !hero) return;

  el.innerHTML = "";

  if (photos.length === 0) {
    hero.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999">
        fotoo dulss gasii 💙
      </div>
    `;
    return;
  }

  // ==========================
  // HERO SLIDESHOW
  // ==========================
  function showSlide(index) {
    slideIndex = (index + photos.length) % photos.length;

    hero.innerHTML = `
      <div class="hero-wrapper">
        <img src="${photos[slideIndex].url}" class="hero-img slide-anim">
        <div class="dots">
          ${photos.map((_, i) => `
            <span class="${i === slideIndex ? 'active' : ''}"></span>
          `).join("")}
        </div>
      </div>
    `;
  }

  function nextSlide() {
    showSlide(slideIndex + 1);
  }

  function prevSlide() {
    showSlide(slideIndex - 1);
  }

  // clear interval biar gak numpuk
  if (slideInterval) clearInterval(slideInterval);

  showSlide(slideIndex);

  // autoplay
  slideInterval = setInterval(nextSlide, 3000);

  // ==========================
  // SWIPE TOUCH
  // ==========================
  hero.ontouchstart = (e) => {
    startX = e.touches[0].clientX;
    isTouching = true;
    clearInterval(slideInterval);
  };

  hero.ontouchend = (e) => {
    if (!isTouching) return;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) > 50) {
      diff > 0 ? prevSlide() : nextSlide();
    }

    isTouching = false;
    slideInterval = setInterval(nextSlide, 3000);
  };

  // ==========================
  // TAP CLICK (kiri / kanan)
  // ==========================
  hero.onclick = (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;

    x < rect.width / 2 ? prevSlide() : nextSlide();
  };

  // ==========================
  // GALLERY GRID
  // ==========================
  photos.forEach(p => {
    el.innerHTML += `
      <div class="img-wrap">
<div class="polaroid" onclick="openPhoto('${p.url}')">
  <img src="${p.url}">
</div>
        <button class="delete-btn" onclick="deletePhoto('${p.id}')">✕</button>
      </div>
    `;
  });
}
async function deletePhoto(id) {
  const confirmDel = await customConfirm("Hapus foto ini?");
  if (!confirmDel) return;

  try {
    await fb.deleteDoc(fb.doc(db, "gallery", id));
  } catch (err) {
    console.error(err);
  }
}
// ==========================
// FULLSCREEN VIEW
// ==========================
function openPhoto(url) {
  const div = document.createElement("div");

  let scale = 1;
  let startDistance = 0;

  let posX = 0;
  let posY = 0;
  let startX = 0;
  let startY = 0;

  let lastTap = 0;

  Object.assign(div.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "hidden"
  });

  div.innerHTML = `
    <img src="${url}" id="zoomImg" style="
      max-width:100%;
      max-height:100%;
      transform: translate(0px,0px) scale(1);
      transition: transform 0.15s ease;
      touch-action: none;
    ">
  `;

  const img = div.querySelector("#zoomImg");

  function updateTransform() {
    img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  // ===== TOUCH START =====
  div.ontouchstart = (e) => {
    if (e.touches.length === 2) {
      startDistance = getDistance(e.touches[0], e.touches[1]);
    }

    if (e.touches.length === 1) {
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    }

    // double tap zoom
    const now = Date.now();
    if (now - lastTap < 300) {
      if (scale === 1) {
        scale = 2;
      } else {
        scale = 1;
        posX = 0;
        posY = 0;
      }
      updateTransform();
    }
    lastTap = now;
  };

  // ===== TOUCH MOVE =====
  div.ontouchmove = (e) => {
    if (e.touches.length === 2) {
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      scale = newDistance / startDistance;

      if (scale < 1) scale = 1;
      if (scale > 4) scale = 4;

      updateTransform();
    }

    if (e.touches.length === 1 && scale > 1) {
      posX = e.touches[0].clientX - startX;
      posY = e.touches[0].clientY - startY;

      updateTransform();
    }
  };

  // ===== CLOSE =====
  div.onclick = () => {
    if (scale === 1) div.remove();
  };

  document.body.appendChild(div);
}

function getDistance(t1, t2) {
  return Math.sqrt(
    Math.pow(t2.clientX - t1.clientX, 2) +
    Math.pow(t2.clientY - t1.clientY, 2)
  );
}
// ==========================
// INIT (PENTING)
// ==========================
window.addEventListener("load", startGalleryRealtime);

function setPage(page) {
  // hide semua
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  // show target
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");

  // active nav
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.remove("active");
  });

  event.currentTarget.classList.add("active");
}
window.setPage = setPage;

// ==========================
// SWIPE NAVIGATION ENGINE
// ==========================
const pages = ["home", "finance", "belanja", "tagihan", "laporan"];
let currentPageIndex = 0;

let startX = 0;
let endX = 0;

// sync awal
function initPageIndex() {
  const active = document.querySelector(".page.active");
  if (!active) return;

  const id = active.id.replace("page-", "");
  currentPageIndex = pages.indexOf(id);
}

// pindah page
function goToPage(index) {
  if (index < 0 || index >= pages.length) return;

  currentPageIndex = index;

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  const target = document.getElementById("page-" + pages[index]);
  if (target) target.classList.add("active");

  // update nav bawah
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.remove("active");
  });

  const nav = document.querySelectorAll(".nav-item")[index];
  if (nav) nav.classList.add("active");
}

function compressImageSmart(file, maxSizeKB = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;

      img.onload = async function () {
        let quality = 0.9;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // resize awal
        let width = img.width;
        let height = img.height;

        const maxWidth = 900;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        let result;

        // loop turunin kualitas sampai ukuran aman
        while (quality > 0.3) {
          result = canvas.toDataURL("image/jpeg", quality);

          const sizeKB = Math.round(result.length / 1024);

          console.log("TRY:", quality.toFixed(2), "=>", sizeKB, "KB");

          if (sizeKB <= maxSizeKB) break;

          quality -= 0.05;
        }

        resolve(result);
      };
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==========================
// 💖 GOALS SYSTEM (FINAL)
// ==========================

// ==========================
// 💖 GOALS SYSTEM (FIREBASE REALTIME)
// ==========================

let goals = [];

// ==========================
// INIT REALTIME GOALS
// ==========================
function startGoalsRealtime() {
  fb.onSnapshot(fb.collection(db, "goals"), (snap) => {
    goals = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderGoals();
  });
}

// ==========================
// FORMAT RUPIAH INPUT
// ==========================
function initGoalInputFormat() {
  const input = document.getElementById("goalTarget");

  if (!input) return;

  input.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    e.target.value = v ? Number(v).toLocaleString("id-ID") : "";
  });
}

// ==========================
// TAMBAH GOAL
// ==========================
async function tambahGoal() {
  const nama = document.getElementById("goalNama").value.trim();
  const raw = document.getElementById("goalTarget").value.replace(/\D/g, "");
  const target = parseInt(raw);

  if (!nama || !target) {
    showToast("Isi lah bosss!!");
    return;
  }

  try {
    await fb.addDoc(fb.collection(db, "goals"), {
      nama,
      target,
      terkumpul: 0,
      createdAt: new Date().toISOString()
    });

    document.getElementById("goalNama").value = "";
    document.getElementById("goalTarget").value = "";

  } catch (err) {
    console.error(err);
    showToast("Gagal tambah goal");
  }
}

// ==========================
// NABUNG KE GOAL (FIXED)
// ==========================
async function nabungGoal(id) {
  const value = parseInt(prompt("Masukkan jumlah nabung:"));

  if (!value || value <= 0) return;

  if (value > saldoGlobal) {
    showToast("Duitt mana duitt!");
    return;
  }

  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  try {
    // update progress goal
    await fb.updateDoc(fb.doc(db, "goals", id), {
      terkumpul: (goal.terkumpul || 0) + value
    });

    // masuk ke transaksi (SALDO otomatis dari sini)
    await fb.addDoc(fb.collection(db, "transaksi"), {
      ket: "Nabung - " + goal.nama,
      tipe: "keluar",
      kategori: "tabungan",
      jumlah: value,
      tanggal: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);
    showToast("Gagal nabung");
  }
}

// ==========================
// HAPUS GOAL (REFUND FIXED)
// ==========================
async function hapusGoal(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const ok = await customConfirm("Hapus goal ini?");
  if (!ok) return;

  try {
    // refund ke transaksi (saldo otomatis balik)
    if (goal.terkumpul > 0) {
      await fb.addDoc(fb.collection(db, "transaksi"), {
        ket: "Refund Goal - " + goal.nama,
        tipe: "masuk",
        kategori: "tabungan",
        jumlah: goal.terkumpul,
        tanggal: new Date().toISOString()
      });
    }

    // hapus goal
    await fb.deleteDoc(fb.doc(db, "goals", id));

  } catch (err) {
    console.error(err);
    showToast("Gagal hapus goal");
  }
}

// ==========================
// RENDER GOALS UI
// ==========================
function renderGoals() {
  const el = document.getElementById("goalsList");
  if (!el) return;

  el.innerHTML = "";

  if (goals.length === 0) {
    el.innerHTML = "<p style='color:#888'>Belum ada goals 💭</p>";
    return;
  }

  goals.forEach(g => {
    const target = Number(g.target || 0);
    const terkumpul = Number(g.terkumpul || 0);

    const percent = target > 0
      ? Math.min((terkumpul / target) * 100, 100)
      : 0;

    el.innerHTML += `
      <div class="goal-card">
        <h4>${g.nama}</h4>

        <p>
          ${formatRupiah(terkumpul)} / ${formatRupiah(target)}
        </p>

        <div class="goal-progress">
          <div class="goal-fill" style="width:${percent}%"></div>
        </div>

        <small style="color:#aaa">${percent.toFixed(0)}% tercapai</small>

        <button onclick="nabungGoal('${g.id}')">💰 Nabung</button>
        <button onclick="hapusGoal('${g.id}')">❌ Hapus</button>
      </div>
    `;
  });
}

// ==========================
// INIT
// ==========================
window.addEventListener("load", () => {
  startGoalsRealtime();
  initGoalInputFormat();
});

// ==========================
// CHART MODE
// ==========================
let chartMode = "bulan";

// pagination harian
let currentPage = 0;
const perPage = 7;

// ==========================
// SET CHART MODE
// ==========================
window.setChartMode = function (mode) {

  chartMode = mode;
  currentPage = 0;

  document.getElementById("btnBulan")?.classList.remove("active");
  document.getElementById("btnMinggu")?.classList.remove("active");

  if (mode === "bulan") {
    document.getElementById("btnBulan")?.classList.add("active");
  } else {
    document.getElementById("btnMinggu")?.classList.add("active");
  }

  updateIncomeChart();
};

// ==========================
// PAGE BUTTON
// ==========================
window.prevChartPage = function () {
  if (currentPage > 0) {
    currentPage--;
    updateIncomeChart();
  }
};

window.nextChartPage = function () {
  currentPage++;
  updateIncomeChart();
};

// ==========================
// UPDATE CHART
// ==========================
function updateIncomeChart() {

  if (!bulanChart) return;

  const namaBulan = [
    "Jan","Feb","Mar","Apr",
    "Mei","Jun","Jul","Agu",
    "Sep","Okt","Nov","Des"
  ];

  // ==========================
  // BULAN MODE
  // ==========================
  if (chartMode === "bulan") {

    const sulalaMap = {};
    const surereMap = {};

    data.forEach(item => {

      if (item.tipe !== "masuk") return;

      const d = new Date(item.tanggal);
      const month = d.getMonth();

      if (item.owner === "sulala") {
        sulalaMap[month] =
          (sulalaMap[month] || 0) + item.jumlah;
      }

      if (item.owner === "surere") {
        surereMap[month] =
          (surereMap[month] || 0) + item.jumlah;
      }

    });

    const allKeys = Array.from(
      new Set([
        ...Object.keys(sulalaMap),
        ...Object.keys(surereMap)
      ])
    ).sort((a, b) => a - b);

    bulanChart.data.labels =
      allKeys.map(i => namaBulan[i]);

    bulanChart.data.datasets = [
      {
        label: "Pemasukan Sulala",
        data: allKeys.map(i => sulalaMap[i] || 0)
      },
      {
        label: "Pemasukan Surere",
        data: allKeys.map(i => surereMap[i] || 0)
      }
    ];

    document.getElementById("chartNav").style.display = "none";
  }

  // ==========================
  // HARIAN MODE
  // ==========================
  else {

    const sulalaMap = {};
    const surereMap = {};

    data.forEach(item => {

      if (item.tipe !== "masuk") return;

      const d = new Date(item.tanggal);

      const tanggal =
        String(d.getDate()).padStart(2, "0") +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0");

      if (item.owner === "sulala") {
        sulalaMap[tanggal] =
          (sulalaMap[tanggal] || 0) + item.jumlah;
      }

      if (item.owner === "surere") {
        surereMap[tanggal] =
          (surereMap[tanggal] || 0) + item.jumlah;
      }

    });

    const allTanggal = [
      ...Object.keys(sulalaMap),
      ...Object.keys(surereMap)
    ].filter((v, i, a) => a.indexOf(v) === i)
     .sort((a, b) => {

      const [da, ma] = a.split("-");
      const [db, mb] = b.split("-");

      return new Date(2025, ma - 1, da)
        - new Date(2025, mb - 1, db);

    });

    const start = currentPage * perPage;
    const end = start + perPage;
    const paged = allTanggal.slice(start, end);

    document.getElementById("chartNav").style.display =
      allTanggal.length > 7 ? "flex" : "none";

    document.getElementById("prevChartBtn").disabled =
      currentPage === 0;

    document.getElementById("nextChartBtn").disabled =
      end >= allTanggal.length;

    bulanChart.data.labels = paged;

    bulanChart.data.datasets = [
      {
        label: "Pemasukan Sulala",
        data: paged.map(t => sulalaMap[t] || 0)
      },
      {
        label: "Pemasukan Surere",
        data: paged.map(t => surereMap[t] || 0)
      }
    ];
  }

  bulanChart.update();
}

// ==========================
// INIT
// ==========================
window.addEventListener("load", () => {
  document.getElementById("btnBulan")?.classList.add("active");
  updateIncomeChart();
});




// ==========================
// DATA TABUNGAN
// ==========================
let tabunganData = [];

// ==========================
// OPEN PAGE
// ==========================
function openTabunganPage(){

  const page =
    document.getElementById(
      "tabunganPage"
    );

  if(page){

    page.style.display =
      "block";

  }

}

// ==========================
// CLOSE PAGE
// ==========================
function closeTabunganPage(){

  const page =
    document.getElementById(
      "tabunganPage"
    );

  if(page){

    page.style.display =
      "none";

  }

}

// ==========================
// TOGGLE WALLET
// ==========================
function toggleWallet(id){

  const wallet =
    document.getElementById(id);

  if(!wallet) return;

  // ==========================
  // TUTUP
  // ==========================
  if(
    wallet.classList.contains(
      "open"
    )
  ){

    wallet.style.maxHeight =
      "0px";

    wallet.style.opacity =
      "0";

    wallet.classList.remove(
      "open"
    );

  }

  // ==========================
  // BUKA
  // ==========================
  else {

    wallet.classList.add(
      "open"
    );

    wallet.style.maxHeight =

      wallet.scrollHeight
      + "px";

    wallet.style.opacity =
      "1";

  }

}

// ==========================
// FORMAT INPUT TABUNGAN
// ==========================
window.addEventListener(
  "load",
  () => {

    const input =

      document.getElementById(
        "tabunganJumlah"
      );

    if(!input) return;

    input.addEventListener(
      "input",
      (e) => {

        let value =

          e.target.value
          .replace(/\D/g,"");

        if(!value){

          e.target.value =
            "";

          return;

        }

        e.target.value =

          Number(value)
          .toLocaleString(
            "id-ID"
          );

      }
    );

  }
);

// ==========================
// SAVE TABUNGAN
// ==========================
async function saveTabungan(){

  const owner =

    document
      .getElementById(
        "tabunganOwner"
      )
      .value;

  const jumlah =

    parseInt(

      document
        .getElementById(
          "tabunganJumlah"
        )
        .value

        .replace(/\D/g,"")

    );

  const file =

    document
      .getElementById(
        "tabunganFoto"
      )
      .files[0];

  // ==========================
  // VALIDASI
  // ==========================
  if(!jumlah || jumlah <= 0){

    showToast(
      "Nabung berapaa kaunii "
    );

    return;

  }

  if(!file){

    showToast(
      "No bukti HOAXXX"
    );

    return;

  }

  // ==========================
  // LOADING
  // ==========================
  showToast(
    "SABAR ..."
  );

  // ==========================
  // READER FOTO
  // ==========================
// ==========================
// COMPRESS FOTO
// ==========================
const compressedFoto =

  await compressImageSmart(
    file,
    400
  );

try{

  const item = {

    owner,

    jumlah,

    foto:
      compressedFoto,

    tanggal:
      new Date()
      .toISOString()

  };

  // ==========================
  // SAVE FIRESTORE
  // ==========================
  await fb.addDoc(

    fb.collection(
      db,
      "tabungan"
    ),

    item

  );

  // ==========================
  // MASUK PENGELUARAN
  // ==========================
  if(
    typeof addData
    === "function"
  ){

    await addData({

      ket:
        "Menabung "
        + owner,

      jumlah,

      tipe:
        "keluar",

      kategori:
        "Tabungan",

      owner:
        "-",

      tanggal:
        new Date()
        .toISOString()

    });

  }

  // ==========================
  // RESET
  // ==========================
  document
    .getElementById(
      "tabunganJumlah"
    )
    .value = "";

  document
    .getElementById(
      "tabunganFoto"
    )
    .value = "";

  showToast(
    "Masukk tabunganmu!"
  );

}

catch(err){

  console.error(err);

  showToast(
    "Gagal upload 😭"
  );

}

  reader.readAsDataURL(file);

}

// ==========================
// RENDER TABUNGAN
// ==========================
function renderTabungan(){

  const sulalaWallet =

    document.getElementById(
      "walletSulala"
    );

  const surereWallet =

    document.getElementById(
      "walletSurere"
    );

  if(
    !sulalaWallet
    || !surereWallet
  ) return;

  // ==========================
  // RESET
  // ==========================
  sulalaWallet.innerHTML =
    "";

  surereWallet.innerHTML =
    "";

  let totalSulala = 0;
  let totalSurere = 0;

  // ==========================
  // SORT TERBARU
  // ==========================
  const sorted =

    [...tabunganData]

    .sort((a,b)=>

      new Date(b.tanggal)

      -

      new Date(a.tanggal)

    );

  // ==========================
  // LOOP
  // ==========================
  sorted.forEach(item => {

    const tanggal =

      new Date(
        item.tanggal
      )

      .toLocaleString(
        "id-ID"
      );

    const html = `

      <div class="wallet-item">

        <img

          src="${item.foto}"

          onclick="
            event.stopPropagation();
            openImageModal(
              '${item.foto}'
            )
          "

        >

        <div class="wallet-info">

          <h4>
            ${formatRupiah(
              item.jumlah
            )}
          </h4>

          <p>
            ${tanggal}
          </p>
<button
  class="delete-tabungan-btn"

  onclick="
    event.stopPropagation();
    deleteTabungan('${item.id}')
  "
>
  Hapus
</button>
        </div>

      </div>

    `;

    // ==========================
    // SULALA
    // ==========================
    if(
      item.owner
      === "sulala"
    ){

      totalSulala +=
        item.jumlah;

      sulalaWallet.innerHTML +=
        html;

    }

    // ==========================
    // SURERE
    // ==========================
    if(
      item.owner
      === "surere"
    ){

      totalSurere +=
        item.jumlah;

      surereWallet.innerHTML +=
        html;

    }

  });

  // ==========================
  // TOTAL
  // ==========================
  document
    .getElementById(
      "totalSulala"
    )
    .textContent =

      formatRupiah(
        totalSulala
      );

  document
    .getElementById(
      "totalSurere"
    )
    .textContent =

      formatRupiah(
        totalSurere
      );

}

// ==========================
// OPEN IMAGE
// ==========================
function openImageModal(src){

  const modal =

    document.getElementById(
      "imageModal"
    );

  const img =

    document.getElementById(
      "modalImage"
    );

  if(!modal || !img)
    return;

  img.src = src;

  modal.style.display =
    "flex";

}

// ==========================
// CLOSE IMAGE
// ==========================
function closeImageModal(){

  const modal =

    document.getElementById(
      "imageModal"
    );

  if(modal){

    modal.style.display =
      "none";

  }

}

// ==========================
// DELETE TABUNGAN
// ==========================
async function deleteTabungan(id){

  const yakin =
    await customConfirm(
      "Hapus tabungan ini?"
    );

  if(!yakin) return;

  try{

    await fb.deleteDoc(

      fb.doc(
        db,
        "tabungan",
        id
      )

    );

    showToast(
      "Dah Terhaposss"
    );

  }

  catch(err){

    console.error(err);

    showToast(
      "Tak bisee "
    );

  }

}

let ambilOwner = "";

// ==========================
// OPEN POPUP
// ==========================
function openAmbilPopup(owner){

  ambilOwner = owner;

  document
    .getElementById(
      "ambilPopup"
    )
    .style.display = "flex";

}

// ==========================
// CLOSE POPUP
// ==========================
function closeAmbilPopup(){

  document
    .getElementById(
      "ambilPopup"
    )
    .style.display = "none";

}

// ==========================
// CONFIRM AMBIL
// ==========================
async function confirmAmbil(){

  const jumlah = parseInt(

    document
      .getElementById(
        "ambilJumlah"
      )
      .value

      .replace(/\D/g,"")

  );

  if(!jumlah){

    showToast(
      "Isi nominal 😭"
    );

    return;

  }

  // ==========================
  // FILTER TABUNGAN OWNER
  // ==========================
  const ownerData =

    tabunganData.filter(i =>

      i.owner === ambilOwner

    );

  // ==========================
  // TOTAL TABUNGAN
  // ==========================
  const total = ownerData
    .reduce((a,b)=>

      a + b.jumlah

    ,0);

  // ==========================
  // VALIDASI
  // ==========================
  if(jumlah > total){

    showToast(
      "Tabungan tidak cukup 😭"
    );

    return;

  }

  try{

    // ==========================
    // MASUK PEMASUKAN
    // ==========================
    await addData({

      ket:
        "Ambil Tabungan "
        + ambilOwner,

      jumlah,

      tipe:
        "masuk",

      kategori:
        "-",

      owner:
        ambilOwner,

      tanggal:
        new Date()
        .toISOString()

    });

    // ==========================
    // KURANGI TABUNGAN
    // ==========================
    let sisa =
      jumlah;

    // terbaru dulu
    const sorted =

      [...ownerData]

      .sort((a,b)=>

        new Date(b.tanggal)

        -

        new Date(a.tanggal)

      );

    for(const item of sorted){

      if(sisa <= 0)
        break;

      // hapus full
      if(item.jumlah <= sisa){

        sisa -= item.jumlah;

        await fb.deleteDoc(

          fb.doc(
            db,
            "tabungan",
            item.id
          )

        );

      }

      // kurangi sebagian
      else {

        await fb.updateDoc(

          fb.doc(
            db,
            "tabungan",
            item.id
          ),

          {

            jumlah:
              item.jumlah - sisa

          }

        );

        sisa = 0;

      }

    }

    // ==========================
    // RESET
    // ==========================
    document
      .getElementById(
        "ambilJumlah"
      )
      .value = "";

    closeAmbilPopup();

    showToast(
      "💸 Berhasil ambil tabungan!"
    );

  }

  catch(err){

    console.error(err);

    showToast(
      "Gagal ambil 😭"
    );

  }

}

const mataKiri =
  document.getElementById(
    "mataKiri"
  );

const mataKanan =
  document.getElementById(
    "mataKanan"
  );

function blinkPenguin(){

  mataKiri.setAttribute(
    "ry",
    "1"
  );

  mataKanan.setAttribute(
    "ry",
    "1"
  );

  setTimeout(() => {

    mataKiri.setAttribute(
      "ry",
      "6"
    );

    mataKanan.setAttribute(
      "ry",
      "6"
    );

  },150);

}

// blink random
setInterval(() => {

  blinkPenguin();

},4000);



// ==========================
// UPDATE PENGUIN MOOD
// ==========================
function updatePenguinMood(){

  const mulut =
    document.getElementById(
      "mulut"
    );

  const penguin =
    document.getElementById(
      "penguin"
    );

  const pipiKiri =
    document.querySelectorAll(
      'ellipse[fill="#F888A2"]'
    )[0];

  const pipiKanan =
    document.querySelectorAll(
      'ellipse[fill="#F888A2"]'
    )[1];

  if(
    !mulut ||
    !penguin
  ) return;

  // ==========================
  // SALDO KRITIS
  // ==========================
if(
  Number(saldoGlobal || 0)
  <= 100000
){

    // mulut sedih
    mulut.setAttribute(

      "d",

      "M52 78 Q60 70 68 78"

    );

    // pipi redup
    if(pipiKiri)
      pipiKiri.style.opacity = ".35";

    if(pipiKanan)
      pipiKanan.style.opacity = ".35";

    // badan turun dikit
    penguin.style.transform =
      "translateY(4px)";

  }

  // ==========================
  // NORMAL
  // ==========================
  else {

    // senyum
    mulut.setAttribute(

      "d",

      "M52 74 Q60 79 68 74"

    );

    // pipi normal
    if(pipiKiri)
      pipiKiri.style.opacity = ".75";

    if(pipiKanan)
      pipiKanan.style.opacity = ".75";

    penguin.style.transform =
      "translateY(0px)";

  }

}

// ==========================
// PENGUIN HAPPY
// ==========================

function penguinHappy(){

  const penguin =
    document.getElementById(
      "penguin"
    );

  if(!penguin) return;

  // reset
  penguin.classList.remove(
    "penguin-happy"
  );

  // trigger ulang animasi
  void penguin.offsetWidth;

  penguin.classList.add(
    "penguin-happy"
  );

const mataKiri =
  document.getElementById(
    "mataKiri"
  );

const mataKanan =
  document.getElementById(
    "mataKanan"
  );

// mata > <
mataKiri.setAttribute(
  "ry",
  "1"
);

mataKanan.setAttribute(
  "ry",
  "1"
);

  // stop
  setTimeout(() => {

    penguin.classList.remove(
      "penguin-happy"
    );
    
mataKiri.setAttribute(
  "ry",
  "6"
);

mataKanan.setAttribute(
  "ry",
  "6"
);

  },2000);

}

// ==========================
// UPDATE COIN UI
// ==========================
function updateCoinUI(){

  const coinEl =

    document.getElementById(
      "coinText"
    );

  if(!coinEl) return;

  coinEl.textContent =

    `🪙 ${penguinCoin}`;

}