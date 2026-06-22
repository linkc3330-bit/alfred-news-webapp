const tg = window.Telegram?.WebApp;

const state = {
  activeTab: "business_tech",
  digest: { items: [] },
  saved: new Set(JSON.parse(localStorage.getItem("alfred_saved_codes") || "[]")),
};

const cardsEl = document.querySelector("#cards");
const emptyEl = document.querySelector("#emptyState");
const countEl = document.querySelector("#storyCount");
const updatedEl = document.querySelector("#updatedAt");
const weekdayEl = document.querySelector("#weekdayText");
const clockEl = document.querySelector("#clockText");

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function updateClock() {
  const now = new Date();
  weekdayEl.textContent = new Intl.DateTimeFormat("en-US", { weekday: "short" })
    .format(now)
    .toUpperCase();
  clockEl.textContent = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}

function displayTitle(item) {
  return item.title_zh_hant || item.title || "未命名新聞";
}

function filteredItems() {
  const items = state.digest.items || [];
  if (state.activeTab === "saved") {
    return items.filter((item) => state.saved.has(item.code));
  }
  return items.filter((item) => item.category_key === state.activeTab);
}

function saveCode(code) {
  state.saved.add(code);
  localStorage.setItem("alfred_saved_codes", JSON.stringify([...state.saved]));
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: "save_interest", code }));
  }
  render();
}

function render() {
  const items = filteredItems();
  cardsEl.innerHTML = "";
  countEl.textContent = `${items.length} 則`;
  emptyEl.hidden = items.length !== 0;

  for (const item of items) {
    const saved = state.saved.has(item.code);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-head">
        <span class="code">${item.code}</span>
        <span class="source">${item.source || ""}</span>
      </div>
      <h2 class="title">
        <a href="${item.link || "#"}" target="_blank" rel="noopener">${displayTitle(item)}</a>
      </h2>
      <p class="meta">${formatTime(item.published_at)}</p>
      <p class="summary">${item.summary || "點閱讀原文查看完整報導。"}</p>
      <div class="actions">
        <a class="action" href="${item.link || "#"}" target="_blank" rel="noopener">閱讀原文</a>
        <button class="action primary ${saved ? "is-saved" : ""}" type="button" data-code="${item.code}">
          ${saved ? "已記錄" : "記錄偏好"}
        </button>
      </div>
    `;
    cardsEl.appendChild(card);
  }

  document.querySelectorAll("[data-code]").forEach((button) => {
    button.addEventListener("click", () => saveCode(button.dataset.code));
  });
}

async function loadDigest() {
  const response = await fetch(`./latest_digest.json?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load digest: ${response.status}`);
  state.digest = await response.json();
  updatedEl.textContent = `${formatTime(state.digest.generated_at)} 更新`;
  render();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    render();
  });
});

document.querySelector("#refreshButton").addEventListener("click", () => {
  loadDigest().catch(() => {
    updatedEl.textContent = "重新整理失敗";
  });
});

tg?.ready?.();
tg?.expand?.();

updateClock();
setInterval(updateClock, 30000);

loadDigest().catch(() => {
  updatedEl.textContent = "資料尚未產生";
  render();
});
