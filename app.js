const tg = window.Telegram?.WebApp;

const state = {
  activeTab: "business_tech",
  digest: { items: [] },
  saved: new Set(JSON.parse(localStorage.getItem("alfred_saved_codes") || "[]")),
};

const cardsEl = document.querySelector("#cards");
const emptyEl = document.querySelector("#emptyState");
const countEl = document.querySelector("#storyCount");
const selectedCountEl = document.querySelector("#selectedCount");
const statusTimeEl = document.querySelector("#statusTime");
const heroGreetingEl = document.querySelector("#heroGreeting");
const heroWeekdayEl = document.querySelector("#heroWeekday");
const heroTimeEl = document.querySelector("#heroTime");
const heroDateEl = document.querySelector("#heroDate");
const identityEl = document.querySelector(".identity");

function applyTelegramPlatformLayout() {
  const platform = String(tg?.platform || "browser").toLowerCase();
  const isDesktopPlatform = ["tdesktop", "macos", "weba", "webk", "web"].includes(platform);
  const isWideViewport = window.matchMedia("(min-width: 900px)").matches;
  const layout = isDesktopPlatform || isWideViewport ? "desktop" : "mobile";
  const stableHeight = Math.round(tg?.viewportStableHeight || window.innerHeight || 0);

  document.body.dataset.platform = platform;
  document.body.classList.toggle("tg-desktop", layout === "desktop");
  document.body.classList.toggle("tg-mobile", layout === "mobile");
  document.documentElement.style.setProperty("--tg-stable-height", `${stableHeight}px`);
  applyCompactHeaderState();
}

function applyCompactHeaderState() {
  if (!document.body.classList.contains("tg-mobile")) {
    document.body.classList.remove("is-compact-header");
    return;
  }

  const threshold = identityEl
    ? Math.max(72, identityEl.offsetTop + identityEl.offsetHeight - 62)
    : 120;
  document.body.classList.toggle("is-compact-header", window.scrollY > threshold);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function displayTitle(item) {
  return item.title_zh_hant || item.title || "Untitled story";
}

function updateClock() {
  const clock = window.AlfredTime.formatHeroClock(new Date());
  statusTimeEl.textContent = clock.statusTime;
  heroGreetingEl.textContent = clock.greeting;
  heroWeekdayEl.textContent = clock.weekday;
  heroDateEl.textContent = clock.date;
  heroTimeEl.textContent = clock.time;
}

function orderedItems() {
  return state.digest.items || [];
}

function filteredItems() {
  const items = orderedItems();
  if (state.activeTab === "saved") {
    return items.filter((item) => state.saved.has(item.code));
  }
  return items.filter((item) => item.category_key === state.activeTab);
}

function persistSaved() {
  localStorage.setItem("alfred_saved_codes", JSON.stringify([...state.saved]));
  selectedCountEl.textContent = `Open selected news (${state.saved.size})`;
}

function sendPreferenceAction(action, code) {
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action, code }));
  }
}

function toggleSavedCode(code, shouldNotify = true) {
  const wasSaved = state.saved.has(code);
  if (wasSaved) {
    state.saved.delete(code);
  } else {
    state.saved.add(code);
  }
  persistSaved();
  if (shouldNotify) {
    sendPreferenceAction(wasSaved ? "unsave_interest" : "save_interest", code);
  }
  render();
}

function render() {
  const items = filteredItems();
  cardsEl.innerHTML = "";
  countEl.textContent = `${items.length} ${items.length === 1 ? "story" : "stories"}`;
  emptyEl.hidden = items.length !== 0;
  persistSaved();

  for (const item of items) {
    const saved = state.saved.has(item.code);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-copy">
        <div class="card-meta">
          <span>${item.source || "Unknown source"}</span>
          <span>${formatDateTime(item.published_at)}</span>
        </div>
        <h2 class="title">
          <a href="${item.link || "#"}" target="_blank" rel="noopener">${displayTitle(item)}</a>
        </h2>
        <p class="summary">${item.summary || "Open the article for the full report."}</p>
      </div>
      <div class="actions">
        <a class="action" href="${item.link || "#"}" target="_blank" rel="noopener">Open article</a>
        <button class="action primary ${saved ? "is-saved" : ""}" type="button" data-code="${item.code}">
          ${saved ? "Saved" : "Save"}
        </button>
      </div>
    `;
    cardsEl.appendChild(card);
  }

  document.querySelectorAll("[data-code]").forEach((button) => {
    button.addEventListener("click", () => toggleSavedCode(button.dataset.code));
  });
}

async function loadDigest() {
  const response = await fetch(`./latest_digest.json?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load digest: ${response.status}`);
  state.digest = await response.json();
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
    countEl.textContent = "Refresh failed";
  });
});

document.querySelector("#sendSelectedButton").addEventListener("click", () => {
  if (!tg?.sendData) return;
  for (const code of state.saved) {
    tg.sendData(JSON.stringify({ action: "save_interest", code }));
  }
});

tg?.ready?.();
tg?.expand?.();

applyTelegramPlatformLayout();
tg?.onEvent?.("viewportChanged", applyTelegramPlatformLayout);
window.addEventListener("resize", applyTelegramPlatformLayout);
window.addEventListener("scroll", applyCompactHeaderState, { passive: true });

updateClock();
setInterval(updateClock, 30000);

loadDigest().catch(() => {
  countEl.textContent = "Data not ready";
  render();
});
