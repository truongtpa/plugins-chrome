// Bấm icon extension → mở (hoặc chuyển tới) trang LearnVocab full page.
const APP_URL = chrome.runtime.getURL("app.html");

chrome.action.onClicked.addListener(async () => {
  // getContexts không cần quyền "tabs" để tìm trang của chính extension
  const ctx = chrome.runtime.getContexts
    ? await chrome.runtime.getContexts({ contextTypes: ["TAB"] })
    : [];
  const open = ctx.find((c) => c.documentUrl && c.documentUrl.startsWith(APP_URL));
  if (open) {
    await chrome.tabs.update(open.tabId, { active: true });
    await chrome.windows.update(open.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: APP_URL });
  }
});
