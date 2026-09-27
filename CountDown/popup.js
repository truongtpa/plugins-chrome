const $ = (id) => document.getElementById(id);
let state = null; // { startAt, endAt }
let timer = null;

function render() {
  if (!state) { $("result").hidden = true; return; }
  const now = Date.now();
  const left = state.endAt - now;
  const total = state.endAt - state.startAt;
  $("result").hidden = false;

  const el = $("left");
  if (now < state.startAt) {
    el.textContent = formatDuration(left);
    $("elapsed").textContent = "chưa bắt đầu (còn " + formatDuration(state.startAt - now) + ")";
  } else {
    el.textContent = left > 0 ? formatDuration(left) : "Hết giờ";
    $("elapsed").textContent = formatDuration(Math.min(now, state.endAt) - state.startAt);
  }
  el.className = left <= 0 ? "over" : left < 3600e3 ? "warn" : "";

  const pct = total > 0 ? Math.min(100, Math.max(0, ((now - state.startAt) / total) * 100)) : 100;
  $("progress").style.width = pct + "%";
  $("progress").style.background = left <= 0 ? "#d93025" : left < 3600e3 ? "#f29900" : "#1a73e8";
  $("startOut").textContent = formatDate(state.startAt);
  $("endOut").textContent = formatDate(state.endAt);
}

function start() {
  clearInterval(timer);
  render();
  timer = setInterval(render, 1000);
}

async function save() {
  const startAt = parseStart($("start").value);
  const wall = parseWalltime($("wall").value);
  if (startAt == null) { $("error").textContent = "Start time không hợp lệ (YYYY-MM-DD HH:MM:SS)."; return; }
  if (wall == null) { $("error").textContent = "Walltime không hợp lệ (HH:MM:SS hoặc D-HH:MM:SS)."; return; }
  $("error").textContent = "";
  state = { startAt, endAt: startAt + wall };
  await chrome.storage.local.set({
    startStr: $("start").value.trim(),
    wallStr: $("wall").value.trim(),
    startAt: state.startAt,
    endAt: state.endAt,
    notified: false
  });
  start();
}

async function clearAll() {
  clearInterval(timer);
  state = null;
  $("start").value = "";
  $("wall").value = "";
  $("error").textContent = "";
  await chrome.storage.local.clear();
  render();
}

$("save").addEventListener("click", save);
$("clear").addEventListener("click", clearAll);
// Lưu nháp ngay khi gõ/dán để popup đóng (lúc đi copy) không mất dữ liệu
const draftKey = { start: "startStr", wall: "wallStr" };
for (const id of ["start", "wall"]) {
  $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
  $(id).addEventListener("input", () => {
    chrome.storage.local.set({ [draftKey[id]]: $(id).value });
  });
}

chrome.storage.local.get(["startStr", "wallStr", "startAt", "endAt"]).then((d) => {
  if (d.startStr) $("start").value = d.startStr;
  if (d.wallStr) $("wall").value = d.wallStr;
  if (d.startAt && d.endAt) { state = { startAt: d.startAt, endAt: d.endAt }; start(); }
  else $("start").focus();
});
