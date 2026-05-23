/* ===========================================================================
   Daily Expenses Management System (支出管理用スクリプト)
   =========================================================================== */

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");

// 支出分析の初期日付を当月の1日から本日までに設定
if (document.getElementById("startDate")) {
  document.getElementById("startDate").value = `${currentYear}-${currentMonth}-01`;
}
if (document.getElementById("endDate")) {
  document.getElementById("endDate").value = `${currentYear}-${currentMonth}-${currentDay}`;
}

// カテゴリ定義
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

// ローカルストレージよりデータをロード (不具合防止のためID未付与データには自動付与)
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
expenses = expenses.map(e => {
  if (!e.id) e.id = "exp_" + Math.random().toString(36).substring(2, 11) + Date.now();
  return e;
});

let chart = null;
const tbody = document.querySelector("#expenseTable tbody");
const categoryInput = document.getElementById("categoryInput");
const categoryFilter = document.getElementById("categoryFilter");

// セレクトボックスへのカテゴリ追加
if (categoryInput && categoryFilter) {
  categoryInput.innerHTML = "";
  categoryFilter.innerHTML = '<option value="">全カテゴリ</option>';
  categories.forEach(cat => {
    categoryInput.innerHTML += `<option value="${cat}">${cat}</option>`;
    categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

// ストレージ保存用共通関数
function saveStorage() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

// テーブルレンダリングおよびタップ・スワイプ削除ロジック
function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = "";

  const year = document.getElementById("yearFilter") ? document.getElementById("yearFilter").value : "";
  const month = document.getElementById("monthFilter") ? document.getElementById("monthFilter").value : "";
  const category = categoryFilter ? categoryFilter.value : "";

  // フィルター処理
  let filtered = [...expenses];
  if (year) filtered = filtered.filter(e => e.date.startsWith(year));
  if (month) filtered = filtered.filter(e => e.date.split("-")[1] === month);
  if (category) filtered = filtered.filter(e => e.category === category);

  // 日付の新しい順にソート
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  filtered.forEach((expense) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", expense.id);
    tr.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.category}</td>
      <td>¥${Number(expense.amount).toLocaleString()}</td>
      <td>${expense.content || ""}</td>
      <button class="swipe-delete-btn" data-id="${expense.id}">削除</button>
    `;

    // 削除ボタンクリック時の処理 (フェードアウト後に安全にデータから抹消)
    const delBtn = tr.querySelector(".swipe-delete-btn");
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation(); // 行のタップイベント発火を防ぐ
        const targetId = delBtn.getAttribute("data-id");
        tr.classList.add("fade-out");
        setTimeout(() => {
          deleteExpense(targetId);
        }, 250);
      };
    }

    // 行タップで削除ボタンを横からスライドイン表示させる機能 (クリック・タップ共通共通化)
    tr.onclick = (e) => {
      // 削除ボタン自体のクリック時は無視
      if (e.target.classList.contains("swipe-delete-btn")) return;

      const isSwiped = tr.classList.contains("swiped-left");
      // 他の行のオープン状態をすべてクリア
      document.querySelectorAll("#expenseTable tbody tr").forEach(row => {
        row.classList.remove("swiped-left");
      });
      // トグル切り替え
      if (!isSwiped) {
        tr.classList.add("swiped-left");
      }
    };

    // モバイル用簡易タッチスワイプ検知
    let touchStartX = 0;
    tr.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    tr.addEventListener("touchmove", (e) => {
      const touchMoveX = e.touches[0].clientX;
      const diffX = touchStartX - touchMoveX;
      if (diffX > 40) { // 左スワイプ
        document.querySelectorAll("#expenseTable tbody tr").forEach(row => {
          if (row !== tr) row.classList.remove("swiped-left");
        });
        tr.classList.add("swiped-left");
      } else if (diffX < -40) { // 右スワイプで閉じる
        tr.classList.remove("swiped-left");
      }
    }, { passive: true });

    tbody.appendChild(tr);
  });
}

// データ安全削除関数 (インデックスのズレを完全に克服)
function deleteExpense(id) {
  expenses = expenses.filter(e => String(e.id) !== String(id));
  saveStorage();
  renderTable();
  
  // 分析モーダルが開いている場合はグラフと集計も自動リアルタイム更新
  const analysisModal = document.getElementById("analysisModal");
  if (analysisModal && !analysisModal.classList.contains("hidden")) {
    renderAnalysis();
  }
}

// 支出分析（円グラフ）の集計・描画ロジック
function renderAnalysis() {
  const start = document.getElementById("startDate") ? document.getElementById("startDate").value : "";
  const end = document.getElementById("endDate") ? document.getElementById("endDate").value : "";

  if (!start || !end) return;

  // 期間内データ抽出
  const filtered = expenses.filter(e => e.date >= start && e.date <= end);

  let total = 0;
  let grouped = {};
  categories.forEach(c => grouped[c] = 0);

  filtered.forEach(e => {
    const amt = Number(e.amount) || 0;
    total += amt;
    if (grouped[e.category] !== undefined) {
      grouped[e.category] += amt;
    } else {
      grouped[e.category] = amt;
    }
  });

  // HTMLの組み立て
  let summaryHTML = `
    <div class="summary-total">合計支出 ¥${total.toLocaleString()}</div>
    <div style="margin-bottom:10px;">該当件数: ${filtered.length} 件</div>
    <div class="category-summary">
  `;
  Object.entries(grouped).forEach(([key, value]) => {
    if (value > 0) {
      summaryHTML += `<div class="category-summary-item"><span>${key}</span><strong>¥${value.toLocaleString()}</strong></div>`;
    }
  });
  summaryHTML += "</div>";

  const summaryArea = document.getElementById("summaryArea");
  if (summaryArea) summaryArea.innerHTML = summaryHTML;

  // Chart.js 描画
  const ctx = document.getElementById("expenseChart");
  if (!ctx) return;

  if (chart) chart.destroy();

  // 金額が0より大きいカテゴリのみグラフのせて視認性最適化
  const activeLabels = Object.keys(grouped).filter(k => grouped[k] > 0);
  const activeData = Object.values(grouped).filter(v => v > 0);

  if (activeData.length === 0) {
    if (summaryArea) summaryArea.innerHTML += '<p style="text-align:center; color:#ccc; margin-top:15px;">期間内のデータがありません</p>';
    return;
  }

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: activeLabels,
      datasets: [{
        data: activeData,
        backgroundColor: [
          "#d30c44", "#3b605e", "#64584f", "#437737",
          "#f39c12", "#9b59b6", "#1abc9c", "#34495e", "#95a5a6"
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#fff', font: { size: 12 } } }
      }
    }
  });
}

// フィルター項目(年・月)の自動生成
function initFilters() {
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");
  if (!yearFilter || !monthFilter) return;

  const years = [...new Set(expenses.map(e => e.date.slice(0, 4)))];
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  const currentYearStr = String(new Date().getFullYear());
  if (!years.includes(currentYearStr)) years.push(currentYearStr);
  years.sort((a, b) => b - a);

  yearFilter.innerHTML = '<option value="">全年</option>';
  years.forEach(y => {
    yearFilter.innerHTML += `<option value="${y}">${y}年</option>`;
  });

  monthFilter.innerHTML = '<option value="">全月</option>';
  months.forEach(m => {
    monthFilter.innerHTML += `<option value="${m}">${Number(m)}月</option>`;
  });

  // デフォルト値を現在年月に設定
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  // デフォルト値を現在年月に設定（既出の currentYearStr を再利用）
  
  if (yearFilter) yearFilter.value = currentYearStr;
  if (monthFilter) monthFilter.value = currentMonthStr;
}

/* ===========================================================================
   Event Listeners & DOM Initialization
   =========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initFilters();
  renderTable();

  // フィルター変更時の自動更新
  ["yearFilter", "monthFilter", "categoryFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderTable);
  });

  // 新規データ追加ポップアップ制御
  const addBtn = document.getElementById("addBtn");
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeBtn");
  const saveBtn = document.getElementById("saveBtn");

  if (addBtn && modal) {
    addBtn.onclick = () => {
      if (document.getElementById("dateInput")) {
        document.getElementById("dateInput").value = new Date().toISOString().split("T")[0];
      }
      if (document.getElementById("amountInput")) document.getElementById("amountInput").value = "";
      if (document.getElementById("contentInput")) document.getElementById("contentInput").value = "";
      modal.classList.remove("hidden");
    };
  }

  if (closeBtn && modal) {
    closeBtn.onclick = () => modal.classList.add("hidden");
  }

  if (saveBtn && modal) {
    saveBtn.onclick = () => {
      const date = document.getElementById("dateInput") ? document.getElementById("dateInput").value : "";
      const category = categoryInput ? categoryInput.value : "";
      const amount = document.getElementById("amountInput") ? document.getElementById("amountInput").value : "";
      const content = document.getElementById("contentInput") ? document.getElementById("contentInput").value : "";

      if (!date || !amount) {
        alert("日付と金額を入力してください。");
        return;
      }

      const newExpense = {
        id: "exp_" + Math.random().toString(36).substring(2, 11) + Date.now(),
        date,
        category,
        amount: Number(amount),
        content
      };

      expenses.push(newExpense);
      saveStorage();
      initFilters();
      renderTable();
      modal.classList.add("hidden");
    };
  }

  // 支出分析モーダル制御
  const analysisBtn = document.getElementById("analysisBtn");
  const analysisModal = document.getElementById("analysisModal");
  const analysisCloseBtn = document.getElementById("analysisCloseBtn");
  const analyzeRunBtn = document.getElementById("analyzeRunBtn");

  if (analysisBtn && analysisModal) {
    analysisBtn.onclick = () => {
      analysisModal.classList.remove("hidden");
      renderAnalysis(); // 開いた時点で自動初期集計
    };
  }

  if (analysisCloseBtn && analysisModal) {
    analysisCloseBtn.onclick = () => analysisModal.classList.add("hidden");
  }

  if (analyzeRunBtn) {
    analyzeRunBtn.onclick = renderAnalysis;
  }
});