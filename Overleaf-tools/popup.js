const $ = (id) => document.getElementById(id);

const TEMPLATES = {
  lstlisting: "\\begin{lstlisting}[language=Python, caption={}, label={lst:}]\n\n\\end{lstlisting}",
  minted: "\\begin{minted}[linenos]{python}\n\n\\end{minted}",
  verbatim: "\\begin{verbatim}\n\n\\end{verbatim}",
};

let snips = [];
let editingId = null;

/* ----------------------------- Lưu trữ ------------------------------ */

function load() {
  chrome.storage.local.get({ snips: [] }, (res) => {
    snips = (res && res.snips) || [];
    render();
  });
}

function save(next) {
  snips = next;
  chrome.storage.local.set({ snips }, render);
}

/* --------------------------- Gửi lệnh ------------------------------ */

function note(text, warn) {
  const el = $("note");
  el.textContent = text || "";
  el.classList.toggle("warn", !!warn);
}

function run(action, content) {
  chrome.runtime.sendMessage({ target: "background", action, content }, (res) => {
    if (chrome.runtime.lastError || !res || !res.ok) {
      note("⚠️ Hãy mở trang overleaf.com trước.", true);
      return;
    }
    window.close();
  });
}

/* ------------------------ Danh sách snip --------------------------- */

function render() {
  const q = $("filter").value.trim().toLowerCase();
  const view = q
    ? snips.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.content || "").toLowerCase().includes(q)
      )
    : snips;

  $("count").textContent = snips.length + " snip";
  const list = $("list");
  list.textContent = "";

  if (!view.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = snips.length ? "Không có snip nào khớp." : "Chưa có snip. Bấm “+ Thêm”.";
    list.appendChild(empty);
    return;
  }

  view.forEach((snip) => {
    const row = document.createElement("div");
    row.className = "row";

    const texts = document.createElement("div");
    texts.className = "texts";
    texts.title = "Dán vào Overleaf";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = snip.name || "(không tên)";
    const prev = document.createElement("div");
    prev.className = "prev";
    prev.textContent = (snip.content || "").split("\n")[0];
    texts.appendChild(name);
    texts.appendChild(prev);
    texts.addEventListener("click", () => run("insertSnip", snip.content));

    const paste = document.createElement("button");
    paste.className = "primary";
    paste.type = "button";
    paste.textContent = "Dán";
    paste.addEventListener("click", () => run("insertSnip", snip.content));

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Sửa";
    edit.addEventListener("click", () => startEdit(snip));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.title = "Xoá snip";
    del.addEventListener("click", () => {
      if (!confirm("Xoá snip “" + (snip.name || "") + "”?")) return;
      if (editingId === snip.id) closeForm();
      save(snips.filter((s) => s.id !== snip.id));
    });

    row.appendChild(texts);
    row.appendChild(paste);
    row.appendChild(edit);
    row.appendChild(del);
    list.appendChild(row);
  });
}

/* ------------------------- Thêm / sửa ------------------------------ */

function closeForm() {
  editingId = null;
  $("form").classList.remove("open");
  $("name").value = "";
  $("content").value = "";
  $("save").textContent = "Lưu snip";
}

function openForm() {
  $("form").classList.add("open");
  $("name").focus();
}

function startEdit(snip) {
  editingId = snip.id;
  $("name").value = snip.name || "";
  $("content").value = snip.content || "";
  $("save").textContent = "Cập nhật";
  openForm();
  $("content").focus();
}

$("add").addEventListener("click", () => {
  closeForm();
  openForm();
});

$("cancel").addEventListener("click", () => {
  closeForm();
  note("");
});

$("save").addEventListener("click", () => {
  const name = $("name").value.trim();
  const content = $("content").value;
  if (!name || !content.trim()) {
    note("⚠️ Cần cả tên và nội dung.", true);
    return;
  }
  if (editingId) {
    save(snips.map((s) => (s.id === editingId ? { ...s, name, content } : s)));
    note("✅ Đã cập nhật.");
  } else {
    save(snips.concat([{ id: "s" + Date.now(), name, content }]));
    note("✅ Đã lưu snip.");
  }
  closeForm();
});

document.querySelectorAll("[data-tpl]").forEach((b) => {
  b.addEventListener("click", () => {
    const tpl = TEMPLATES[b.dataset.tpl];
    const area = $("content");
    area.value = tpl;
    // Đặt con trỏ vào dòng trống giữa khung.
    const pos = tpl.indexOf("\n\n") + 1;
    area.focus();
    area.setSelectionRange(pos, pos);
    if (!$("name").value.trim()) $("name").value = b.dataset.tpl;
  });
});

$("content").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    $("save").click();
  } else if (e.key === "Tab") {
    e.preventDefault();
    const a = e.target;
    const s = a.selectionStart;
    a.value = a.value.slice(0, s) + "  " + a.value.slice(a.selectionEnd);
    a.setSelectionRange(s + 2, s + 2);
  }
});

/* ------------------------------ Khác ------------------------------- */

$("filter").addEventListener("input", render);
$("join").addEventListener("click", () => run("removeEndline"));
$("shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  window.close();
});

load();
