importScripts("time.js");

async function refresh() {
  const { endAt, notified } = await chrome.storage.local.get(["endAt", "notified"]);
  if (!endAt) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const left = endAt - Date.now();
  await chrome.action.setBadgeText({ text: badgeText(left) });
  await chrome.action.setBadgeBackgroundColor({
    color: left <= 0 ? "#d93025" : left < 3600e3 ? "#f29900" : "#1a73e8"
  });
  if (left <= 0 && !notified) {
    await chrome.storage.local.set({ notified: true });
    chrome.notifications.create("countdown-end", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Hết giờ!",
      message: "Walltime đã kết thúc lúc " + formatDate(endAt),
      priority: 2
    });
  }
}

function ensureAlarm() {
  chrome.alarms.create("tick", { periodInMinutes: 0.5 });
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); refresh(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); refresh(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "tick") refresh(); });
chrome.storage.onChanged.addListener((c) => { if (c.endAt) refresh(); });
