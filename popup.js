const statusEl = document.getElementById("status");
const setupView = document.getElementById("setup-view");
const activeView = document.getElementById("active-view");
const timerEl = document.getElementById("timer");
const durationInput = document.getElementById("duration");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const siteInput = document.getElementById("site-input");
const addSiteBtn = document.getElementById("add-site-btn");
const sitesList = document.getElementById("sites-list");
const limitMsg = document.getElementById("limit-msg");
const suggestionsBox = document.getElementById("suggestions-box");

const SITE_SUGGESTIONS = [
  "youtube.com",
  "instagram.com",
  "tiktok.com",
  "reddit.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "netflix.com"
];

const MAX_FREE_SITES = 2;

let tickInterval = null;

// Μετατρέπει milliseconds σε "MM:SS"
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + seconds.toString().padStart(2, "0");
}

// Φορτώνει τη λίστα sites από το storage και τη δείχνει στην οθόνη
function renderSites(sites) {
  sitesList.innerHTML = "";

  sites.forEach((site) => {
    const li = document.createElement("li");
    li.textContent = site + " ";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeSite(site));

    li.appendChild(removeBtn);
    sitesList.appendChild(li);
  });

  limitMsg.style.display = sites.length >= MAX_FREE_SITES ? "block" : "none";
  addSiteBtn.disabled = sites.length >= MAX_FREE_SITES;
}

function showSuggestions(query) {
  suggestionsBox.innerHTML = "";

  if (!query) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  const matches = SITE_SUGGESTIONS.filter((site) =>
    site.includes(query.toLowerCase())
  );

  if (matches.length === 0) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  matches.forEach((site) => {
    const li = document.createElement("li");
    li.textContent = site;
    li.addEventListener("click", () => {
      siteInput.value = site;
      suggestionsBox.classList.add("hidden");
      siteInput.focus();
    });
    suggestionsBox.appendChild(li);
  });

  suggestionsBox.classList.remove("hidden");
}

// Αφαιρεί ένα site από τη λίστα
function removeSite(siteToRemove) {
  chrome.storage.local.get(["blockedSites"], (data) => {
    const sites = (data.blockedSites || []).filter((s) => s !== siteToRemove);
    chrome.storage.local.set({ blockedSites: sites }, () => renderSites(sites));
  });
}

// Δείχνει το "active" view (timer + Stop button)
function showActiveView(endTime) {
  setupView.style.display = "none";
  activeView.style.display = "block";
  statusEl.textContent = "Focusing...";

  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(tickInterval);
      showSetupView();
      return;
    }
    timerEl.textContent = formatTime(remaining);
  }, 1000);
}

// Δείχνει το "setup" view (input + Start button)
function showSetupView() {
  setupView.style.display = "block";
  activeView.style.display = "none";
  statusEl.textContent = "Not focusing";
}

// Όταν ανοίγει το popup, ελέγχουμε τι κατάσταση υπάρχει ήδη
chrome.storage.local.get(["focusActive", "endTime", "blockedSites"], (data) => {
  renderSites(data.blockedSites || []);

  if (data.focusActive && data.endTime > Date.now()) {
    showActiveView(data.endTime);
  } else {
    showSetupView();
  }
});

startBtn.addEventListener("click", () => {
  const minutes = parseInt(durationInput.value, 10) || 25;
  chrome.runtime.sendMessage({ action: "start", minutes: minutes });

  const endTime = Date.now() + minutes * 60 * 1000;
  showActiveView(endTime);
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stop" });
  clearInterval(tickInterval);
  showSetupView();
});

addSiteBtn.addEventListener("click", () => {
  const site = siteInput.value.trim().toLowerCase();
  if (!site) return;

  chrome.storage.local.get(["blockedSites"], (data) => {
    const sites = data.blockedSites || [];

    if (sites.length >= MAX_FREE_SITES) return; // ασφάλεια, δεν πρέπει να συμβεί (το κουμπί είναι ήδη disabled)
    if (sites.includes(site)) return; // μην προσθέτεις διπλότυπο

    const updatedSites = [...sites, site];
    chrome.storage.local.set({ blockedSites: updatedSites }, () => {
      renderSites(updatedSites);
      siteInput.value = "";
    });
  });
});

siteInput.addEventListener("input", () => {
  showSuggestions(siteInput.value.trim());
});

document.getElementById("stats-link").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".input-wrapper")) {
    suggestionsBox.classList.add("hidden");
  }
});