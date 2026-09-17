// Overleaf Tools - service worker
// Chuyển phím tắt / lệnh từ popup xuống content script.

const ACTIONS = {
  "remove-endline": "removeEndline",
  "open-snip-picker": "openSnipPicker",
};

const DEFAULT_SNIPS = [
  {
    id: "seed-lst",
    name: "Code Python (lstlisting)",
    content:
      "\\begin{lstlisting}[language=Python, caption={}, label={lst:}]\n\n\\end{lstlisting}",
  },
  {
    id: "seed-minted",
    name: "Code (minted)",
    content: "\\begin{minted}[linenos]{python}\n\n\\end{minted}",
  },
  {
    id: "seed-verb",
    name: "Output thô (verbatim)",
    content: "\\begin{verbatim}\n\n\\end{verbatim}",
  },
  {
    id: "seed-inline",
    name: "Code trong dòng",
    content: "\\texttt{}",
  },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ snips: null }, (res) => {
    if (!res.snips) chrome.storage.local.set({ snips: DEFAULT_SNIPS });
  });
});

function isOverleaf(tab) {
  return !!tab && typeof tab.url === "string" && tab.url.startsWith("https://www.overleaf.com/");
}

// Gửi message; nếu content script chưa được nạp (vừa cài mà chưa reload tab)
// thì inject rồi gửi lại.
function sendToTab(tabId, payload) {
  chrome.tabs.sendMessage(tabId, payload, () => {
    if (!chrome.runtime.lastError) return;
    chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabs.sendMessage(tabId, payload, () => void chrome.runtime.lastError);
    });
  });
}

chrome.commands.onCommand.addListener((command, tab) => {
  const action = ACTIONS[command];
  if (!action) return;
  if (tab && tab.id != null && isOverleaf(tab)) {
    sendToTab(tab.id, { action });
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const t = tabs && tabs[0];
    if (isOverleaf(t)) sendToTab(t.id, { action });
  });
});

// Popup gọi vào đây (nó không tự lo phần inject lại content script).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== "background" || !msg.action) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const t = tabs && tabs[0];
    if (!isOverleaf(t)) {
      sendResponse({ ok: false, reason: "not-overleaf" });
      return;
    }
    sendToTab(t.id, { action: msg.action, content: msg.content });
    sendResponse({ ok: true });
  });
  return true; // trả lời bất đồng bộ
});
