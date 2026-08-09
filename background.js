// Ελέγχει αν ένα URL ανήκει στη λίστα
function isBlockedUrl(url, blockedSites) {
  return blockedSites.some((site) => url.includes(site));
}

// Επιστρέφει τη σημερινή ημερομηνία σαν string, π.χ. "2026-08-09"
function todayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Προσθέτει δευτερόλεπτα focus στο σημερινό "log"
function addFocusSeconds(seconds) {
  if (seconds <= 0) return;

  chrome.storage.local.get(["focusLog"], (data) => {
    const log = data.focusLog || {};
    const key = todayKey();
    log[key] = (log[key] || 0) + seconds;
    chrome.storage.local.set({ focusLog: log });
  });
}

// Τερματίζει το τρέχον session (είτε από Stop, είτε γιατί έληξε ο χρόνος)
// και καταγράφει τον ΠΡΑΓΜΑΤΙΚΟ χρόνο που πέρασε
function endFocusSession() {
  chrome.storage.local.get(["focusActive", "startTime", "endTime"], (data) => {
    if (!data.focusActive) return;

    const now = Date.now();
    const cappedNow = Math.min(now, data.endTime); // δεν μετράμε παραπάνω από ό,τι είχε οριστεί
    const elapsedSeconds = Math.round((cappedNow - data.startTime) / 1000);

    addFocusSeconds(elapsedSeconds);

    chrome.storage.local.set({
      focusActive: false,
      endTime: null,
      startTime: null,
    });
    chrome.alarms.clear("focusEnd");
  });
}

// "Ακούει" για μηνύματα που στέλνει το popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start") {
    const startTime = Date.now();
    const endTime = startTime + message.minutes * 60 * 1000;
    chrome.storage.local.set({
      focusActive: true,
      startTime: startTime,
      endTime: endTime,
    });
    chrome.alarms.create("focusEnd", { when: endTime });
  }

  if (message.action === "stop") {
    endFocusSession();
  }
});

// Όταν λήξει φυσικά ο χρόνος
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusEnd") {
    endFocusSession();
  }
});

// Ελέγχει κάθε φορά που φορτώνει σελίδα, αν πρέπει να μπλοκάρει
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  chrome.storage.local.get(
    ["focusActive", "endTime", "blockedSites"],
    (data) => {
      const stillActive = data.focusActive && data.endTime > Date.now();
      const blockedSites = data.blockedSites || [];

      if (stillActive && isBlockedUrl(changeInfo.url, blockedSites)) {
        chrome.tabs.update(tabId, { url: "blocked.html" });
      } else if (data.focusActive && data.endTime <= Date.now()) {
        endFocusSession();
      }
    },
  );
});
