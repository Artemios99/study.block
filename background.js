// Ελέγχει αν ένα URL ανήκει στη λίστα (τώρα παίρνει τη λίστα ως παράμετρο)
function isBlockedUrl(url, blockedSites) {
  return blockedSites.some((site) => url.includes(site));
}

// "Ακούει" για μηνύματα που στέλνει το popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start") {
    const endTime = Date.now() + message.minutes * 60 * 1000;
    chrome.storage.local.set({ focusActive: true, endTime: endTime });
  }
});

// "Ακούει" κάθε φορά που μια καρτέλα φορτώνει νέα σελίδα
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  chrome.storage.local.get(["focusActive", "endTime", "blockedSites"], (data) => {
    const stillActive = data.focusActive && data.endTime > Date.now();
    const blockedSites = data.blockedSites || [];

    if (stillActive && isBlockedUrl(changeInfo.url, blockedSites)) {
      chrome.tabs.update(tabId, { url: "blocked.html" });
    } else if (data.focusActive && data.endTime <= Date.now()) {
      chrome.storage.local.set({ focusActive: false, endTime: null });
    }
  });
});