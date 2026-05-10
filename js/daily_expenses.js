const today = new Date();

const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");

/* フィルター初期値 */
// document.getElementById("yearFilter").value = currentYear;
// document.getElementById("monthFilter").value = currentMonth;

/* 支出分析 初期値 */
document.getElementById("startDate").value =
  `${currentYear}-${currentMonth}-01`;

document.getElementById("endDate").value =
  `${currentYear}-${currentMonth}-${currentDay}`;

const categories = [
  "ご飯",
  "飲み物",
  "タバコ",
  "お酒",
  "飲み会",
  "交通費",
  "日用品",
  "買い物",
  "その他"
];

let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let deleteMode = false;
let chart;

const tbody = document.querySelector("#expenseTable tbody");

const categoryInput = document.getElementById("categoryInput");
const categoryFilter = document.getElementById("categoryFilter");

categories.forEach(cat => {
  categoryInput.innerHTML += `<option value="${cat}">${cat}</option>`;
  categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
});

function saveStorage() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function renderTable() {
  tbody.innerHTML = "";

  const deleteHeader = document.querySelector("#expenseTable th.delete-col");
if (deleteHeader) {
  deleteHeader.classList.toggle("hidden", !deleteMode);
}

  const year = document.getElementById("yearFilter").value;
  const month = document.getElementById("monthFilter").value;
  const category = categoryFilter.value;

  let filtered = [...expenses];

  if (year) filtered = filtered.filter(e => e.date.startsWith(year));
  if (month) filtered = filtered.filter(e => e.date.split("-")[1] === month);
  if (category) filtered = filtered.filter(e => e.category === category);

  filtered.sort((a, b) => b.date.localeCompare(a.date));

  filtered.forEach((expense, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${expense.date}</td>
        <td>${expense.category}</td>
        <td>${expense.content}</td>
        <td>¥${Number(expense.amount).toLocaleString()}</td>
        <td class="delete-col ${deleteMode ? "" : "hidden"}">
          <button onclick="deleteExpense(${index})">×</button>
        </td>
      </tr>
    `;
  });
}

function deleteExpense(index) {
  expenses.splice(index, 1);
  saveStorage();
  renderTable();
}

window.deleteExpense = deleteExpense;

document.getElementById("addBtn").onclick = () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateInput").value = today;
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("closeBtn").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("saveBtn").onclick = () => {
  const newExpense = {
    date: document.getElementById("dateInput").value,
    category: document.getElementById("categoryInput").value,
    content: document.getElementById("contentInput").value,
    amount: document.getElementById("amountInput").value
  };

  expenses.push(newExpense);
  saveStorage();
  renderTable();

  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("deleteModeBtn").onclick = () => {
  deleteMode = !deleteMode;
  renderTable();
};

document.querySelectorAll("#yearFilter,#monthFilter,#categoryFilter")
  .forEach(el => el.addEventListener("change", renderTable));

document.getElementById("analysisBtn").onclick = () => {
  document.getElementById("analysisModal").classList.remove("hidden");
};

document.getElementById("analysisCloseBtn").onclick = () => {
  document.getElementById("analysisModal").classList.add("hidden");
};

document.getElementById("analyzeRunBtn").onclick = () => {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let filtered = expenses.filter(e => {
    return (!start || e.date >= start) && (!end || e.date <= end);
  });

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  const grouped = {};
  filtered.forEach(e => {
    grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount);
  });

  let summaryHTML = `
    <div class="summary-total">合計支出 ¥${total.toLocaleString()}</div>
    <div>${filtered.length}件</div>
    <div class="category-summary">
  `;

  Object.entries(grouped).forEach(([key, value]) => {
    summaryHTML += `<div>${key} : ¥${value.toLocaleString()}</div>`;
  });

  summaryHTML += "</div>";

  document.getElementById("summaryArea").innerHTML = summaryHTML;

  const ctx = document.getElementById("expenseChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(grouped),
      datasets: [{
        data: Object.values(grouped)
      }]
    }
  });
};

function initFilters() {
  const years = [...new Set(expenses.map(e => e.date.slice(0, 4)))];
  const months = [...new Set(expenses.map(e => e.date.slice(5, 7)))];

  years.forEach(y => {
    document.getElementById("yearFilter").innerHTML += `<option value="${y}">${y}</option>`;
  });

  months.forEach(m => {
    document.getElementById("monthFilter").innerHTML += `<option value="${m}">${m}</option>`;
  });
}

initFilters();
renderTable();