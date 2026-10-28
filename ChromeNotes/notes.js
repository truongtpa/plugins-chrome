// Chrome Notes – ghi chú Markdown nhiều tab (live preview), lưu trong chrome.storage.local
const KEY = "chromeNotes";
const CLIENT = Math.random().toString(36).slice(2); // phân biệt nguồn ghi giữa popup / side panel / trang
const MODE = new URLSearchParams(location.search).get("mode") || "popup";

const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
const store = {
  async get() {
    if (hasChrome) return (await chrome.storage.local.get(KEY))[KEY];
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  },
  async set(value) {
    if (hasChrome) return chrome.storage.local.set({ [KEY]: value });
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  },
};

// Tuỳ chọn hiển thị riêng cho từng nơi mở (popup / side panel / toàn trang)
const PREFS_KEY = "chromeNotesPrefs:" + MODE;
const prefs = Object.assign(
  { wrap: true, live: true },
  (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } })()
);
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} };

const $ = (s) => document.querySelector(s);
const tabsEl = $("#tabs");
const savedEl = $("#saved");
const countEl = $("#count");
const posEl = $("#pos");
const menu = $("#menu");
const isMac = /Mac/.test(navigator.platform);

const ed = LiveEditor.createEditor($("#editor"), {
  wrap: prefs.wrap,
  live: prefs.live,
  placeholderText: "Viết Markdown… # tiêu đề, **đậm**, - [ ] việc cần làm, $công thức$",
  onChange(text) {
    const t = active();
    t.content = text;
    t.updated = Date.now();
    updateCount(text);
    scheduleSave();
  },
  onCursor(line, col) {
    posEl.textContent = `Dòng ${line}, Cột ${col}`;
  },
});

let state = { tabs: [], activeId: null };
let saveTimer = null;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const newTab = (title, content = "") => ({ id: uid(), title, content, updated: Date.now() });
const active = () => state.tabs.find((t) => t.id === state.activeId) || state.tabs[0];

function nextTitle() {
  const used = new Set(state.tabs.map((t) => t.title));
  let i = state.tabs.length + 1;
  while (used.has(`Ghi chú ${i}`)) i++;
  return `Ghi chú ${i}`;
}

// ---------- Lưu ----------
function scheduleSave() {
  savedEl.textContent = "Đang lưu…";
  savedEl.classList.add("pending");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  await store.set({ ...state, writer: CLIENT });
  savedEl.textContent = "Đã lưu";
  savedEl.classList.remove("pending");
}

// ---------- Hiển thị ----------
function renderTabs() {
  tabsEl.innerHTML = "";
  for (const t of state.tabs) {
    const li = document.createElement("li");
    li.className = "tab" + (t.id === state.activeId ? " active" : "");
    li.dataset.id = t.id;
    li.draggable = true;
    li.title = t.title + " — nhấp đúp để đổi tên";
    li.setAttribute("role", "tab");

    const span = document.createElement("span");
    span.className = "title";
    span.textContent = t.title;

    const close = document.createElement("button");
    close.className = "close";
    close.innerHTML = '<svg><use href="#i-x"/></svg>';
    close.title = "Đóng tab";
    close.addEventListener("click", (e) => { e.stopPropagation(); deleteTab(t.id); });

    li.append(span, close);
    li.addEventListener("click", () => switchTab(t.id));
    li.addEventListener("dblclick", () => startRename(t.id));
    li.addEventListener("auxclick", (e) => { if (e.button === 1) deleteTab(t.id); });
    addDragHandlers(li);
    tabsEl.appendChild(li);
  }
  tabsEl.querySelector(".tab.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderEditor() {
  const t = active();
  ed.load(t.id, t.content);
  updateCount(t.content);
}

function render() { renderTabs(); renderEditor(); }

function updateCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  countEl.textContent = `${words} từ · ${text.length} ký tự`;
}

// ---------- Tuỳ chọn hiển thị ----------
function applyPrefs() {
  ed.setWrap(prefs.wrap);
  ed.setLive(prefs.live);
  $('[data-act="wrap"]').classList.toggle("checked", prefs.wrap);
  $('[data-act="source"]').classList.toggle("checked", !prefs.live);
  document.body.classList.toggle("source", !prefs.live);
}
function toggleWrap() {
  prefs.wrap = !prefs.wrap;
  savePrefs();
  applyPrefs();
}
function toggleSource() {
  prefs.live = !prefs.live;
  savePrefs();
  applyPrefs();
  ed.focus();
}

// ---------- Thao tác tab ----------
function switchTab(id) {
  if (id === state.activeId) return;
  state.activeId = id;
  render();
  ed.focus();
  scheduleSave();
}

function addTab() {
  const t = newTab(nextTitle());
  const idx = state.tabs.findIndex((x) => x.id === state.activeId);
  state.tabs.splice(idx + 1, 0, t);
  state.activeId = t.id;
  render();
  scheduleSave();
  startRename(t.id);
}

function duplicateTab() {
  const src = active();
  const t = newTab(src.title + " (bản sao)", src.content);
  state.tabs.splice(state.tabs.indexOf(src) + 1, 0, t);
  state.activeId = t.id;
  render();
  scheduleSave();
}

function deleteTab(id) {
  const t = state.tabs.find((x) => x.id === id);
  if (!t) return;
  if (t.content.trim() && !confirm(`Xoá tab "${t.title}"? Nội dung sẽ bị mất.`)) return;
  const idx = state.tabs.indexOf(t);
  state.tabs.splice(idx, 1);
  ed.forget(id);
  if (!state.tabs.length) state.tabs.push(newTab("Ghi chú 1"));
  if (state.activeId === id) state.activeId = (state.tabs[idx] || state.tabs[idx - 1]).id;
  render();
  scheduleSave();
}

function startRename(id) {
  const li = tabsEl.querySelector(`[data-id="${id}"]`);
  const t = state.tabs.find((x) => x.id === id);
  if (!li || !t) return;
  const span = li.querySelector(".title");
  const input = document.createElement("input");
  input.value = t.title;
  li.draggable = false;
  span.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (commit && v) { t.title = v.slice(0, 60); scheduleSave(); }
    renderTabs();
    ed.focus();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
    e.stopPropagation();
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("dblclick", (e) => e.stopPropagation());
}

// ---------- Kéo thả sắp xếp ----------
let dragId = null;
function addDragHandlers(li) {
  li.addEventListener("dragstart", (e) => {
    dragId = li.dataset.id;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  li.addEventListener("dragend", () => {
    dragId = null;
    tabsEl.querySelectorAll(".tab").forEach((x) => x.classList.remove("dragging", "drop-before", "drop-after"));
  });
  li.addEventListener("dragover", (e) => {
    if (!dragId || dragId === li.dataset.id) return;
    e.preventDefault();
    const r = li.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    li.classList.toggle("drop-after", after);
    li.classList.toggle("drop-before", !after);
  });
  li.addEventListener("dragleave", () => li.classList.remove("drop-before", "drop-after"));
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragId || dragId === li.dataset.id) return;
    const after = li.classList.contains("drop-after");
    const from = state.tabs.findIndex((t) => t.id === dragId);
    const [moved] = state.tabs.splice(from, 1);
    const to = state.tabs.findIndex((t) => t.id === li.dataset.id);
    state.tabs.splice(after ? to + 1 : to, 0, moved);
    renderTabs();
    scheduleSave();
  });
}

// ---------- Xuất / nhập ----------
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, "_").trim() || "note";

function exportMd() {
  const t = active();
  download(safeName(t.title) + ".md", t.content, "text/markdown;charset=utf-8");
}
function exportAll() {
  const data = { app: "chrome-notes", version: 1, exported: new Date().toISOString(), tabs: state.tabs };
  download(`chrome-notes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
}
async function importFiles(files) {
  const added = [];
  let replaceWith = null;
  for (const file of files) {
    const text = await file.text();
    if (/\.json$/i.test(file.name)) {
      try {
        const data = JSON.parse(text);
        const tabs = (Array.isArray(data) ? data : data.tabs || [])
          .filter((t) => t && typeof t.content === "string")
          .map((t) => newTab(String(t.title || "Ghi chú").slice(0, 60), t.content));
        if (!tabs.length) { alert(`${file.name}: không có ghi chú hợp lệ.`); continue; }
        if (confirm(`${file.name}: tìm thấy ${tabs.length} tab.\n\nOK = Thay thế toàn bộ\nHuỷ = Thêm vào cuối`)) replaceWith = tabs;
        else added.push(...tabs);
      } catch {
        alert(`${file.name}: không đọc được JSON.`);
      }
    } else {
      added.push(newTab(file.name.replace(/\.(md|markdown|txt)$/i, "").slice(0, 60), text));
    }
  }
  if (replaceWith) state.tabs = replaceWith;
  state.tabs = state.tabs.concat(added);
  const first = added[0] || replaceWith?.[0];
  if (!first) return;
  state.activeId = first.id;
  render();
  saveNow();
}

async function openPanel() {
  if (!chrome?.sidePanel?.open) return alert("Trình duyệt chưa hỗ trợ Side Panel (cần Chrome 116+).");
  const win = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: win.id });
  window.close();
}

// ---------- Thanh công cụ & menu ----------
$("#addTab").addEventListener("click", addTab);

// Lăn chuột dọc để cuộn thanh tab theo chiều ngang
tabsEl.addEventListener("wheel", (e) => {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tabsEl.scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });

const menuBtn = $("#menuBtn");
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", open);
}
menuBtn.addEventListener("click", (e) => { e.stopPropagation(); setMenu(menu.hidden); });
document.addEventListener("click", () => setMenu(false));
menu.addEventListener("click", (e) => {
  const act = e.target.closest("button")?.dataset.act;
  if (!act) return;
  setMenu(false);
  ({
    rename: () => startRename(state.activeId),
    duplicate: duplicateTab,
    exportMd,
    exportAll,
    import: () => $("#importFile").click(),
    wrap: toggleWrap,
    source: toggleSource,
    openPage: () => (hasChrome ? chrome.tabs.create({ url: chrome.runtime.getURL("notes.html?mode=full") }) : null),
    openPanel,
    delete: () => deleteTab(state.activeId),
  })[act]?.();
});
$("#importFile").addEventListener("change", (e) => {
  if (e.target.files.length) importFiles([...e.target.files]);
  e.target.value = "";
});

// Kéo thả file .md / .txt / .json vào cửa sổ để nhập
document.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); });
document.addEventListener("drop", (e) => {
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  importFiles([...e.dataTransfer.files]);
});

// Phím tắt chung (bắt ở pha capture để CodeMirror không xử lý trùng Alt+←/→)
document.addEventListener("keydown", (e) => {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (e.key === "Escape" && !menu.hidden) { setMenu(false); return; }
  if (e.key === "F2") { e.preventDefault(); startRename(state.activeId); return; }
  if (mod && (e.code === "Slash" || e.key === "/")) { e.preventDefault(); e.stopPropagation(); toggleSource(); return; }
  if (!e.altKey || mod) return;
  const idx = state.tabs.findIndex((t) => t.id === state.activeId);
  const c = e.code;
  const stop = () => { e.preventDefault(); e.stopPropagation(); };
  if (c === "KeyN") { stop(); addTab(); }
  else if (c === "KeyW") { stop(); deleteTab(state.activeId); }
  else if (c === "KeyZ") { stop(); toggleWrap(); }
  else if (c === "ArrowRight") { stop(); switchTab(state.tabs[(idx + 1) % state.tabs.length].id); }
  else if (c === "ArrowLeft") { stop(); switchTab(state.tabs[(idx - 1 + state.tabs.length) % state.tabs.length].id); }
  else if (/^Digit[1-9]$/.test(c)) {
    const t = state.tabs[Number(c.slice(5)) - 1];
    if (t) { stop(); switchTab(t.id); }
  }
}, true);

// Hiện phím tắt đúng theo hệ điều hành
if (isMac) document.querySelectorAll("kbd, [title]").forEach((el) => {
  for (const attr of ["textContent", "title"]) if (el[attr]) el[attr] = el[attr].replace(/Ctrl\+/g, "⌘").replace(/Alt\+/g, "⌥").replace(/Shift\+/g, "⇧");
});

// Đóng popup thì lưu ngay phần đang chờ
window.addEventListener("pagehide", () => { if (saveTimer) saveNow(); });

// Đồng bộ khi popup / side panel / trang toàn màn hình cùng mở
if (hasChrome) {
  chrome.storage.onChanged.addListener((changes, area) => {
    const v = changes[KEY]?.newValue;
    if (area !== "local" || !v || v.writer === CLIENT) return;
    const prevActive = state.activeId;
    state = { tabs: v.tabs, activeId: v.tabs.some((t) => t.id === prevActive) ? prevActive : v.activeId };
    renderTabs();
    const t = active();
    if (t.id === prevActive) ed.replace(t.content);
    else ed.load(t.id, t.content);
    updateCount(t.content);
  });
}

// ---------- Khởi động ----------
const WELCOME = `# Chào mừng đến Chrome Notes

Viết **Markdown** và nó hiện ra *ngay tại chỗ* — đặt con trỏ vào đâu thì ký hiệu ở đó mới hiện để sửa.

## Việc cần làm
- [x] Cài tiện ích
- [ ] Bấm vào ô vuông để đánh dấu xong
- [ ] Viết công thức: $E = mc^2$

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

> Mẹo: **Ctrl+B** in đậm, **Ctrl+K** chèn link, **Ctrl+/** xem mã nguồn, Ctrl+click để mở link như [Markdown Guide](https://www.markdownguide.org).

| Phím | Chức năng |
|---|---|
| Alt+N | Tab mới |
| Alt+Z | Tự xuống dòng |

\`\`\`js
console.log("Hello, Markdown!");
\`\`\`
`;

(async function init() {
  if (MODE === "full" || MODE === "panel") document.body.classList.add("full");
  if (MODE === "full") document.body.classList.add("float");

  const saved = await store.get();
  if (saved?.tabs?.length) {
    state = { tabs: saved.tabs, activeId: saved.activeId };
    if (!state.tabs.some((t) => t.id === state.activeId)) state.activeId = state.tabs[0].id;
  } else {
    const t = newTab("Bắt đầu", WELCOME);
    state = { tabs: [t], activeId: t.id };
  }
  render();
  applyPrefs();
  savedEl.textContent = "Đã lưu";
  ed.focus();
})();
