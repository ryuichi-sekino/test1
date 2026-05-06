const STORAGE_KEY = "trainingRecords";

const trainingMenus = {
  胸: ["ベンチプレス", "ダンベルプレス", "ペックフライ", "インクラインダンベルプレス"],
  肩: ["ショルダープレス", "サイドレイズ", "アップライトロー"],
  腕: ["バーベルアームカール", "インクラインダンベルカール", "フレンチプレス"],
  背中: ["シーテッドロー", "ワンハンドダンベルロー", "ラットプルダウン"]
};

let deleteMode = false;
let chart = null;

/* =========================
   Utility
========================= */

function calcRM(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

function getRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* =========================
   Initial Sample Data
========================= */

function initSampleData() {
  if (getRecords().length > 0) return;

  const sample = [
    {
      id: Date.now(),
      date: "2026-05-01",
      month: 5,
      part: "胸",
      menu: "ベンチプレス",
      weight: 60,
      reps: 8,
      rm: calcRM(60, 8)
    },
    {
      id: Date.now() + 1,
      date: "2026-05-05",
      month: 5,
      part: "胸",
      menu: "ベンチプレス",
      weight: 65,
      reps: 8,
      rm: calcRM(65, 8)
    }
  ];

  saveRecords(sample);
}

/* =========================
   Menu Render
========================= */

function renderMenu(selectId, part) {
  const select = document.getElementById(selectId);
  if (!select || !trainingMenus[part]) return;

  const firstOption =
    selectId.includes("Filter") || selectId.includes("graph")
      ? `<option value="">全種目</option>`
      : "";

  select.innerHTML = firstOption;

  trainingMenus[part].forEach(menu => {
    const option = document.createElement("option");
    option.value = menu;
    option.textContent = menu;
    select.appendChild(option);
  });
}

/* =========================
   Filters
========================= */

function initDateFilters() {
  const records = getRecords();

  const years = [...new Set(records.map(r => new Date(r.date).getFullYear()))];
  const months = [...new Set(records.map(r => r.month))];

  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  if (yearFilter) {
    yearFilter.innerHTML = `<option value="">全年</option>`;
    years.sort().forEach(year => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = `${year}年`;
      yearFilter.appendChild(option);
    });
  }

  if (monthFilter) {
    monthFilter.innerHTML = `<option value="">全月</option>`;
    months.sort((a, b) => a - b).forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = `${month}月`;
      monthFilter.appendChild(option);
    });
  }
}

function initGraphFilters() {
  const copyOptions = (fromId, toId) => {
    const from = document.getElementById(fromId);
    const to = document.getElementById(toId);
    if (from && to) to.innerHTML = from.innerHTML;
  };

  copyOptions("yearFilter", "graphYear");
  copyOptions("monthFilter", "graphMonth");
  copyOptions("partFilter", "graphPart");
  copyOptions("menuFilter", "graphMenu");
}

/* =========================
   Table Render
========================= */

function renderTable() {
  const tbody = document.querySelector("#recordTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let records = getRecords();

  const year = document.getElementById("yearFilter")?.value || "";
  const month = document.getElementById("monthFilter")?.value || "";
  const part = document.getElementById("partFilter")?.value || "";
  const menu = document.getElementById("menuFilter")?.value || "";

  records = records.filter(r => {
    return (
      (!year || new Date(r.date).getFullYear() == year) &&
      (!month || r.month == month) &&
      (!part || r.part === part) &&
      (!menu || r.menu === menu)
    );
  });

  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  records.forEach(record => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${record.date}</td>
      <td>${record.part}</td>
      <td>${record.menu}</td>
      <td>${record.weight}kg</td>
      <td>${record.reps}</td>
      <td>${record.rm}</td>
      <td class="delete-col ${deleteMode ? "" : "hidden"}">
        <button onclick="deleteRecord(${record.id})">×</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   Add Record
========================= */

function addRecord() {
  const date = document.getElementById("dateInput").value;
  const part = document.getElementById("partInput").value;
  const menu = document.getElementById("menuInput").value;
  const weight = Number(document.getElementById("weightInput").value);
  const reps = Number(document.getElementById("repsInput").value);

  if (!date || !weight || !reps) {
    alert("入力内容を確認してください");
    return;
  }

  const records = getRecords();

  records.push({
    id: Date.now(),
    date,
    month: new Date(date).getMonth() + 1,
    part,
    menu,
    weight,
    reps,
    rm: calcRM(weight, reps)
  });

  saveRecords(records);

  initDateFilters();
  initGraphFilters();
  renderTable();
  closeModal();
}

/* =========================
   Delete
========================= */

function deleteRecord(id) {
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);

  renderTable();
}

function toggleDeleteMode() {
  deleteMode = !deleteMode;
  renderTable();
}

/* =========================
   Modal
========================= */

function openModal() {
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");

  document.getElementById("weightInput").value = "";
  document.getElementById("repsInput").value = "";
}

/* =========================
   Graph
========================= */

function openGraph() {
  document.getElementById("graphModal").classList.remove("hidden");
  renderGraph();
}

function closeGraph() {
  document.getElementById("graphModal").classList.add("hidden");
}

function renderGraph() {
  let records = getRecords();

  const year = document.getElementById("graphYear")?.value || "";
  const month = document.getElementById("graphMonth")?.value || "";
  const part = document.getElementById("graphPart")?.value || "";
  const menu = document.getElementById("graphMenu")?.value || "";

  records = records.filter(r => {
    return (
      (!year || new Date(r.date).getFullYear() == year) &&
      (!month || r.month == month) &&
      (!part || r.part === part) &&
      (!menu || r.menu === menu)
    );
  });

  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = records.map(r => r.date);
  const data = records.map(r => r.rm);

  if (chart) chart.destroy();

chart = new Chart(document.getElementById("growthChart"), {
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: menu || "RM推移",
        data,
        borderColor: 'rgba(0, 255, 0, 1)',
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'white',
        },
      },
      x: {
        ticks: {
          color: 'white',
        },
      },
    },
    datasets: {
      label: {
        color: 'white',
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
             return '<span style="color: white;">' + context.label + '</span>';
          },
        },
      },
    },
  }
});
}

/* =========================
   Event
========================= */

document.getElementById("addBtn")?.addEventListener("click", openModal);
document.getElementById("closeBtn")?.addEventListener("click", closeModal);
document.getElementById("saveBtn")?.addEventListener("click", addRecord);
document.getElementById("deleteModeBtn")?.addEventListener("click", toggleDeleteMode);

document.getElementById("graphBtn")?.addEventListener("click", openGraph);
document.getElementById("graphCloseBtn")?.addEventListener("click", closeGraph);

document.getElementById("partInput")?.addEventListener("change", e => {
  renderMenu("menuInput", e.target.value);
});

document.getElementById("partFilter")?.addEventListener("change", e => {
  renderMenu("menuFilter", e.target.value || "胸");
  renderTable();
});

document.getElementById("graphPart")?.addEventListener("change", e => {
  renderMenu("graphMenu", e.target.value || "胸");
  renderGraph();
});

[
  "yearFilter",
  "monthFilter",
  "menuFilter"
].forEach(id => {
  document.getElementById(id)?.addEventListener("change", renderTable);
});

[
  "graphYear",
  "graphMonth",
  "graphMenu"
].forEach(id => {
  document.getElementById(id)?.addEventListener("change", renderGraph);
});

/* =========================
   Init
========================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("training.js loaded");

  initSampleData();
  initDateFilters();

  renderMenu("menuInput", "胸");
  renderMenu("menuFilter", "胸");

  document.getElementById("dateInput").valueAsDate = new Date();

  initGraphFilters();
  renderTable();
});