(function () {
  if (window.__overleafToolsLoaded) return;
  window.__overleafToolsLoaded = true;

  /* --------------------------- Tiện ích chung --------------------------- */

  // Thao tác thành công thì không báo gì (kết quả thấy ngay trong editor).
  // Chỉ báo khi có trục trặc, dạng pill nhỏ ở đáy màn hình.
  function notify(message, type) {
    const old = document.getElementById("ovt-notice");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "ovt-notice";
    el.textContent = message;
    el.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:28px",
      "z-index:2147483647",
      "max-width:min(420px,84vw)",
      "padding:8px 14px",
      "border-radius:999px",
      "background:" + (type === "error" ? "rgba(155,44,44,.94)" : "rgba(32,37,43,.92)"),
      "color:#fff",
      "font:13px/1.35 -apple-system,Segoe UI,Roboto,sans-serif",
      "box-shadow:0 4px 16px rgba(0,0,0,.18)",
      "backdrop-filter:blur(4px)",
      "pointer-events:none",
      "opacity:0",
      "transform:translate(-50%,6px)",
      "transition:opacity .18s ease,transform .18s ease",
    ].join(";");
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translate(-50%,0)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translate(-50%,6px)";
      setTimeout(() => el.remove(), 200);
    }, 2200);
  }

  function isEditable(el) {
    if (!el) return false;
    return el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "INPUT";
  }

  // Nhớ ô soạn thảo đang focus, vì mở popup/bảng chọn sẽ làm mất focus.
  let lastEditor = null;
  let lastRange = null;

  function rememberEditor() {
    const active = document.activeElement;
    if (!isEditable(active)) return;
    lastEditor = active;
    const sel = window.getSelection();
    lastRange = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  }

  document.addEventListener("focusin", rememberEditor, true);
  document.addEventListener("mouseup", rememberEditor, true);
  document.addEventListener("keyup", rememberEditor, true);

  function restoreEditor() {
    const target =
      lastEditor && document.body.contains(lastEditor) ? lastEditor : document.activeElement;
    if (target && typeof target.focus === "function") target.focus();
    if (target && target.isContentEditable && lastRange) {
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastRange);
      } catch (e) {
        /* bỏ qua: CodeMirror tự giữ con trỏ */
      }
    }
    return target;
  }

  // Con trỏ đang giữa dòng thì cần xuống dòng trước khi dán một khối nhiều dòng.
  function caretAtLineStart() {
    const target = lastEditor;
    if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
      const pos = target.selectionStart || 0;
      return pos === 0 || /\n[ \t]*$/.test(target.value.slice(0, pos));
    }
    if (!lastRange) return true;
    const node = lastRange.startContainer;
    if (node.nodeType === 3) return node.textContent.slice(0, lastRange.startOffset).trim() === "";
    if (node.nodeType === 1) {
      const prev = node.childNodes[lastRange.startOffset - 1];
      const text = prev ? prev.textContent || "" : "";
      return text.trim() === "" || /\n[ \t]*$/.test(text);
    }
    return true;
  }

  // Overleaf dùng CodeMirror 6 (contenteditable): dán qua ClipboardEvent giữ
  // được xuống dòng, execCommand dùng cho 1 dòng và làm phương án dự phòng.
  function insertIntoEditor(text) {
    const target = restoreEditor();
    if (!isEditable(target)) {
      notify("Hãy đặt con trỏ vào file .tex trước đã.", "error");
      return false;
    }

    let ok = false;
    if (!text.includes("\n")) {
      try {
        ok = document.execCommand("insertText", false, text);
      } catch (e) {
        ok = false;
      }
    }

    if (!ok) {
      try {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        const evt = new ClipboardEvent("paste", {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
        });
        // dispatchEvent trả về false nghĩa là trình soạn thảo đã xử lý.
        ok = target.dispatchEvent(evt) === false;
      } catch (e) {
        ok = false;
      }
    }

    if (!ok) {
      try {
        ok = document.execCommand("insertText", false, text);
      } catch (e) {
        ok = false;
      }
    }

    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => notify("Không dán được trực tiếp — đã copy, bấm Ctrl+V.", "warn"),
        () => notify("Không dán được vào trình soạn thảo.", "error")
      );
      return false;
    }

    return ok;
  }

  function insertSnip(content) {
    if (!content) return;
    const prefix = content.includes("\n") && !caretAtLineStart() ? "\n" : "";
    insertIntoEditor(prefix + content);
  }

  /* ----------------------- Gộp dòng vùng đang chọn ---------------------- */

  function removeEndline() {
    const sel = window.getSelection();
    const text = sel ? sel.toString() : "";
    if (!text) {
      notify("Chưa bôi đen text nào.", "error");
      return;
    }
    const joined = text.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim();
    insertIntoEditor(joined);
    hideFab();
  }

  /* ------------------- Bảng chọn snip (Alt+Shift+K) -------------------- */

  let picker = null;

  function closePicker() {
    if (!picker) return;
    picker.host.remove();
    picker = null;
  }

  function openSnipPicker() {
    if (picker && document.body.contains(picker.host)) {
      picker.search.focus();
      return;
    }
    picker = null;
    rememberEditor();

    chrome.storage.local.get({ snips: [] }, (res) => {
      const snips = (res && res.snips) || [];
      if (!snips.length) {
        notify("Chưa có snip nào — bấm icon extension để thêm.", "warn");
        return;
      }
      buildPicker(snips);
    });
  }

  function buildPicker(snips) {
    const host = document.createElement("div");
    host.id = "ovt-picker-host";
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });

    const backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;background:rgba(15,20,25,.4);display:flex;align-items:flex-start;" +
      "justify-content:center;padding:12vh 16px 16px;box-sizing:border-box";

    const card = document.createElement("div");
    card.style.cssText =
      "width:min(520px,94vw);box-sizing:border-box;background:#fff;border-radius:12px;" +
      "box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden";

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Tìm snip… (↑↓ chọn, Enter dán, Esc đóng)";
    search.spellcheck = false;
    search.style.cssText =
      "box-sizing:border-box;width:100%;padding:12px 14px;border:none;border-bottom:1px solid #e2e7ee;" +
      "outline:none;background:#fff;color:#1b1f24;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif";

    const list = document.createElement("div");
    list.style.cssText = "max-height:46vh;overflow:auto";

    const foot = document.createElement("div");
    foot.style.cssText =
      "padding:8px 14px;border-top:1px solid #e2e7ee;background:#f7f9fc;color:#6b7684;" +
      "font:12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif";
    foot.textContent = "Bấm số 1–9 để dán nhanh · Quản lý snip ở icon extension";

    card.appendChild(search);
    card.appendChild(list);
    card.appendChild(foot);
    backdrop.appendChild(card);
    root.appendChild(backdrop);
    document.body.appendChild(host);

    picker = { host, backdrop, search, list, snips, view: snips, index: 0 };

    function render() {
      const q = search.value.trim().toLowerCase();
      picker.view = q
        ? snips.filter(
            (s) =>
              s.name.toLowerCase().includes(q) || (s.content || "").toLowerCase().includes(q)
          )
        : snips;
      if (picker.index >= picker.view.length) picker.index = Math.max(0, picker.view.length - 1);

      list.textContent = "";
      if (!picker.view.length) {
        const empty = document.createElement("div");
        empty.style.cssText =
          "padding:18px 14px;color:#6b7684;font:13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif";
        empty.textContent = "Không có snip nào khớp.";
        list.appendChild(empty);
        return;
      }

      picker.view.forEach((snip, i) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;" +
          "border-bottom:1px solid #f0f3f7;background:" + (i === picker.index ? "#eef6ff" : "#fff");

        const num = document.createElement("span");
        num.style.cssText =
          "flex:0 0 20px;text-align:center;color:#8a93a0;font:11px/1 ui-monospace,Menlo,Consolas,monospace";
        num.textContent = i < 9 ? String(i + 1) : "";

        const texts = document.createElement("div");
        texts.style.cssText = "min-width:0;flex:1";
        const name = document.createElement("div");
        name.style.cssText =
          "font:600 13px/1.3 -apple-system,Segoe UI,Roboto,sans-serif;color:#1b1f24;" +
          "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        name.textContent = snip.name || "(không tên)";
        const prev = document.createElement("div");
        prev.style.cssText =
          "margin-top:2px;color:#6b7684;font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;" +
          "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        prev.textContent = (snip.content || "").split("\n")[0];
        texts.appendChild(name);
        texts.appendChild(prev);

        row.appendChild(num);
        row.appendChild(texts);
        row.addEventListener("mouseenter", () => {
          picker.index = i;
          render();
        });
        row.addEventListener("mousedown", (e) => e.preventDefault());
        row.addEventListener("click", () => choose(i));
        list.appendChild(row);
      });
    }

    function choose(i) {
      const snip = picker.view[i];
      closePicker();
      if (snip) insertSnip(snip.content);
    }

    search.addEventListener("input", () => {
      picker.index = 0;
      render();
    });

    // Chặn phím rò xuống trang để không kích hoạt phím tắt của Overleaf.
    ["keyup", "keypress"].forEach((t) =>
      backdrop.addEventListener(t, (e) => e.stopPropagation())
    );
    backdrop.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        picker.index = Math.min(picker.index + 1, picker.view.length - 1);
        render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        picker.index = Math.max(picker.index - 1, 0);
        render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(picker.index);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key) && !search.value) {
        e.preventDefault();
        choose(Number(e.key) - 1);
      }
    });
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) closePicker();
    });

    render();
    search.focus();
    hideFab();
  }

  /* --------------------- Nút nổi khi bôi đen văn bản -------------------- */

  let fab = null;

  function ensureFab() {
    if (fab) return fab;
    fab = document.createElement("button");
    fab.id = "ovt-fab";
    fab.type = "button";
    fab.textContent = "⏎ Gộp dòng";
    fab.title = "Gộp các dòng đang chọn thành 1 dòng";
    fab.style.cssText = [
      "position:absolute",
      "z-index:2147483646",
      "display:none",
      "align-items:center",
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
    if (picker) return;
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

    const node = ensureFab();
    node.style.display = "inline-flex";
    node.style.top = Math.max(window.scrollY + 4, window.scrollY + rect.top - node.offsetHeight - 8) + "px";
    node.style.left = window.scrollX + rect.left + "px";
  }

  let timer = null;
  function scheduleUpdate() {
    clearTimeout(timer);
    timer = setTimeout(updateFab, 120);
  }
  document.addEventListener("selectionchange", scheduleUpdate);
  document.addEventListener("mouseup", scheduleUpdate, true);
  document.addEventListener("keyup", scheduleUpdate, true);
  window.addEventListener("scroll", hideFab, true);

  /* ---------------------------------------------------------------------- */

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "removeEndline") removeEndline();
    else if (msg && msg.action === "openSnipPicker") openSnipPicker();
    else if (msg && msg.action === "insertSnip") insertSnip(msg.content || "");
    // Luôn trả lời để background không tưởng là chưa có content script.
    sendResponse({ ok: true });
  });
})();
