(function () {
  let fab = null;

  function getJoined(text) {
    return text.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim();
  }

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
    }, 1600);
  }

  function removeEndline() {
    const sel = window.getSelection();
    const text = sel ? sel.toString() : "";
    if (!text) {
      showToast("⚠️ Chưa bôi đen text nào.", "error");
      return;
    }

    const joined = getJoined(text);
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
    hideFab();
  }

  function ensureFab() {
    if (fab) return fab;
    fab = document.createElement("button");
    fab.id = "remove-endline-fab";
    fab.type = "button";
    fab.textContent = "⏎ Gộp dòng";
    fab.title = "Gộp các dòng đang chọn thành 1 dòng";
    fab.style.cssText = [
      "position:absolute",
      "z-index:2147483647",
      "display:none",
      "align-items:center",
      "gap:6px",
      "padding:6px 10px",
      "border:none",
      "border-radius:8px",
      "background:#1e88e5",
      "color:#fff",
      "font:13px/1 -apple-system,Segoe UI,Roboto,sans-serif",
      "cursor:pointer",
      "box-shadow:0 3px 10px rgba(0,0,0,.3)",
      "user-select:none",
      "white-space:nowrap",
    ].join(";");

  
    fab.addEventListener("mousedown", (e) => e.preventDefault());
    fab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeEndline();
    });

    document.body.appendChild(fab);
    return fab;
  }

  function hideFab() {
    if (fab) fab.style.display = "none";
  }

  function updateFab() {
    const sel = window.getSelection();
    const text = sel ? sel.toString() : "";


    if (!text.trim()) {
      hideFab();
      return;
    }

    let range;
    try {
      range = sel.getRangeAt(0);
    } catch (e) {
      hideFab();
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideFab();
      return;
    }

    const el = ensureFab();
    el.style.display = "inline-flex";
    const top = window.scrollY + rect.top - el.offsetHeight - 8;
    const left = window.scrollX + rect.left;
    el.style.top = Math.max(window.scrollY + 4, top) + "px";
    el.style.left = left + "px";
  }

  let t = null;
  function scheduleUpdate() {
    clearTimeout(t);
    t = setTimeout(updateFab, 120);
  }
  document.addEventListener("selectionchange", scheduleUpdate);
  document.addEventListener("mouseup", scheduleUpdate, true);
  document.addEventListener("keyup", scheduleUpdate, true);
  window.addEventListener("scroll", hideFab, true);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "removeEndline") removeEndline();
  });
})();
