/* ===========================================================================
   Training Log Management System (筋トレ管理用スクリプト)
   =========================================================================== */

const STORAGE_KEY = "trainingRecords";

// トレーニングメニュー定義 (バグとなるネストされた内側配列を除去し正常化)
const trainingMenus = {
  胸: ["ベンチプレス", "ダンベルプレス", "ペックフライ", "インクラインダンベルプレス"],
  肩: ["ショルダープレス", "サイドレイズ", "アップライトロー"],
  腕: ["バーベルアームカール", "インクラインダンベルカール", "フレンチプレス"],
  背中: ["シーテッドロー", "ワンハンドダンベルロー", "ラットプルダウン"]
};

let chart = null;

/* ===========================================================================
   Utility & Storage Operations
   =========================================================================== */

// RM計算ロジック
function calcRM(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

// データのロードと一意なID付与保証
function getRecords() {
  let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  return records.map(r => {
    if (!r.id) r.id = "rec_" + Math.random().toString(36).substring(2, 11) + Date.now();
    return r;
  });
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ===========================================================================
   Render Table (UI描画 ＆ タップ・スワイプ連動)
   =========================================================================== */

/* =========================
   Render Table (UIの描画とスワイプ・タップ機能統合)
========================= */

function renderTable() {
  const tbody = document.querySelector("#trainingTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const year = document.getElementById("yearFilter").value;
  const month = document.getElementById("monthFilter").value;
  const part = document.getElementById("partFilter").value;
  const menu = document.getElementById("menuFilter").value;

  let records = getRecords();

  if (year) records = records.filter(r => r.date.startsWith(year));
  if (month) records = records.filter(r => Number(r.date.split("-")[1]) === Number(month));
  if (part) records = records.filter(r => r.part === part);
  if (menu) records = records.filter(r => r.menu === menu);

  // 日付の新しい順にソート
  records.sort((a, b) => b.date.localeCompare(a.date));

  records.forEach((rec) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rec.date}</td>
      <td>${rec.part}</td>
      <td>${rec.menu}</td>
      <td>${rec.weight} kg</td>
      <td>${rec.reps} rep</td>
      <td>${rec.rm} RM</td>
      <button class="swipe-delete-btn" data-id="${rec.id}">削除</button>
    `;

    // 削除ボタン押下時のフェードアウト＆データ削除
    const delBtn = tr.querySelector(".swipe-delete-btn");
    delBtn.onclick = (e) => {
      e.stopPropagation();
      const targetId = delBtn.getAttribute("data-id");
      
      tr.classList.add("fade-out");
      setTimeout(() => {
        deleteRecord(targetId);
      }, 250);
    };

    // --- 新機能：行タップ（クリック）で削除ボタンの表示/非表示を切り替え ---
    tr.onclick = (e) => {
      // 削除ボタン自体のクリック時は何もしない
      if (e.target.classList.contains("swipe-delete-btn")) return;

      const isSwiped = tr.classList.contains("swiped-left");
      // 他の行のオープン状態をすべてクリア
      document.querySelectorAll("#trainingTable tbody tr").forEach(row => {
        row.classList.remove("swiped-left");
      });

      // トグル切り替え
      if (!isSwiped) {
        tr.classList.add("swiped-left");
      }
    };

    // --- モバイル用：左スワイプジェスチャーの判定（既存機能も安全に継続） ---
    let touchStartX = 0;
    let touchStartY = 0;

    tr.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    tr.addEventListener("touchmove", (e) => {
      const touchMoveX = e.touches[0].clientX;
      const touchMoveY = e.touches[0].clientY;
      
      const diffX = touchStartX - touchMoveX;
      const diffY = Math.abs(touchStartY - touchMoveY);

      if (diffX > 40 && diffY < 30) {
        document.querySelectorAll("#trainingTable tbody tr").forEach(row => {
          if (row !== tr) row.classList.remove("swiped-left");
        });
        tr.classList.add("swiped-left");
      } 
      else if (diffX < -40 && diffY < 30) {
        tr.classList.remove("swiped-left");
      }
    }, { passive: true });

    tbody.appendChild(tr);
  });
}

function deleteRecord(id) {
  let records = getRecords();
  records = records.filter(r => String(r.id) !== String(id));
  saveRecords(records);
  renderTable();

  // 成長記録グラフ展開時はリアルタイムリフレッシュ
  const graphModal = document.getElementById("graphModal");
  if (graphModal && !graphModal.classList.contains("hidden")) {
    renderGraph();
  }
}

/* ===========================================================================
   Render Menus (セレクトボックスの動的連動)
   =========================================================================== */

function renderMenu(selectId, partKey) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // フィルター用・グラフ用・入力用の出し分け共通化
  if (selectId === "menuFilter") {
    select.innerHTML = '<option value="">全種目</option>';
  } else if (selectId === "graphMenu") {
    select.innerHTML = '<option value="">全種目</option>';
  } else {
    select.innerHTML = '';
  }

  const menus = trainingMenus[partKey] || [];
  menus.forEach(m => {
    const menuName = Array.isArray(m) ? m[0] : m; // 万が一のデータ破損を想定したセーフガード
    select.innerHTML += `<option value="${menuName}">${menuName}</option>`;
  });
}

/* ===========================================================================
   Filters & Date Fields Initializations
   =========================================================================== */

function initDateFilters() {
  const records = getRecords();
  const years = [...new Set(records.map(r => r.date.slice(0, 4)))];
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  
  const currentYear = new Date().getFullYear();
  if (!years.includes(String(currentYear))) {
    years.push(String(currentYear));
  }
  years.sort((a, b) => b - a);

  const yFilter = document.getElementById("yearFilter");
  const mFilter = document.getElementById("monthFilter");
  const gYear = document.getElementById("graphYear");
  const gMonth = document.getElementById("graphMonth");

  if (yFilter) {
    yFilter.innerHTML = '<option value="">全年</option>';
    years.forEach(y => yFilter.innerHTML += `<option value="${y}">${y}年</option>`);
  }
  if (gYear) {
    gYear.innerHTML = '<option value="">全年</option>';
    years.forEach(y => gYear.innerHTML += `<option value="${y}">${y}年</option>`);
  }

  if (mFilter) {
    mFilter.innerHTML = '<option value="">全月</option>';
    months.forEach(m => mFilter.innerHTML += `<option value="${m}">${Number(m)}月</option>`);
  }
  if (gMonth) {
    gMonth.innerHTML = '<option value="">全月</option>';
    months.forEach(m => gMonth.innerHTML += `<option value="${m}">${Number(m)}月</option>`);
  }

  // グラフ用部位セレクト初期化
  const gPart = document.getElementById("graphPart");
  if (gPart) {
    gPart.innerHTML = `
      <option value="">全部位</option>
      <option value="胸">胸</option>
      <option value="肩">肩</option>
      <option value="腕">腕</option>
      <option value="背中">背中</option>
    `;
  }
}

/* ===========================================================================
   Render Growth Graph (成長記録のビジュアル化)
   =========================================================================== */

function renderGraph() {
  const canvas = document.getElementById("growthChart");
  if (!canvas) return;

  const year = document.getElementById("graphYear") ? document.getElementById("graphYear").value : "";
  const month = document.getElementById("graphMonth") ? document.getElementById("graphMonth").value : "";
  const part = document.getElementById("graphPart") ? document.getElementById("graphPart").value : "";
  const menu = document.getElementById("graphMenu") ? document.getElementById("graphMenu").value : "";

  let records = getRecords();

  if (year) records = records.filter(r => r.date.startsWith(year));
  if (month) records = records.filter(r => Number(r.date.split("-")[1]) === Number(month));
  if (part) records = records.filter(r => r.part === part);
  if (menu) records = records.filter(r => r.menu === menu);

  // 時系列順(古い順)に並び替えて成長を可視化
  records.sort((a, b) => a.date.localeCompare(b.date));

  const labels = records.map(r => r.date.slice(5)); // 見やすさ考慮し「MM-DD」を抽出
  const dataPoints = records.map(r => r.rm);

  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Max RM 推移",
        data: dataPoints,
        borderColor: "#0cd316",
        backgroundColor: "rgba(32, 211, 12, 0.1)",
        borderWidth: 2,
        tension: 0.2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#fff" } },
        y: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#fff" } }
      }
    }
  });
}

/* ===========================================================================
   Event Listeners & Modal Control Mount
   =========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initDateFilters();

  // 初期時は「胸」を基本セット
  renderMenu("menuInput", "胸");
  renderMenu("menuFilter", "胸");
  renderMenu("graphMenu", "胸");

  // メイン画面のデフォルトフィルター値を今年に固定設定
  const now = new Date();
  if (document.getElementById("yearFilter")) {
    document.getElementById("yearFilter").value = now.getFullYear();
  }
  renderTable();

  // データ追加モーダル開閉
  const addBtn = document.getElementById("addBtn");
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeBtn");
  const saveBtn = document.getElementById("saveBtn");

  if (addBtn && modal) {
    addBtn.onclick = () => {
      if (document.getElementById("dateInput")) {
        document.getElementById("dateInput").value = new Date().toISOString().split("T")[0];
      }
      if (document.getElementById("weightInput")) document.getElementById("weightInput").value = "";
      if (document.getElementById("repsInput")) document.getElementById("repsInput").value = "";
      modal.classList.remove("hidden");
    };
  }

  if (closeBtn && modal) {
    closeBtn.onclick = () => modal.classList.add("hidden");
  }

  if (saveBtn && modal) {
    saveBtn.onclick = () => {
      const date = document.getElementById("dateInput") ? document.getElementById("dateInput").value : "";
      const part = document.getElementById("partInput") ? document.getElementById("partInput").value : "";
      const menu = document.getElementById("menuInput") ? document.getElementById("menuInput").value : "";
      const weight = document.getElementById("weightInput") ? document.getElementById("weightInput").value : "";
      const reps = document.getElementById("repsInput") ? document.getElementById("repsInput").value : "";

      if (!date || !weight || !reps) {
        alert("すべての項目を正しく入力してください。");
        return;
      }

      const records = getRecords();
      const rmValue = calcRM(Number(weight), Number(reps));

      records.push({
        id: "rec_" + Math.random().toString(36).substring(2, 11) + Date.now(),
        date,
        part,
        menu,
        weight: Number(weight),
        reps: Number(reps),
        rm: rmValue
      });

      saveRecords(records);
      initDateFilters();
      renderTable();
      modal.classList.add("hidden");
    };
  }

  // 成長記録グラフモーダル開閉
  const graphBtn = document.getElementById("graphBtn");
  const graphModal = document.getElementById("graphModal");
  const graphCloseBtn = document.getElementById("graphCloseBtn");

  if (graphBtn && graphModal) {
    graphBtn.onclick = () => {
      graphModal.classList.remove("hidden");
      renderGraph();
    };
  }

  if (graphCloseBtn && graphModal) {
    graphCloseBtn.onclick = () => graphModal.classList.add("hidden");
  }

  // セレクトボックス変更時リスナー連動
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

  ["yearFilter", "monthFilter", "menuFilter"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderTable);
  });

  ["graphYear", "graphMonth", "graphMenu"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderGraph);
  });
});