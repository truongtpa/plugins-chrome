
function removeEndlineInPage() {

  function showToast(message, type) {
    const old = document.getElementById("remove-endline-toast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "remove-endline-toast";
    el.textContent = message;
    const bg = type === "error" ? "#d14343" : "#2e7d32";
    el.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:2147483647",
      "max-width:320px",
      "padding:12px 16px",
      "border-radius:10px",
      "background:" + bg,
      "color:#fff",
      "font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif",
      "box-shadow:0 6px 20px rgba(0,0,0,.25)",
      "opacity:0",
      "transform:translateY(10px)",
      "transition:opacity .2s ease,transform .2s ease",
    ].join(";");
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(() => el.remove(), 250);
    }, 1800);
  }

  const sel = window.getSelection();
  const text = sel ? sel.toString() : "";
  if (!text) {
    showToast("⚠️ Chưa bôi đen text nào.", "error");
    return;
  }


  const joined = text.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim();

  const active = document.activeElement;
  if (active && typeof active.focus === "function") active.focus();


  let ok = false;
  try {
    ok = document.execCommand("insertText", false, joined);
  } catch (e) {
    ok = false;
  }

  if (!ok) {
    const dt = new DataTransfer();
    dt.setData("text/plain", joined);
    (active || document.body).dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  showToast("✅ Đã gộp dòng xong.", "ok");
}

function runRemoveEndline(tabId) {
  if (!tabId) return;
  chrome.scripting.executeScript({
    target: { tabId },
    func: removeEndlineInPage,
  });
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "remove-endline") runRemoveEndline(tab?.id);
});

chrome.action.onClicked.addListener((tab) => {
  runRemoveEndline(tab?.id);
});
