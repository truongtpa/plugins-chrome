"use strict";

/* =========================================================
   LearnVocab – sổ từ vựng đa ngôn ngữ (full page)
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Bỏ dấu Latin (é → e, ệ → e, đ → d) để tìm kiếm; giữ nguyên chữ Hàn/Nhật/Trung
const norm = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").normalize("NFC").trim();

/* ---------- Ngôn ngữ ---------- */
const LANGS = [
  { code: "en", name: "Tiếng Anh", eng: "English", tts: "en-US", h: 220 },
  { code: "ja", name: "Tiếng Nhật", eng: "Japanese", tts: "ja-JP", h: 350 },
  { code: "ko", name: "Tiếng Hàn", eng: "Korean", tts: "ko-KR", h: 195 },
  { code: "zh", name: "Tiếng Trung", eng: "Chinese (Mandarin)", tts: "zh-CN", h: 8 },
  { code: "fr", name: "Tiếng Pháp", eng: "French", tts: "fr-FR", h: 245 },
  { code: "de", name: "Tiếng Đức", eng: "German", tts: "de-DE", h: 40 },
  { code: "es", name: "Tiếng Tây Ban Nha", eng: "Spanish", tts: "es-ES", h: 28 },
  { code: "it", name: "Tiếng Ý", eng: "Italian", tts: "it-IT", h: 130 },
  { code: "pt", name: "Tiếng Bồ Đào Nha", eng: "Portuguese", tts: "pt-PT", h: 155 },
  { code: "ru", name: "Tiếng Nga", eng: "Russian", tts: "ru-RU", h: 265 },
  { code: "th", name: "Tiếng Thái", eng: "Thai", tts: "th-TH", h: 290 },
  { code: "vi", name: "Tiếng Việt", eng: "Vietnamese", tts: "vi-VN", h: 0 },
];
const langOf = (c) => LANGS.find((l) => l.code === c) || { code: c || "?", name: c || "Khác", eng: c, tts: c, h: 220 };
const langPill = (c) => {
  const L = langOf(c);
  return `<span class="lang-pill" style="--h:${L.h}" title="${esc(L.name)}">${esc(L.code.toUpperCase())}</span>`;
};
const langOptions = (sel) => LANGS.map((l) => `<option value="${l.code}"${l.code === sel ? " selected" : ""}>${esc(l.name)}</option>`).join("");

/* ---------- Ngày tháng ---------- */
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const startOfWeek = (t = Date.now()) => addDays(startOfDay(t), -((new Date(t).getDay() + 6) % 7)); // tuần bắt đầu thứ Hai
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = (t) => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WD_FULL = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const fmtDays = (n) => (n < 30 ? `${n} ngày` : n < 365 ? `${Math.round(n / 3) / 10} tháng` : `${Math.round(n / 36.5) / 10} năm`);
const fmtDue = (t) => {
  const d = Math.round((startOfDay(t) - startOfDay()) / 86400000);
  return d <= 0 ? "Hôm nay" : d === 1 ? "Ngày mai" : `${fmtDays(d)} nữa`;
};

/* ---------- Icons ---------- */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.3-4.3"/>',
  cards: '<rect x="2.5" y="7" width="14" height="14" rx="2.5"/><path d="M7.5 3h11A2.5 2.5 0 0 1 21 5.5v11"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
  sparkles: '<path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  speaker: '<path d="M11 5 6 9H2.5v6H6l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M18.5 6l-.9 14a1.5 1.5 0 0 1-1.5 1.4H7.9a1.5 1.5 0 0 1-1.5-1.4L5.5 6M10 11v6M14 11v6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9.5h18M3 15h18M9.5 3v18"/>',
  updown: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/>',
};
const icon = (n) =>
  `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const hydrateIcons = (root) => root.querySelectorAll("i[data-icon]").forEach((el) => (el.outerHTML = icon(el.dataset.icon)));

/* =========================================================
   Lưu trữ: chrome.storage.local (fallback localStorage khi mở ngoài extension)
   ========================================================= */
const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
const store = {
  async get(keys) {
    if (hasChrome) return chrome.storage.local.get(keys);
    const o = {};
    for (const k of keys) {
      const v = localStorage.getItem("lv_" + k);
      if (v != null) o[k] = JSON.parse(v);
    }
    return o;
  },
  async set(obj) {
    if (hasChrome) return chrome.storage.local.set(obj);
    for (const [k, v] of Object.entries(obj)) localStorage.setItem("lv_" + k, JSON.stringify(v));
  },
};

// activeLang: ngôn ngữ đang học ("" hoặc null = tất cả)
// provider: nhà cung cấp AI đang dùng; ai: cấu hình riêng từng nhà cung cấp { apiKey, model, baseUrl, format }
const DEFAULT_SETTINGS = { provider: "openai", ai: {}, meaningLang: "vi", dailyGoal: 10, lastLang: "en", activeLang: "" };

const state = {
  words: [],
  activity: {}, // { "YYYY-MM-DD": số lượt ôn }
  settings: { ...DEFAULT_SETTINGS },
  view: "add",
  cal: { mode: "month", date: Date.now() },
  search: { q: "", lang: "", type: "", level: "", sort: "rel" },
};
async function saveWords() {
  await store.set({ words: state.words, activity: state.activity });
  updateSide();
}
async function saveSettings() {
  await store.set({ settings: state.settings });
}

const byId = (id) => state.words.find((w) => w.id === id);

// Phiên học theo ngôn ngữ: các view chỉ thấy từ của ngôn ngữ đang chọn
const activeLang = () => state.settings.activeLang || "";
const scoped = () => {
  const l = activeLang();
  return l ? state.words.filter((w) => w.lang === l) : state.words;
};

/* =========================================================
   Lặp lại ngắt quãng (SM-2 rút gọn)
   q: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ
   ========================================================= */
const newSrs = () => ({ due: startOfDay(), interval: 0, ease: 2.5, reps: 0, lapses: 0, last: 0 });

function schedule(srs, q) {
  const s = { ...newSrs(), ...srs };
  if (q === 0) {
    s.reps = 0;
    s.lapses++;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = Date.now() + 10 * 60000;
  } else {
    if (q === 1) {
      s.interval = s.reps === 0 ? 1 : Math.max(1, Math.round(s.interval * 1.2));
      s.ease = Math.max(1.3, s.ease - 0.15);
    } else if (q === 2) {
      s.interval = s.reps === 0 ? 2 : s.reps === 1 ? 4 : Math.round(Math.max(1, s.interval) * s.ease);
    } else {
      s.interval = s.reps === 0 ? 4 : Math.round(Math.max(1, s.interval) * s.ease * 1.3);
      s.ease += 0.15;
    }
    s.reps++;
    s.due = addDays(startOfDay(), s.interval);
  }
  s.last = Date.now();
  return s;
}
const isDue = (w) => (w.srs?.due ?? 0) <= Date.now();
const LEVELS = {
  new: "Mới",
  learning: "Đang học",
  review: "Đang nhớ",
  mastered: "Đã thuộc",
};
function level(w) {
  const s = w.srs;
  if (!s || !s.reps) return "new";
  if (s.interval < 7) return "learning";
  if (s.interval < 21) return "review";
  return "mastered";
}
const lvBadge = (w) => { const l = level(w); return `<span class="lv lv-${l}">${LEVELS[l]}</span>`; };

/* =========================================================
   Thống kê
   ========================================================= */
function dayIndex() {
  const m = new Map();
  for (const w of scoped()) {
    const k = dayKey(w.createdAt);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(w);
  }
  for (const list of m.values()) list.sort((a, b) => a.createdAt - b.createdAt);
  return m;
}
const heatLvl = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4);

function computeStats(idx = dayIndex()) {
  const todayN = (idx.get(dayKey(Date.now())) || []).length;
  const active = (t) => idx.has(dayKey(t)) || (state.activity[dayKey(t)] || 0) > 0;
  let streak = 0;
  let t = startOfDay();
  if (!active(t)) t = addDays(t, -1); // chưa học hôm nay thì vẫn giữ chuỗi tới hôm qua
  while (active(t)) { streak++; t = addDays(t, -1); }
  const ws = scoped();
  return {
    total: ws.length,
    todayN,
    streak,
    due: ws.filter(isDue).length,
    mastered: ws.filter((w) => level(w) === "mastered").length,
    reviewedToday: state.activity[dayKey(Date.now())] || 0,
  };
}

function updateSide() {
  const due = scoped().filter(isDue).length;
  const b = $("#dueBadge");
  b.hidden = !due;
  b.textContent = due > 99 ? "99+" : due;
}

/* =========================================================
   UI chung: toast, modal, phát âm
   ========================================================= */
let toastTimer;
function toast(html, err = false) {
  const t = $("#toast");
  t.innerHTML = html;
  t.classList.toggle("err", err);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), err ? 5000 : 2600);
}

function openModal(html) {
  $("#modalBody").innerHTML = html;
  hydrateIcons($("#modalBody"));
  $("#modal").hidden = false;
}
function closeModal() {
  $("#modal").hidden = true;
  $("#modalBody").innerHTML = "";
}
const modalOpen = () => !$("#modal").hidden;

function speak(text, lang) {
  if (!text) return;
  if (!("speechSynthesis" in window)) return toast("Trình duyệt không hỗ trợ phát âm", true);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const tts = langOf(lang).tts;
  u.lang = tts;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(tts.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
const speakBtn = (w) => `<button class="icon-btn" data-speak-id="${w.id}" title="Phát âm">${icon("speaker")}</button>`;

/* =========================================================
   Form thêm / sửa từ
   ========================================================= */
function mountForm(container, word, { onSave, onCancel }) {
  const frag = $("#tplForm").content.cloneNode(true);
  const form = frag.querySelector("form");
  hydrateIcons(form);
  const F = (n) => form.elements.namedItem(n);

  F("lang").innerHTML = langOptions(word?.lang || state.settings.lastLang || "en");
  if (word) {
    F("word").value = word.word || "";
    F("type").value = word.type || "";
    F("ipa").value = word.ipa || "";
    F("meaning").value = word.meaning || "";
    F("examples").value = (word.examples || []).join("\n");
    F("link").value = word.link || "";
    F("tags").value = (word.tags || []).join(", ");
    F("notes").value = word.notes || "";
    form.querySelector('[type="submit"]').textContent = "Lưu thay đổi";
  } else {
    form.querySelector('[data-act="cancel"]').textContent = "Xoá form";
  }

  const dup = form.querySelector(".dup-warn");
  const checkDup = () => {
    const nw = norm(F("word").value);
    const found = nw && state.words.find((w) => w.id !== word?.id && w.lang === F("lang").value && norm(w.word) === nw);
    dup.hidden = !found;
    if (found)
      dup.innerHTML = `Từ này đã có trong sổ (thêm ngày ${fmtDate(found.createdAt)}). <button type="button" data-open="${found.id}">Xem</button>`;
  };
  F("word").addEventListener("input", debounce(checkDup, 200));
  F("lang").addEventListener("change", checkDup);

  const aiBtn = form.querySelector('[data-act="ai"]');
  aiBtn.addEventListener("click", () => aiFill(form, aiBtn).then(checkDup));

  form.querySelector('[data-act="cancel"]').addEventListener("click", () => onCancel?.(form));
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
    else if (e.key === "Enter" && e.altKey) { e.preventDefault(); aiBtn.click(); }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      lang: F("lang").value,
      word: F("word").value.trim(),
      type: F("type").value.trim(),
      ipa: F("ipa").value.trim(),
      meaning: F("meaning").value.trim(),
      examples: F("examples").value.split("\n").map((s) => s.trim()).filter(Boolean),
      link: F("link").value.trim(),
      tags: F("tags").value.split(",").map((s) => s.trim()).filter(Boolean),
      notes: F("notes").value.trim(),
    };
    if (!data.word) { F("word").focus(); return toast("Bạn chưa nhập từ vựng", true); }
    if (data.link && !/^https?:\/\//i.test(data.link)) data.link = "https://" + data.link;
    onSave(data, form);
  });

  container.replaceChildren(form);
  return form;
}

function resetForm(form) {
  for (const n of ["word", "type", "ipa", "meaning", "examples", "link", "tags", "notes"]) form.elements.namedItem(n).value = "";
  form.querySelector(".dup-warn").hidden = true;
  form.elements.namedItem("word").focus();
}

function addWord(data) {
  const now = Date.now();
  const w = { id: uid(), ...data, createdAt: now, updatedAt: now, srs: newSrs() };
  state.words.push(w);
  state.settings.lastLang = data.lang;
  saveSettings();
  saveWords();
  return w;
}

/* =========================================================
   AI tự điền – nhiều nhà cung cấp
   format "openai": POST {baseUrl}/chat/completions (OpenAI và các API tương thích)
   format "anthropic": POST {baseUrl}/messages (Claude)
   ========================================================= */
const PROVIDERS = {
  openai: { name: "OpenAI (ChatGPT)", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o", "gpt-5-mini"], keyUrl: "https://platform.openai.com/api-keys" },
  anthropic: { name: "Anthropic (Claude)", format: "anthropic", baseUrl: "https://api.anthropic.com/v1", models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"], keyUrl: "https://console.anthropic.com/settings/keys" },
  gemini: { name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", models: ["gemini-2.5-flash", "gemini-2.5-pro"], keyUrl: "https://aistudio.google.com/apikey" },
  openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", models: ["openai/gpt-4o-mini", "anthropic/claude-haiku-5-5", "google/gemini-2.5-flash", "deepseek/deepseek-chat"], keyUrl: "https://openrouter.ai/keys", hint: "Một key dùng được hàng trăm model — xem tên model tại openrouter.ai/models." },
  groq: { name: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"], keyUrl: "https://console.groq.com/keys" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat"], keyUrl: "https://platform.deepseek.com/api_keys" },
  mistral: { name: "Mistral", baseUrl: "https://api.mistral.ai/v1", models: ["mistral-small-latest", "mistral-large-latest"], keyUrl: "https://console.mistral.ai/api-keys" },
  xai: { name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", models: ["grok-3-mini", "grok-3"], keyUrl: "https://console.x.ai" },
  ollama: { name: "Ollama (chạy trên máy)", baseUrl: "http://localhost:11434/v1", noKey: true, models: ["llama3.2", "qwen2.5", "gemma3"], hint: "Không cần key. Chạy Ollama với OLLAMA_ORIGINS=chrome-extension://* để extension gọi được." },
  custom: { name: "Tuỳ chỉnh (API khác)", baseUrl: "", custom: true, models: [], hint: "Nhập Base URL của API tương thích OpenAI (LM Studio, vLLM, Together, Azure…), thường kết thúc bằng /v1." },
};

// Cấu hình đang dùng = mặc định của nhà cung cấp + những gì người dùng đã sửa
function aiConfig() {
  const id = PROVIDERS[state.settings.provider] ? state.settings.provider : "openai";
  const p = PROVIDERS[id];
  const c = state.settings.ai?.[id] || {};
  return {
    id,
    ...p,
    apiKey: c.apiKey || "",
    model: c.model || p.models[0] || "",
    baseUrl: (c.baseUrl || p.baseUrl).trim().replace(/\/+$/, ""),
    format: p.custom ? c.format || "openai" : p.format || "openai",
  };
}

const RELOAD_HINT = "nếu vừa cập nhật extension, vào chrome://extensions bấm Reload LearnVocab";

// Host lạ (Tuỳ chỉnh, Ollama…) cần xin quyền; phải gọi ngay trong lúc bấm nút (user gesture)
function requestHostAccess(url) {
  let u;
  try { u = new URL(url); } catch { return Promise.reject(new Error("Base URL không hợp lệ")); }
  if (!/^https?:$/.test(u.protocol)) return Promise.reject(new Error("Base URL phải bắt đầu bằng http:// hoặc https://"));
  if (!hasChrome || !chrome.permissions) return Promise.resolve(true);
  // Match pattern của Chrome không ghi cổng: http://localhost/* áp dụng cho mọi cổng
  let req;
  try {
    req = chrome.permissions.request({ origins: [`${u.protocol}//${u.hostname}/*`] });
  } catch (e) {
    req = Promise.reject(e);
  }
  return req.catch((e) => { throw new Error(`Chrome không cho truy cập ${u.host} — ${RELOAD_HINT} (${e.message})`); });
}

async function postJSON(url, headers, body) {
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch {
    // fetch chỉ ném lỗi khi không tới được server (sai địa chỉ, mất mạng, bị chặn CORS/quyền)
    throw new Error(`Không kết nối được tới ${new URL(url).host}. Kiểm tra Base URL và mạng; ${RELOAD_HINT}.`);
  }
  let j = null;
  try { j = await res.json(); } catch {}
  if (!res.ok) {
    const e0 = Array.isArray(j) ? j[0] : j; // Gemini đôi khi trả mảng lỗi
    const msg = e0?.error?.message || (typeof e0?.error === "string" && e0.error) || e0?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return j;
}

async function callOpenAICompat(cfg, system, prompt) {
  const url = cfg.baseUrl + "/chat/completions";
  const headers = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};
  const body = { model: cfg.model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] };
  let j;
  try {
    j = await postJSON(url, headers, { ...body, response_format: { type: "json_object" } });
  } catch (e) {
    if (e.status !== 400 && e.status !== 422) throw e;
    j = await postJSON(url, headers, body); // API không hỗ trợ response_format → thử lại không có nó
  }
  return j?.choices?.[0]?.message?.content || "";
}

async function callAnthropic(cfg, system, prompt) {
  const j = await postJSON(
    cfg.baseUrl + "/messages",
    { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    { model: cfg.model, max_tokens: 16000, system, messages: [{ role: "user", content: prompt }] }
  );
  if (j?.stop_reason === "refusal") throw new Error("Model từ chối trả lời yêu cầu này");
  return (j?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// Lấy object JSON từ câu trả lời (có thể bọc trong ```json … ``` hoặc kèm chữ)
function parseJSON(text) {
  const t = String(text || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch {}
  }
  throw new Error("AI không trả về JSON hợp lệ — thử model khác");
}

function aiConfigError(cfg) {
  if (!cfg.baseUrl) return "Chưa nhập Base URL";
  if (!cfg.model) return "Chưa nhập tên model";
  if (!cfg.apiKey && !cfg.noKey && !cfg.custom) return `Chưa có API key cho ${cfg.name}`;
  return "";
}

async function askAI(word, langHint) {
  const cfg = aiConfig();
  const mean = langOf(state.settings.meaningLang).eng;
  const system = "You are a precise bilingual lexicographer helping a language learner. Reply with a single JSON object only, no markdown.";
  const prompt = `Word or phrase: "${word}"
Language hint: ${langOf(langHint).eng} (if this is wrong, detect the real language)
Write meanings, notes and translations in ${mean}.
Return a JSON object with exactly these keys:
- "lang": ISO 639-1 code of the word's language
- "ipa": pronunciation (IPA for alphabetic languages, pinyin with tone marks for Chinese, kana reading + romaji for Japanese, revised romanization for Korean)
- "type": part of speech in short English (noun, verb, adjective, adverb, phrase, phrasal verb, idiom, ...)
- "meaning": concise meaning(s) in ${mean}; separate different senses with "; "
- "examples": array of 2 short, natural example sentences in the word's language, each followed by " — " and its ${mean} translation
- "notes": one short usage note (collocations, register, synonyms) in ${mean}, or ""
- "tags": array of 1-2 short topic tags in ${mean}`;
  let text;
  try {
    text = cfg.format === "anthropic" ? await callAnthropic(cfg, system, prompt) : await callOpenAICompat(cfg, system, prompt);
  } catch (e) {
    if (cfg.id === "ollama") e.message += ` — ${cfg.hint}`;
    throw e;
  }
  return parseJSON(text);
}

async function aiFill(form, btn) {
  const F = (n) => form.elements.namedItem(n);
  const word = F("word").value.trim();
  if (!word) { F("word").focus(); return toast("Nhập từ trước rồi bấm Tự điền AI", true); }
  const cfg = aiConfig();
  const bad = aiConfigError(cfg);
  if (bad) return toast(`${esc(bad)} — <a href="#settings">mở Cài đặt</a>`, true);
  if (btn.classList.contains("loading")) return;
  const access = requestHostAccess(cfg.baseUrl);
  btn.classList.add("loading");
  btn.querySelector("span").textContent = "Đang lấy…";
  try {
    if (!(await access)) throw new Error(`chưa cấp quyền truy cập ${new URL(cfg.baseUrl).host}`);
    const r = await askAI(word, F("lang").value);
    let note = "";
    if (r.lang && r.lang !== F("lang").value && LANGS.some((l) => l.code === r.lang)) {
      if (F("lang").closest(".f").hidden) note = ` — AI nhận diện đây là ${esc(langOf(r.lang).name)}`;
      else F("lang").value = r.lang;
    }
    // Chỉ điền vào ô còn trống, không ghi đè những gì người dùng đã gõ
    const fill = (n, v) => { if (v && !F(n).value.trim()) F(n).value = v; };
    fill("ipa", r.ipa);
    fill("type", r.type);
    fill("meaning", r.meaning);
    fill("examples", Array.isArray(r.examples) ? r.examples.join("\n") : r.examples);
    fill("notes", r.notes);
    fill("tags", Array.isArray(r.tags) ? r.tags.join(", ") : r.tags);
    toast("Đã điền các ô còn trống" + note);
  } catch (e) {
    toast("Không lấy được dữ liệu: " + esc(e.message), true);
  } finally {
    btn.classList.remove("loading");
    btn.querySelector("span").textContent = "Tự điền AI";
  }
}

/* =========================================================
   Chi tiết từ (modal)
   ========================================================= */
function openWord(id) {
  const w = byId(id);
  if (!w) return;
  const L = langOf(w.lang);
  const ex = (w.examples || [])
    .map((e, i) => `<li><button class="icon-btn" data-speak-ex="${i}" title="Đọc câu">${icon("speaker")}</button><span>${esc(e)}</span></li>`)
    .join("");
  const s = w.srs || newSrs();
  openModal(`
    <div class="detail-top">${langPill(w.lang)}<span class="muted">${esc(L.name)}</span>${w.type ? `<span class="badge">${esc(w.type)}</span>` : ""}${lvBadge(w)}</div>
    <div class="detail-word"><h2 lang="${esc(w.lang)}">${esc(w.word)}</h2>${speakBtn(w)}</div>
    ${w.ipa ? `<div class="ipa">${esc(w.ipa)}</div>` : ""}
    <div class="detail-sec"><h4>Nghĩa</h4><div class="detail-mean">${esc(w.meaning) || '<span class="muted">(chưa có)</span>'}</div></div>
    ${ex ? `<div class="detail-sec"><h4>Ví dụ</h4><ul class="ex-list">${ex}</ul></div>` : ""}
    ${w.notes ? `<div class="detail-sec"><h4>Ghi chú</h4><div class="notes">${esc(w.notes)}</div></div>` : ""}
    ${w.link && /^https?:\/\//i.test(w.link) ? `<div class="detail-sec"><h4>Link</h4><a class="word-link" href="${esc(w.link)}" target="_blank" rel="noopener noreferrer">${esc(w.link)}</a></div>` : ""}
    ${w.tags?.length ? `<div class="detail-sec"><h4>Tags</h4><div class="tags">${w.tags.map((t) => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div></div>` : ""}
    <div class="detail-meta">
      <div><span class="muted">Ngày thêm</span><b>${fmtDate(w.createdAt)}</b></div>
      <div><span class="muted">Ôn tiếp</span><b>${fmtDue(s.due)}</b></div>
      <div><span class="muted">Đã ôn / quên</span><b>${s.reps} / ${s.lapses}</b></div>
    </div>
    <div class="detail-actions">
      <button class="btn danger" data-act="del"><i data-icon="trash"></i>Xoá</button>
      <span class="spacer"></span>
      <button class="btn" data-act="reset" title="Đưa về trạng thái từ mới"><i data-icon="refresh"></i>Học lại</button>
      <button class="btn primary" data-act="edit"><i data-icon="edit"></i>Sửa</button>
    </div>`);

  const box = $("#modalBody");
  box.querySelectorAll("[data-speak-ex]").forEach((b) =>
    b.addEventListener("click", () => speak(w.examples[+b.dataset.speakEx].split(/\s+[—–-]\s+/)[0], w.lang))
  );
  box.querySelectorAll("[data-tag]").forEach((b) =>
    b.addEventListener("click", () => {
      closeModal();
      state.search = { ...state.search, q: b.dataset.tag, lang: "", type: "", level: "" };
      $("#q").value = b.dataset.tag;
      location.hash = "#search";
      renderSearch();
    })
  );
  box.querySelector('[data-act="del"]').addEventListener("click", () => {
    if (!confirm(`Xoá từ “${w.word}”?`)) return;
    state.words = state.words.filter((x) => x.id !== w.id);
    saveWords();
    closeModal();
    render();
    toast(`Đã xoá “${esc(w.word)}”`);
  });
  box.querySelector('[data-act="reset"]').addEventListener("click", () => {
    w.srs = newSrs();
    saveWords();
    openWord(w.id);
    render();
    toast("Đã đưa về trạng thái từ mới");
  });
  box.querySelector('[data-act="edit"]').addEventListener("click", () => editWord(w.id));
}

function editWord(id) {
  const w = byId(id);
  openModal(`<h2 style="margin-bottom:16px">Sửa từ</h2><div id="editBox"></div>`);
  const form = mountForm($("#editBox"), w, {
    onSave(data) {
      Object.assign(w, data, { updatedAt: Date.now() });
      saveWords();
      openWord(id);
      render();
      toast("Đã lưu thay đổi");
    },
    onCancel: () => openWord(id),
  });
  form.elements.namedItem("word").focus();
}

/* =========================================================
   VIEW: Thêm từ
   ========================================================= */
let addForm;
function setupAdd() {
  addForm = mountForm($("#addFormBox"), null, {
    onSave(data, form) {
      const w = addWord(data);
      resetForm(form);
      renderAdd();
      toast(`Đã lưu “${esc(w.word)}”`);
    },
    onCancel: resetForm,
  });
  $("#heatmap").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (b) gotoDay(+b.dataset.day);
  });
}

function renderAdd() {
  const idx = dayIndex();
  const s = computeStats(idx);
  const goal = state.settings.dailyGoal || 10;
  const now = new Date();
  $("#addSub").textContent = `${WD_FULL[now.getDay()]}, ${fmtDate(now)} · ${s.todayN >= goal ? "Đã đạt mục tiêu hôm nay" : `Còn ${goal - s.todayN} từ nữa để đạt mục tiêu`}`;

  $("#stats").innerHTML = `
    <div class="stat"><span class="stat-n">${s.total}</span><span class="stat-l">Tổng số từ</span></div>
    <div class="stat"><span class="stat-n">${s.todayN}<small>/${goal}</small></span><span class="stat-l">Hôm nay</span>
      <div class="bar"><span style="width:${Math.min(100, (s.todayN / goal) * 100)}%"></span></div></div>
    <div class="stat"><span class="stat-n">${s.streak}</span><span class="stat-l">Ngày học liên tiếp</span></div>
    <a class="stat" href="#review"><span class="stat-n">${s.due}</span><span class="stat-l">Cần ôn → </span></a>`;

  // heatmap 20 tuần: mỗi cột là một tuần (T2 → CN)
  const weeks = 20;
  const today = startOfDay();
  const start = addDays(startOfWeek(), -7 * (weeks - 1));
  let hm = "";
  for (let i = 0; i < weeks * 7; i++) {
    const t = addDays(start, i);
    if (t > today) { hm += '<span class="hm empty"></span>'; continue; }
    const k = dayKey(t);
    const n = (idx.get(k) || []).length;
    const r = state.activity[k] || 0;
    hm += `<button class="hm l${heatLvl(n)}${t === today ? " today" : ""}" data-day="${t}" title="${WD[new Date(t).getDay()]} ${fmtDate(t)}: ${n} từ mới · ${r} lượt ôn"></button>`;
  }
  $("#heatmap").innerHTML = hm;

  const list = (idx.get(dayKey(Date.now())) || []).slice().reverse();
  $("#todayCount").textContent = list.length ? `${list.length} từ` : "";
  $("#todayList").innerHTML = list.length
    ? list.map((w) => `<button class="mini" data-open="${w.id}">${langPill(w.lang)}<b>${esc(w.word)}</b><span class="m-mean">${esc(w.meaning)}</span></button>`).join("")
    : `<div class="empty-state">Chưa có từ nào hôm nay.</div>`;
}

/* =========================================================
   VIEW: Lịch
   ========================================================= */
function gotoDay(t) {
  state.cal = { mode: "day", date: t };
  if (location.hash !== "#calendar") location.hash = "#calendar";
  else renderCalendar();
}

let calRange = []; // các từ trong khoảng đang xem (cho nút "Ôn các từ này")
function setupCalendar() {
  $("#calMode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    state.cal.mode = b.dataset.mode;
    renderCalendar();
  });
  const step = (dir) => {
    const c = state.cal;
    const d = new Date(c.date);
    if (c.mode === "month") { d.setDate(1); d.setMonth(d.getMonth() + dir); c.date = d.getTime(); }
    else c.date = addDays(c.date, c.mode === "week" ? 7 * dir : dir);
    renderCalendar();
  };
  $("#calPrev").addEventListener("click", () => step(-1));
  $("#calNext").addEventListener("click", () => step(1));
  $("#calToday").addEventListener("click", () => { state.cal.date = Date.now(); renderCalendar(); });
  $("#calBody").addEventListener("click", (e) => {
    const d = e.target.closest("[data-day]");
    if (d && !e.target.closest("[data-open]")) gotoDay(+d.dataset.day);
  });
  $("#calReview").addEventListener("click", () => {
    rv.preset = { label: $("#calLabel").textContent, ids: calRange.map((w) => w.id) };
    rv.source = "preset";
    rv.screen = "setup";
    location.hash = "#review";
  });
}

function renderCalendar() {
  const c = state.cal;
  const idx = dayIndex();
  const today = startOfDay();
  $$("#calMode button").forEach((b) => b.classList.toggle("on", b.dataset.mode === c.mode));
  const body = $("#calBody");
  let label = "";

  if (c.mode === "month") {
    const d = new Date(c.date);
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1).getTime();
    const next = new Date(y, m + 1, 1).getTime();
    const gStart = startOfWeek(first);
    const cells = Math.ceil((Math.round((next - gStart) / 86400000)) / 7) * 7;
    label = `Tháng ${m + 1}, ${y}`;
    calRange = scoped().filter((w) => w.createdAt >= first && w.createdAt < next);
    let html = '<div class="month"><div class="month-head">' + ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => `<div>${x}</div>`).join("") + '</div><div class="month-grid">';
    for (let i = 0; i < cells; i++) {
      const t = addDays(gStart, i);
      const list = idx.get(dayKey(t)) || [];
      const n = list.length;
      const cls = ["mcell", `l${heatLvl(n)}`, new Date(t).getMonth() !== m ? "out" : "", t === today ? "today" : ""].join(" ");
      html += `<button class="${cls}" data-day="${t}" title="${fmtDate(t)}${n ? `: ${n} từ` : ""}">
        <span class="dtop"><span class="dnum">${new Date(t).getDate()}</span>${n ? `<span class="dcount">${n}</span>` : ""}</span>
        <span class="chips">${list.slice(0, 3).map((w) => `<span class="chip">${esc(w.word)}</span>`).join("")}${n > 3 ? `<span class="more">+${n - 3} từ</span>` : ""}</span>
      </button>`;
    }
    body.innerHTML = html + "</div></div>";
  } else if (c.mode === "week") {
    const ws = startOfWeek(c.date);
    const we = addDays(ws, 7);
    label = `Tuần ${fmtDate(ws).slice(0, 5)} – ${fmtDate(addDays(ws, 6))}`;
    calRange = scoped().filter((w) => w.createdAt >= ws && w.createdAt < we);
    let html = '<div class="week">';
    for (let i = 0; i < 7; i++) {
      const t = addDays(ws, i);
      const list = idx.get(dayKey(t)) || [];
      html += `<div class="wcol${t === today ? " today" : ""}">
        <button class="wcol-head" data-day="${t}"><b>${WD_FULL[new Date(t).getDay()]}</b><span class="muted">${fmtDate(t).slice(0, 5)} · ${list.length}</span></button>
        <div class="wcol-list">${list.map((w) => `<button class="wchip" data-open="${w.id}"><b>${esc(w.word)}</b><span>${esc(w.meaning)}</span></button>`).join("") || '<span class="muted" style="font-size:12px;padding:4px">—</span>'}</div>
      </div>`;
    }
    body.innerHTML = html + "</div>";
  } else {
    const t = startOfDay(c.date);
    label = `${WD_FULL[new Date(t).getDay()]}, ${fmtDate(t)}`;
    calRange = (idx.get(dayKey(t)) || []).slice();
    const reviewed = state.activity[dayKey(t)] || 0;
    body.innerHTML = calRange.length
      ? `<div class="day-list">${calRange.map(wordCard).join("")}</div>`
      : `<div class="card empty-state">Không có từ mới nào trong ngày này${reviewed ? ` (đã ôn ${reviewed} lượt)` : ""}.${t === today ? '<br><a class="btn primary" href="#add">Thêm từ</a>' : ""}</div>`;
  }

  $("#calLabel").textContent = label;
  $("#calSummary").textContent = calRange.length ? `${calRange.length} từ mới` : "";
  $("#calReview").hidden = !calRange.length;
}

function wordCard(w) {
  const ex = (w.examples || []).slice(0, 2).map((e) => `<li>${esc(e)}</li>`).join("");
  return `<article class="wcard" data-open="${w.id}">
    <div class="wc-head">${langPill(w.lang)}<b class="wc-word">${esc(w.word)}</b>${w.ipa ? `<span class="ipa">${esc(w.ipa)}</span>` : ""}${w.type ? `<span class="badge">${esc(w.type)}</span>` : ""}<span class="spacer"></span>${lvBadge(w)}${speakBtn(w)}</div>
    <div class="wc-mean">${esc(w.meaning)}</div>
    ${ex ? `<ul class="wc-ex">${ex}</ul>` : ""}
  </article>`;
}

/* =========================================================
   VIEW: Tìm kiếm
   ========================================================= */
function setupSearch() {
  const q = $("#q");
  q.addEventListener("input", debounce(() => { state.search.q = q.value; renderResults(); }, 120));
  for (const [id, key] of [["#fLang", "lang"], ["#fType", "type"], ["#fLevel", "level"], ["#fSort", "sort"]])
    $(id).addEventListener("change", (e) => { state.search[key] = e.target.value; renderResults(); });
}

function renderSearch() {
  const s = state.search;
  const langs = [...new Set(scoped().map((w) => w.lang))];
  const types = [...new Set(scoped().map((w) => w.type).filter(Boolean))].sort();
  $("#fLang").hidden = !!activeLang();
  $("#fLang").innerHTML = `<option value="">Mọi ngôn ngữ</option>` + langs.map((c) => `<option value="${esc(c)}">${esc(langOf(c).name)}</option>`).join("");
  $("#fType").innerHTML = `<option value="">Mọi loại từ</option>` + types.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  $("#fLevel").innerHTML = `<option value="">Mọi mức độ</option>` + Object.entries(LEVELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  $("#fLang").value = s.lang;
  $("#fType").value = s.type;
  $("#fLevel").value = s.level;
  $("#fSort").value = s.sort;
  if ($("#q").value !== s.q) $("#q").value = s.q;
  renderResults();
}

function hl(text, q) {
  text = String(text ?? "");
  if (!q) return esc(text);
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let out = "";
  let i = 0;
  let j;
  while ((j = lower.indexOf(ql, i)) !== -1) {
    out += esc(text.slice(i, j)) + "<mark>" + esc(text.slice(j, j + q.length)) + "</mark>";
    i = j + q.length;
  }
  return out + esc(text.slice(i));
}

function searchWords() {
  const { q, lang, type, level: lv, sort } = state.search;
  const nq = norm(q);
  let r = scoped().filter((w) => (!lang || w.lang === lang) && (!type || w.type === type) && (!lv || level(w) === lv));
  const score = new Map();
  if (nq) {
    r = r.filter((w) => {
      const nw = norm(w.word);
      let sc = nw === nq ? 0 : nw.startsWith(nq) ? 1 : nw.includes(nq) ? 2 : -1;
      if (sc < 0) {
        const rest = norm([w.meaning, w.ipa, (w.tags || []).join(" "), (w.examples || []).join(" "), w.notes].join(" "));
        if (!rest.includes(nq)) return false;
        sc = norm(w.meaning).includes(nq) || (w.tags || []).some((t) => norm(t) === nq) ? 3 : 4;
      }
      score.set(w.id, sc);
      return true;
    });
  }
  const by = {
    rel: (a, b) => (score.get(a.id) ?? 0) - (score.get(b.id) ?? 0) || b.createdAt - a.createdAt,
    new: (a, b) => b.createdAt - a.createdAt,
    old: (a, b) => a.createdAt - b.createdAt,
    az: (a, b) => a.word.localeCompare(b.word),
    due: (a, b) => (a.srs?.due ?? 0) - (b.srs?.due ?? 0),
  };
  return r.sort(by[sort] || by.rel);
}

function renderResults() {
  const r = searchWords();
  const q = state.search.q.trim();
  const MAX = 300;
  $("#resultCount").textContent = scoped().length
    ? `${r.length} kết quả${r.length > MAX ? ` (hiển thị ${MAX} đầu tiên)` : ""}`
    : "";
  if (!scoped().length) {
    $("#results").innerHTML = "";
    $("#resultCount").innerHTML = `<div class="card empty-state">Chưa có từ ${activeLang() ? esc(langOf(activeLang()).name) + " " : ""}nào trong sổ. <br><a class="btn primary" href="#add">Thêm từ đầu tiên</a></div>`;
    return;
  }
  $("#results").innerHTML = r
    .slice(0, MAX)
    .map(
      (w) => `<button class="res-row" data-open="${w.id}">
        ${langPill(w.lang)}
        <div><div class="res-word"><b>${hl(w.word, q)}</b>${w.ipa ? `<span class="ipa">${esc(w.ipa)}</span>` : ""}${w.type ? `<span class="badge">${esc(w.type)}</span>` : ""}</div>
        <div class="res-mean">${hl(w.meaning, q)}</div></div>
        <div class="res-meta">${lvBadge(w)}<span class="muted">${fmtDate(w.createdAt)}</span></div>
      </button>`
    )
    .join("");
}

/* =========================================================
   VIEW: Ôn tập flashcard
   ========================================================= */
const rv = {
  screen: "setup", // setup | session | summary
  source: "due",
  lang: "",
  dir: "front", // front: Từ → Nghĩa, back: Nghĩa → Từ, mixed
  typing: false,
  limit: 20,
  preset: null, // { label, ids } – từ lịch hoặc "ôn lại từ quên"
  queue: [],
  i: 0,
  flipped: false,
  res: [0, 0, 0, 0],
  forgot: new Set(),
};
const RATES = [["Quên", "again"], ["Khó", "hard"], ["Nhớ", "good"], ["Dễ", "easy"]];
const SOURCES = [
  ["due", "Đến hạn ôn", "Theo lịch lặp lại"],
  ["today", "Từ hôm nay", "Thêm trong hôm nay"],
  ["week", "Từ tuần này", "Từ thứ Hai tới nay"],
  ["hard", "Hay quên", "Từng bấm “Quên”"],
  ["all", "Tất cả", "Xáo trộn ngẫu nhiên"],
];

function reviewPool(src) {
  let ws = scoped();
  if (rv.lang) ws = ws.filter((w) => w.lang === rv.lang);
  switch (src) {
    case "due": return ws.filter(isDue).sort((a, b) => a.srs.due - b.srs.due);
    case "today": return ws.filter((w) => w.createdAt >= startOfDay());
    case "week": return ws.filter((w) => w.createdAt >= startOfWeek());
    case "hard": return ws.filter((w) => w.srs?.lapses > 0).sort((a, b) => b.srs.lapses - a.srs.lapses);
    case "preset": { const ids = new Set(rv.preset?.ids || []); return ws.filter((w) => ids.has(w.id)); }
    default: return ws.slice();
  }
}

function setupReview() {
  const box = $("#reviewBody");
  box.addEventListener("click", (e) => {
    const t = e.target;
    const src = t.closest("[data-src]");
    if (src) { rv.source = src.dataset.src; return renderReview(); }
    if (t.closest("#rvStart")) return startSession(reviewPool(rv.source));
    if (t.closest("#rvQuit")) return finishSession();
    if (t.closest("#rvFlip")) return flip();
    if (t.closest("#rvSetup")) { rv.screen = "setup"; return renderReview(); }
    if (t.closest("#rvRetry")) {
      rv.preset = { label: "Từ vừa quên", ids: [...rv.forgot] };
      rv.source = "preset";
      return startSession(reviewPool("preset"), 0);
    }
    const rate = t.closest("[data-rate]");
    if (rate) return rateCard(+rate.dataset.rate);
    if (t.closest("[data-speak-card]")) { const w = currentWord(); return w && speak(w.word, w.lang); }
    if (t.closest("#flash") && !t.closest("input,button,a")) return flip();
  });
  box.addEventListener("change", (e) => {
    const id = e.target.id;
    if (id === "rvLang") rv.lang = e.target.value;
    else if (id === "rvDir") rv.dir = e.target.value;
    else if (id === "rvLimit") rv.limit = +e.target.value;
    else if (id === "rvTyping") rv.typing = e.target.checked;
    else return;
    renderReview();
  });
}

function renderReview() {
  const box = $("#reviewBody");
  if (rv.screen === "session") return renderCard(box);
  if (rv.screen === "summary") return renderSummary(box);

  if (!scoped().length) {
    box.innerHTML = `<div class="card empty-state">Chưa có từ nào để ôn.<br><a class="btn primary" href="#add">Thêm từ</a></div>`;
    return;
  }
  const sources = rv.preset ? [["preset", rv.preset.label, "Bộ thẻ đã chọn"], ...SOURCES] : SOURCES;
  if (rv.source === "preset" && !rv.preset) rv.source = "due";
  const langs = [...new Set(scoped().map((w) => w.lang))];
  const n = reviewPool(rv.source).length;
  const take = rv.limit ? Math.min(rv.limit, n) : n;
  box.innerHTML = `
    <div class="card rv-setup">
      <div><h3 style="margin-bottom:10px">Chọn bộ thẻ</h3>
      <div class="src-grid">${sources
        .map(([k, l, d]) => {
          const c = reviewPool(k).length;
          return `<button class="src${rv.source === k ? " on" : ""}" data-src="${k}"><b>${c}</b><span>${esc(l)}</span><small>${esc(d)}</small></button>`;
        })
        .join("")}</div></div>
      <div class="rv-opts">
        ${activeLang() ? "" : `<label class="f">Ngôn ngữ<select id="rvLang"><option value="">Tất cả</option>${langs.map((c) => `<option value="${esc(c)}"${c === rv.lang ? " selected" : ""}>${esc(langOf(c).name)}</option>`).join("")}</select></label>`}
        <label class="f">Chiều thẻ<select id="rvDir">
          <option value="front"${rv.dir === "front" ? " selected" : ""}>Từ → Nghĩa</option>
          <option value="back"${rv.dir === "back" ? " selected" : ""}>Nghĩa → Từ</option>
          <option value="mixed"${rv.dir === "mixed" ? " selected" : ""}>Trộn ngẫu nhiên</option></select></label>
        <label class="f">Số thẻ tối đa<select id="rvLimit">${[10, 20, 50, 0].map((v) => `<option value="${v}"${v === rv.limit ? " selected" : ""}>${v || "Không giới hạn"}</option>`).join("")}</select></label>
        <label class="check"><input type="checkbox" id="rvTyping"${rv.typing ? " checked" : ""}> Gõ đáp án trước khi lật thẻ</label>
      </div>
      <div><button class="btn primary big" id="rvStart"${take ? "" : " disabled"}><i data-icon="cards"></i>Bắt đầu ôn ${take} thẻ</button></div>
    </div>
    <div class="rv-help muted">Phím tắt: <kbd>Space</kbd> lật thẻ · <kbd>1</kbd> Quên <kbd>2</kbd> Khó <kbd>3</kbd> Nhớ <kbd>4</kbd> Dễ · <kbd>S</kbd> phát âm</div>`;
  hydrateIcons(box);
}

function startSession(words, limit = rv.limit) {
  // Đến hạn: ưu tiên thẻ quá hạn lâu nhất; nguồn khác: xáo trộn
  let list = rv.source === "due" ? words : shuffle(words.slice());
  if (limit) list = list.slice(0, limit);
  if (rv.source === "due") shuffle(list);
  if (!list.length) return toast("Không có thẻ nào để ôn", true);
  rv.queue = list.map((w) => ({ id: w.id, dir: rv.dir === "mixed" ? (Math.random() < 0.5 ? "front" : "back") : rv.dir, again: 0 }));
  rv.i = 0;
  rv.flipped = false;
  rv.res = [0, 0, 0, 0];
  rv.forgot = new Set();
  rv.screen = "session";
  renderReview();
}

const currentWord = () => (rv.screen === "session" ? byId(rv.queue[rv.i]?.id) : null);

function renderCard(box) {
  const card = rv.queue[rv.i];
  const w = card && byId(card.id);
  if (!w) {
    if (rv.i < rv.queue.length) { rv.i++; return renderCard(box); } // thẻ đã bị xoá
    return finishSession();
  }
  rv.flipped = false;
  const L = langOf(w.lang);
  const pct = (rv.i / rv.queue.length) * 100;
  const meta = `<div class="fc-meta">${activeLang() ? "" : langPill(w.lang) + esc(L.name)}${w.type ? `<span class="badge">${esc(w.type)}</span>` : ""}</div>`;
  const wordRow = `<div class="fc-row"><div class="fc-word" lang="${esc(w.lang)}">${esc(w.word)}</div><button class="icon-btn" data-speak-card title="Phát âm (S)">${icon("speaker")}</button></div>`;
  const typing = rv.typing
    ? `<input class="fc-input" id="fcInput" placeholder="${card.dir === "front" ? "Gõ nghĩa rồi Enter…" : "Gõ từ rồi Enter…"}" autocomplete="off" spellcheck="false">`
    : "";
  const front =
    card.dir === "front"
      ? `${meta}${wordRow}${typing}<div class="fc-hint">Bấm vào thẻ hoặc Space để lật</div>`
      : `${meta}<div class="fc-mean big">${esc(w.meaning || "(chưa có nghĩa)")}</div>${typing}<div class="fc-hint">Nhớ ra từ chưa? Bấm để lật</div>`;
  const ex = (w.examples || []).slice(0, 3).map((e) => `<li>${esc(e)}</li>`).join("");
  const back = `${meta}${wordRow}${w.ipa ? `<div class="fc-ipa">${esc(w.ipa)}</div>` : ""}
    <div class="fc-mean">${esc(w.meaning)}</div>
    ${ex ? `<ul class="fc-ex">${ex}</ul>` : ""}
    ${w.notes ? `<div class="fc-notes">${esc(w.notes)}</div>` : ""}
    <div id="fcAnswer"></div>`;

  box.innerHTML = `
    <div class="rv-top"><button class="btn ghost" id="rvQuit">Kết thúc</button>
      <div class="progress"><span style="width:${pct}%"></span></div><span class="muted">${rv.i + 1}/${rv.queue.length}</span></div>
    <div class="flash" id="flash"><div class="flash-inner"><div class="face front">${front}</div><div class="face back">${back}</div></div></div>
    <div class="rv-actions" id="rvActions"><button class="btn primary big" id="rvFlip">Lật thẻ <kbd>Space</kbd></button></div>`;
  $("#fcInput")?.focus();
}

function checkAnswer(ans, w, dir) {
  const a = ans.trim().toLowerCase();
  if (!a) return null;
  const targets = dir === "front" ? (w.meaning || "").split(/[;,/\n]/) : [w.word];
  const t = targets.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (t.includes(a)) return "ok";
  const na = norm(a);
  if (t.some((s) => norm(s) === na)) return "near";
  if (dir === "front" && na.length >= 2 && t.some((s) => norm(s).includes(na))) return "near";
  return "bad";
}

function flip() {
  if (rv.screen !== "session" || rv.flipped) return;
  const card = rv.queue[rv.i];
  const w = byId(card.id);
  rv.flipped = true;
  const input = $("#fcInput");
  if (input) {
    const r = checkAnswer(input.value, w, card.dir);
    input.blur();
    if (r) {
      const msg = { ok: "Đúng", near: "Gần đúng", bad: `Chưa đúng — bạn gõ “${esc(input.value.trim())}”` }[r];
      $("#fcAnswer").innerHTML = `<div class="fc-answer ${r}">${msg}</div>`;
    }
  }
  $("#flash").classList.add("flipped");
  $("#rvActions").innerHTML = RATES.map(
    ([l, c], q) => `<button class="rate r-${c}" data-rate="${q}"><kbd>${q + 1}</kbd><b>${l}</b><small>${q === 0 ? "10 phút" : fmtDays(schedule(w.srs, q).interval)}</small></button>`
  ).join("");
  if (card.dir === "back") speak(w.word, w.lang);
}

function rateCard(q) {
  if (!rv.flipped) return;
  const card = rv.queue[rv.i];
  const w = byId(card.id);
  if (w) {
    w.srs = schedule(w.srs, q);
    const k = dayKey(Date.now());
    state.activity[k] = (state.activity[k] || 0) + 1;
    saveWords();
  }
  rv.res[q]++;
  if (q === 0) {
    rv.forgot.add(card.id);
    if (card.again < 2) rv.queue.push({ ...card, again: card.again + 1 }); // lặp lại cuối phiên
  }
  rv.i++;
  if (rv.i >= rv.queue.length) finishSession();
  else renderReview();
}

function finishSession() {
  if (rv.res.every((n) => n === 0)) { rv.screen = "setup"; return renderReview(); }
  rv.screen = "summary";
  renderReview();
}

function renderSummary(box) {
  const total = rv.res.reduce((a, b) => a + b, 0);
  const good = rv.res[2] + rv.res[3];
  const pct = total ? Math.round((good / total) * 100) : 0;
  const forgot = [...rv.forgot].map(byId).filter(Boolean);
  box.innerHTML = `
    <div class="card summary">
      <div class="big-n">${pct}%</div>
      <div class="muted">Tỉ lệ nhớ · đã ôn <b>${total}</b> lượt thẻ, nhớ tốt <b>${good}</b> lượt</div>
      <div class="sum-bars">${RATES.map(([l, c], q) => `<div class="r-${c}"><b>${rv.res[q]}</b>${l}</div>`).join("")}</div>
      ${forgot.length ? `<div><h3 style="margin-bottom:8px">Các từ cần chú ý</h3><div class="tags">${forgot.map((w) => `<button class="tag" data-open="${w.id}">${esc(w.word)}</button>`).join("")}</div></div>` : ""}
      <div class="row-btns">
        ${forgot.length ? `<button class="btn primary" id="rvRetry">Ôn lại ${forgot.length} từ đã quên</button>` : ""}
        <button class="btn" id="rvSetup">Chọn bộ thẻ khác</button>
      </div>
    </div>`;
  updateSide();
}

/* =========================================================
   VIEW: Các thời trong tiếng Anh – 3 mốc thời gian × 4 dạng
   ========================================================= */

// base past participle — các động từ bất quy tắc thông dụng
const IRREGULAR = Object.fromEntries(
  ("arise arose arisen|awake awoke awoken|be was been|bear bore born|beat beat beaten|become became become|begin began begun|" +
    "bend bent bent|bet bet bet|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|" +
    "bring brought brought|broadcast broadcast broadcast|build built built|burst burst burst|buy bought bought|catch caught caught|" +
    "choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|" +
    "do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|" +
    "fight fought fought|find found found|flee fled fled|fly flew flown|forbid forbade forbidden|forget forgot forgotten|" +
    "forgive forgave forgiven|freeze froze frozen|get got got|give gave given|go went gone|grind ground ground|grow grew grown|" +
    "hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|" +
    "kneel knelt knelt|know knew known|lay laid laid|lead led led|leave left left|lend lent lent|let let let|lie lay lain|light lit lit|" +
    "lose lost lost|make made made|mean meant meant|meet met met|pay paid paid|put put put|quit quit quit|read read read|ride rode ridden|" +
    "ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|" +
    "sew sewed sewn|shake shook shaken|shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|" +
    "sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|speak spoke spoken|speed sped sped|spend spent spent|" +
    "spin spun spun|split split split|spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|" +
    "sting stung stung|strike struck struck|swear swore sworn|sweep swept swept|swim swam swum|swing swung swung|take took taken|" +
    "teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|wake woke woken|wear wore worn|" +
    "weep wept wept|win won won|wind wound wound|write wrote written")
    .split("|")
    .map((x) => { const [b, p, pp] = x.split(" "); return [b, [p, pp]]; })
);
// understand, overcome, rebuild… = tiền tố + động từ bất quy tắc
const IRR_PREFIX = /^(under|over|with|fore|mis|out|re|un|be)(.+)$/;
const irregularOf = (v) => {
  if (IRREGULAR[v]) return IRREGULAR[v];
  const m = v.match(IRR_PREFIX);
  return m && IRREGULAR[m[2]] ? IRREGULAR[m[2]].map((x) => m[1] + x) : null;
};
// Động từ 2 âm tiết nhấn âm cuối cũng gấp đôi phụ âm: prefer → preferred
const DOUBLE_EXTRA = new Set(["prefer", "refer", "admit", "occur", "permit", "commit", "control", "regret", "submit", "transfer", "equip", "omit", "compel", "patrol", "propel", "upset"]);
const doublesFinal = (v) => DOUBLE_EXTRA.has(v) || /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v);

const vPast = (v) => {
  const irr = irregularOf(v);
  if (irr) return irr[0];
  if (/e$/.test(v)) return v + "d";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied";
  if (doublesFinal(v)) return v + v.slice(-1) + "ed";
  return v + "ed";
};
const vPP = (v) => irregularOf(v)?.[1] || vPast(v);
const vIng = (v) => {
  if (v === "be") return "being";
  if (/ie$/.test(v)) return v.slice(0, -2) + "ying";
  if (/[^aeiouy]e$/.test(v)) return v.slice(0, -1) + "ing";
  if (doublesFinal(v)) return v + v.slice(-1) + "ing";
  return v + "ing";
};
const v3s = (v) => {
  if (v === "have") return "has";
  if (/(s|x|z|ch|sh|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
};

const SUBJECTS = [
  { k: "I", p: "1s" }, { k: "you", p: "pl" }, { k: "he", p: "3s" }, { k: "she", p: "3s" },
  { k: "it", p: "3s" }, { k: "we", p: "pl" }, { k: "they", p: "pl" },
];
const subjOf = (k) => SUBJECTS.find((s) => s.k === k) || SUBJECTS[0];

function finite(lemma, time, person) {
  if (lemma === "be") {
    if (time === "past") return person === "pl" ? "were" : "was";
    return person === "1s" ? "am" : person === "3s" ? "is" : "are";
  }
  if (time === "past") return vPast(lemma);
  return person === "3s" ? v3s(lemma) : lemma;
}

const TIMES = [["past", "Quá khứ", "Past"], ["present", "Hiện tại", "Present"], ["future", "Tương lai", "Future"]];
const ASPECTS = [["simple", "Đơn", "Simple"], ["cont", "Tiếp diễn", "Continuous"], ["perf", "Hoàn thành", "Perfect"], ["perfcont", "Hoàn thành tiếp diễn", "Perfect Continuous"]];
const FORMS = [["aff", "Khẳng định"], ["neg", "Phủ định"], ["q", "Nghi vấn"]];

// Trả về các phần của câu: [{ w, role: subj | aux | not | main }]
function conjugate(time, aspect, subjKey, verb, mode) {
  const subj = subjOf(subjKey);
  const [head = "do", ...rest] = verb.trim().toLowerCase().split(/\s+/);
  const tail = rest.length ? " " + rest.join(" ") : ""; // phrasal verb: give up → gave up
  const chain = {
    simple: [{ l: head, f: "fin", main: true }],
    cont: [{ l: "be", f: "fin" }, { l: head, f: "ing", main: true }],
    perf: [{ l: "have", f: "fin" }, { l: head, f: "en", main: true }],
    perfcont: [{ l: "have", f: "fin" }, { l: "be", f: "en" }, { l: head, f: "ing", main: true }],
  }[aspect];
  if (time === "future") { chain[0].f = "base"; chain.unshift({ l: "will", f: "base" }); }
  const form = (t) => (t.f === "base" ? t.l : t.f === "ing" ? vIng(t.l) : t.f === "en" ? vPP(t.l) : finite(t.l, time, subj.p));
  let words = chain.map((t) => ({ w: form(t) + (t.main ? tail : ""), role: t.main ? "main" : "aux" }));

  if (mode !== "aff" && chain.length === 1 && head !== "be") {
    // động từ thường ở thì đơn mượn do / does / did
    words = [{ w: finite("do", time, subj.p), role: "aux" }, { w: head + tail, role: "main" }];
  }
  let parts;
  if (mode === "neg") parts = [{ w: subj.k, role: "subj" }, words[0], { w: "not", role: "not" }, ...words.slice(1)];
  else if (mode === "q") parts = [words[0], { w: subj.k, role: "subj" }, ...words.slice(1)];
  else parts = [{ w: subj.k, role: "subj" }, ...words];
  parts[0] = { ...parts[0], w: parts[0].w[0].toUpperCase() + parts[0].w.slice(1) };
  const text = parts.map((p) => p.w).join(" ") + (mode === "q" ? "?" : "");
  return { parts, text };
}

const TENSE_INFO = {
  "past.simple": {
    vi: "Quá khứ đơn", en: "Past Simple", formula: "S + V2/V-ed", neg: "S + did not + V", q: "Did + S + V?",
    uses: ["Hành động đã xảy ra và kết thúc tại một thời điểm xác định trong quá khứ", "Chuỗi hành động nối tiếp nhau trong quá khứ"],
    signals: ["yesterday", "last week", "… ago", "in 2010"], example: "I watched a film last night.",
  },
  "present.simple": {
    vi: "Hiện tại đơn", en: "Present Simple", formula: "S + V / V-s,es", neg: "S + do/does not + V", q: "Do/Does + S + V?",
    uses: ["Thói quen, hành động lặp đi lặp lại", "Sự thật hiển nhiên, chân lý", "Lịch trình, thời gian biểu cố định"],
    signals: ["always", "usually", "often", "every day"], example: "She drinks coffee every morning.",
  },
  "future.simple": {
    vi: "Tương lai đơn", en: "Future Simple", formula: "S + will + V",
    uses: ["Quyết định ngay tại lúc nói", "Dự đoán không có căn cứ chắc chắn", "Lời hứa, lời đề nghị"],
    signals: ["tomorrow", "next week", "I think", "probably"], example: "I think it will rain tomorrow.",
  },
  "past.cont": {
    vi: "Quá khứ tiếp diễn", en: "Past Continuous", formula: "S + was/were + V-ing",
    uses: ["Hành động đang diễn ra tại một thời điểm trong quá khứ", "Hành động đang diễn ra thì hành động khác xen vào (when + quá khứ đơn)"],
    signals: ["at 8pm yesterday", "while", "when"], example: "I was cooking when he called.",
  },
  "present.cont": {
    vi: "Hiện tại tiếp diễn", en: "Present Continuous", formula: "S + am/is/are + V-ing",
    uses: ["Hành động đang diễn ra lúc nói", "Kế hoạch đã sắp xếp cho tương lai gần", "Tình huống tạm thời, đang thay đổi"],
    signals: ["now", "right now", "at the moment", "Look!"], example: "They are studying for the exam now.",
  },
  "future.cont": {
    vi: "Tương lai tiếp diễn", en: "Future Continuous", formula: "S + will be + V-ing",
    uses: ["Hành động sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai"],
    signals: ["at this time tomorrow", "at 9am next Monday"], example: "This time tomorrow I will be flying to Tokyo.",
  },
  "past.perf": {
    vi: "Quá khứ hoàn thành", en: "Past Perfect", formula: "S + had + V3/V-ed",
    uses: ["Hành động đã hoàn tất trước một hành động hoặc mốc thời gian khác trong quá khứ"],
    signals: ["before", "after", "by the time", "already"], example: "The train had left when we arrived.",
  },
  "present.perf": {
    vi: "Hiện tại hoàn thành", en: "Present Perfect", formula: "S + have/has + V3/V-ed",
    uses: ["Hành động đã xảy ra, không nói rõ thời điểm, còn liên quan tới hiện tại", "Trải nghiệm (đã từng / chưa từng)", "Bắt đầu trong quá khứ và kéo dài tới nay"],
    signals: ["already", "yet", "just", "ever", "never", "since", "for"], example: "I have visited Japan twice.",
  },
  "future.perf": {
    vi: "Tương lai hoàn thành", en: "Future Perfect", formula: "S + will have + V3/V-ed",
    uses: ["Hành động sẽ hoàn tất trước một thời điểm trong tương lai"],
    signals: ["by + mốc tương lai", "by the time", "before"], example: "By 2030 she will have finished her PhD.",
  },
  "past.perfcont": {
    vi: "Quá khứ hoàn thành tiếp diễn", en: "Past Perfect Continuous", formula: "S + had been + V-ing",
    uses: ["Hành động kéo dài liên tục đến trước một mốc trong quá khứ, nhấn mạnh quá trình"],
    signals: ["for", "since", "before", "how long"], example: "He was tired because he had been running for an hour.",
  },
  "present.perfcont": {
    vi: "Hiện tại hoàn thành tiếp diễn", en: "Present Perfect Continuous", formula: "S + have/has been + V-ing",
    uses: ["Bắt đầu trong quá khứ, kéo dài liên tục đến hiện tại (có thể còn tiếp)", "Nhấn mạnh độ dài, quá trình của hành động"],
    signals: ["for", "since", "all day", "how long"], example: "I have been learning English for three years.",
  },
  "future.perfcont": {
    vi: "Tương lai hoàn thành tiếp diễn", en: "Future Perfect Continuous", formula: "S + will have been + V-ing",
    uses: ["Hành động sẽ kéo dài liên tục đến một thời điểm trong tương lai, nhấn mạnh độ dài"],
    signals: ["by … for", "by the time … for"], example: "By June I will have been working here for five years.",
  },
};

// Công thức theo dạng câu: chèn "not" sau trợ động từ đầu / đảo trợ động từ lên trước S
function formulaFor(key, mode) {
  const info = TENSE_INFO[key];
  if (mode === "aff") return info.formula;
  if (info[mode]) return info[mode];
  const [, aux, ...rest] = info.formula.split(" + ");
  const [first, ...more] = aux.split(" ");
  const tail = [more.join(" "), ...rest].filter(Boolean);
  return mode === "neg"
    ? ["S", `${first} not`, ...tail].join(" + ")
    : [first[0].toUpperCase() + first.slice(1), "S", ...tail].join(" + ") + "?";
}

const COMMON_VERBS = ["do", "be", "go", "have", "eat", "work", "study", "play", "write", "read", "make", "take", "see", "live", "travel",
  "watch", "swim", "run", "buy", "stop", "try", "finish", "learn", "sleep", "teach", "speak", "cook", "drive", "visit", "begin"];

const tz = {
  tab: "guide", // guide | table | practice
  g: { time: null, aspect: null }, // câu trả lời ở tab "Chọn thời nào?"
  verb: "do",
  subj: "I",
  mode: "aff",
  sel: "present.simple",
  p: { mode: "all", q: null, done: false, right: 0, total: 0 },
};

const sentenceHtml = (r) =>
  r.parts.map((p) => (p.role === "subj" ? esc(p.w) : `<span class="t-${p.role}">${esc(p.w)}</span>`)).join(" ") + (r.text.endsWith("?") ? "?" : "");

function setupTenses() {
  const box = $("#view-tenses");
  box.addEventListener("click", (e) => {
    const t = e.target;
    const tab = t.closest("[data-ttab]");
    if (tab) { tz.tab = tab.dataset.ttab; return renderTenses(); }
    const chip = t.closest("[data-verb]");
    if (chip) { tz.verb = chip.dataset.verb; $("#tzVerb").value = tz.verb; return renderTenses(); }
    const subj = t.closest("[data-subj]");
    if (subj) { tz.subj = subj.dataset.subj; return renderTenses(); }
    const mode = t.closest("[data-tmode]");
    if (mode) { tz.mode = mode.dataset.tmode; return renderTenses(); }
    const cell = t.closest("[data-tense]");
    if (cell) { tz.sel = cell.dataset.tense; return renderTenses(); }
    const sp = t.closest("[data-say]");
    if (sp) return speak(sp.dataset.say, "en");
    const gt = t.closest("[data-gtime]");
    const ga = t.closest("[data-gaspect]");
    if (gt || ga) {
      if (gt) tz.g.time = gt.dataset.gtime;
      if (ga) tz.g.aspect = ga.dataset.gaspect;
      renderGuide();
      // màn hẹp: kết quả nằm dưới các lựa chọn → cuộn tới
      if (tz.g.time && tz.g.aspect && matchMedia("(max-width: 1080px)").matches)
        $(".g-side").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const show = t.closest("#tzShow");
    if (show) { tz.sel = show.dataset.key; tz.mode = "aff"; tz.tab = "table"; return renderTenses(); }
    if (t.closest("#tzCheck")) return practiceCheck();
    if (t.closest("#tzNext")) return practiceNext();
  });
  box.addEventListener("input", (e) => {
    if (e.target.id === "tzVerb") {
      tz.verb = e.target.value.trim() || "do";
      renderTenseBody();
    }
  });
  box.addEventListener("change", (e) => {
    if (e.target.id === "tzPMode") { tz.p.mode = e.target.value; practiceNext(); }
  });
  box.addEventListener("keydown", (e) => {
    if (e.target.id === "tzAnswer" && e.key === "Enter") { e.preventDefault(); tz.p.done ? practiceNext() : practiceCheck(); }
  });
}

function renderTenses() {
  $$("#tzTabs button").forEach((b) => b.classList.toggle("on", b.dataset.ttab === tz.tab));
  $("#tzTable").hidden = tz.tab !== "table";
  $("#tzPractice").hidden = tz.tab !== "practice";
  $("#tzGuide").hidden = tz.tab !== "guide";
  if (tz.tab === "guide") return renderGuide();
  if (tz.tab === "practice") {
    if (!tz.p.q) practiceNext();
    else renderPractice();
    return;
  }
  if ($("#tzVerb").value.trim() !== tz.verb) $("#tzVerb").value = tz.verb;
  $("#tzChips").innerHTML = ["do", "be", "go", "have", "eat", "study", "stop", "write"]
    .map((v) => `<button class="chip-btn${v === tz.verb ? " on" : ""}" data-verb="${v}">${v}</button>`).join("");
  $("#tzSubj").innerHTML = SUBJECTS.map((s) => `<button data-subj="${s.k}" class="${s.k === tz.subj ? "on" : ""}">${s.k}</button>`).join("");
  $("#tzMode").innerHTML = FORMS.map(([k, l]) => `<button data-tmode="${k}" class="${k === tz.mode ? "on" : ""}">${l}</button>`).join("");
  renderTenseBody();
}

function renderTenseBody() {
  const v = tz.verb.toLowerCase().split(/\s+/)[0];
  const irr = irregularOf(v);
  $("#tzForms").innerHTML = [["V1", v], ["V2", v === "be" ? "was/were" : vPast(v)], ["V3", vPP(v)], ["V-ing", vIng(v)], ["V-s", v === "be" ? "is" : v3s(v)]]
    .map(([k, f]) => `<span><small>${k}</small>${esc(f)}</span>`).join("") + (irr ? '<span class="badge">bất quy tắc</span>' : "");

  let html = `<table class="tense-table"><thead><tr><th>Dạng</th>${TIMES.map(([, vi, en]) => `<th>${vi} <small>(${en})</small></th>`).join("")}</tr></thead><tbody>`;
  for (const [a, vi, en] of ASPECTS) {
    html += `<tr><th><b>${en}</b> <small>(${vi})</small></th>`;
    for (const [t] of TIMES) {
      const key = `${t}.${a}`;
      html += `<td><button class="tcell${key === tz.sel ? " on" : ""}" data-tense="${key}">${sentenceHtml(conjugate(t, a, tz.subj, tz.verb, tz.mode))}</button></td>`;
    }
    html += "</tr>";
  }
  $("#tzGrid").innerHTML = html + "</tbody></table>";

  const [t, a] = tz.sel.split(".");
  const info = TENSE_INFO[tz.sel];
  const line = (m, label) => {
    const r = conjugate(t, a, tz.subj, tz.verb, m);
    return `<li><span class="muted">${label}</span><span class="t-sent">${sentenceHtml(r)}</span><button class="icon-btn" data-say="${esc(r.text)}" title="Nghe">${icon("speaker")}</button></li>`;
  };
  $("#tzDetail").innerHTML = `
    <div class="tz-head"><h3>${info.vi}</h3><span class="muted">${info.en}</span></div>
    ${timelineSvg(t, a)}
    <div class="tz-formula">${esc(formulaFor(tz.sel, tz.mode))}</div>
    <div class="tz-sec"><h4>Với “${esc(tz.verb)}”</h4><ul class="tz-forms">${FORMS.map(([m, l]) => line(m, l)).join("")}</ul></div>
    <div class="tz-sec"><h4>Cách dùng</h4><ul class="tz-uses">${info.uses.map((u) => `<li>${esc(u)}</li>`).join("")}</ul></div>
    <div class="tz-sec"><h4>Dấu hiệu nhận biết</h4><div class="tags">${info.signals.map((s) => `<span class="badge">${esc(s)}</span>`).join("")}</div></div>
    <div class="tz-sec"><h4>Ví dụ</h4><div class="tz-example">${esc(info.example)}<button class="icon-btn" data-say="${esc(info.example)}" title="Nghe">${icon("speaker")}</button></div></div>`;
}

/* ---------- Chọn thời nào: 2 câu hỏi → 1 ô trong bảng ---------- */
const GUIDE_TIMES = {
  past: "Đã xảy ra, trước bây giờ",
  present: "Bây giờ, thói quen, sự thật",
  future: "Sẽ xảy ra, sau bây giờ",
};
const GUIDE_ASPECTS = {
  simple: ["Chỉ nói sự việc", "Xảy ra / thói quen / sự thật, không quan tâm quá trình", "Chuyện gì xảy ra?"],
  cont: ["Đang diễn ra", "Đang dở dang tại một thời điểm, lúc đó đang làm gì", "Lúc đó đang làm gì?"],
  perf: ["Đã xong trước một mốc", "Hoàn tất trước mốc đó, quan tâm kết quả hoặc trải nghiệm", "Đã xong chưa / đã từng chưa?"],
  perfcont: ["Kéo dài đến một mốc", "Liên tục tới mốc đó, nhấn mạnh làm bao lâu", "Làm được bao lâu rồi?"],
};
const GUIDE_TIPS = [
  {
    a: "Quá khứ đơn", b: "Hiện tại hoàn thành",
    rule: "Có mốc thời gian quá khứ cụ thể (yesterday, in 2020, … ago) → quá khứ đơn. Không nói khi nào, hoặc kết quả còn ảnh hưởng tới bây giờ (already, ever, since, for) → hiện tại hoàn thành.",
    ex: ["I lost my keys yesterday.", "I have lost my keys. (giờ vẫn chưa thấy)"],
  },
  {
    a: "Hiện tại đơn", b: "Hiện tại tiếp diễn",
    rule: "Thói quen, sự thật, việc lâu dài → hiện tại đơn. Đang xảy ra lúc nói, hoặc chỉ tạm thời → hiện tại tiếp diễn.",
    ex: ["I work in Hanoi.", "I am working from home this week."],
  },
  {
    a: "Quá khứ đơn", b: "Quá khứ tiếp diễn",
    rule: "Hành động đang diễn ra làm nền → quá khứ tiếp diễn. Hành động ngắn chen vào hoặc nối tiếp nhau → quá khứ đơn.",
    ex: ["I was cooking when he called.", "He called, then I left."],
  },
  {
    a: "Hiện tại hoàn thành", b: "Hiện tại hoàn thành tiếp diễn",
    rule: "Nói kết quả, số lượng đã làm được → hoàn thành. Nói quá trình, làm bao lâu rồi → hoàn thành tiếp diễn.",
    ex: ["I have read three books.", "I have been reading for two hours."],
  },
];

// Trục thời gian minh hoạ: mốc tham chiếu (quá khứ / bây giờ / tương lai) và dạng hành động
function timelineSvg(time, aspect) {
  const NOW = 160;
  const R = { past: 90, present: NOW, future: 230 }[time];
  let shape = "";
  if (aspect === "simple")
    shape = time === "present"
      ? [100, 130, 160, 190, 220].map((x) => `<circle cx="${x}" cy="30" r="4" class="tl-act"/>`).join("")
      : `<circle cx="${R}" cy="30" r="6" class="tl-act"/>`;
  else if (aspect === "cont") shape = `<rect x="${R - 34}" y="24" width="68" height="12" rx="6" class="tl-act tl-soft"/><circle cx="${R}" cy="30" r="3" class="tl-act"/>`;
  else if (aspect === "perf") shape = `<circle cx="${R - 58}" cy="30" r="4" class="tl-act"/><path d="M${R - 58} 30H${R - 9}" class="tl-line"/><path d="M${R - 15} 24l6 6-6 6" class="tl-line"/>`;
  else shape = `<rect x="${R - 62}" y="25" width="62" height="10" rx="5" class="tl-act"/>`;
  const mark = time === "present" ? "" : `<path d="M${R} 12V48" class="tl-mark"/><text x="${R}" y="60" class="tl-txt">mốc</text>`;
  return `<svg class="timeline" viewBox="0 0 320 64" role="img" aria-label="Trục thời gian">
    <path d="M10 30H306M300 25l6 5-6 5" class="tl-axis"/>
    <path d="M${NOW} 14V46" class="tl-now"/><text x="${NOW}" y="60" class="tl-txt">bây giờ</text>
    ${mark}${shape}</svg>`;
}

function renderGuide() {
  const g = tz.g;
  const opt = (attr, key, on, title, sub) =>
    `<button class="g-opt${on ? " on" : ""}" ${attr}="${key}"><b>${title}</b><small>${sub}</small></button>`;
  let result = `<div class="g-empty muted">Chọn đủ 2 câu hỏi để xem nên dùng thời nào.</div>`;
  if (g.time && g.aspect) {
    const key = `${g.time}.${g.aspect}`;
    const info = TENSE_INFO[key];
    result = `
      <div class="g-result">
        <div class="tz-head"><h3>${info.vi}</h3><span class="muted">${info.en}</span></div>
        ${timelineSvg(g.time, g.aspect)}
        <div class="tz-formula">${esc(info.formula)}</div>
        <div class="tz-example">${esc(info.example)}<button class="icon-btn" data-say="${esc(info.example)}" title="Nghe">${icon("speaker")}</button></div>
        <div class="tags">${info.signals.map((s) => `<span class="badge">${esc(s)}</span>`).join("")}</div>
        <div><button class="btn" id="tzShow" data-key="${key}">Xem trong bảng</button></div>
      </div>`;
  }
  $("#tzGuide").innerHTML = `
    <div class="g-layout">
      <div class="card g-steps">
        <div class="g-step">
          <h3><span class="g-num">1</span>Sự việc xảy ra khi nào?</h3>
          <div class="g-opts g-3">${TIMES.map(([k, vi]) => opt("data-gtime", k, g.time === k, vi, GUIDE_TIMES[k])).join("")}</div>
        </div>
        <div class="g-step">
          <h3><span class="g-num">2</span>Bạn muốn nhấn mạnh điều gì?</h3>
          <div class="g-opts">${ASPECTS.map(([k]) => {
            const [t, d, q] = GUIDE_ASPECTS[k];
            return opt("data-gaspect", k, g.aspect === k, t, `${d}<br><i>“${q}”</i>`);
          }).join("")}</div>
        </div>
      </div>
      <div class="card g-side">${result}</div>
    </div>
    <h3 class="g-tips-title">Các cặp hay nhầm</h3>
    <div class="g-tips">${GUIDE_TIPS.map((t) => `
      <div class="card g-tip">
        <div class="g-pair"><b>${t.a}</b><span class="muted">hay</span><b>${t.b}</b></div>
        <p>${esc(t.rule)}</p>
        <ul>${t.ex.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      </div>`).join("")}
    </div>`;
}

/* ---------- Luyện tập: cho thời + chủ ngữ + động từ, gõ câu ---------- */
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function practiceVerbs() {
  // ưu tiên động từ trong sổ từ vựng tiếng Anh của bạn
  const mine = state.words
    .filter((w) => w.lang === "en" && /verb/i.test(w.type || "") && /^[a-z]+( [a-z]+)?$/i.test(w.word.trim()))
    .map((w) => w.word.trim().toLowerCase());
  return mine.length >= 5 ? mine.concat(COMMON_VERBS.slice(0, 10)) : mine.concat(COMMON_VERBS);
}

function practiceNext() {
  const p = tz.p;
  p.q = {
    time: pick(TIMES)[0],
    aspect: pick(ASPECTS)[0],
    subj: pick(SUBJECTS).k,
    verb: pick(practiceVerbs()),
    mode: p.mode === "all" ? pick(FORMS)[0] : p.mode,
  };
  p.done = false;
  renderPractice();
}

// Chuẩn hoá để so sánh: bỏ dấu câu, mở rộng dạng viết tắt (don't → do not)
function normSentence(s) {
  return s.toLowerCase().replace(/[’]/g, "'").replace(/\bwon't\b/g, "will not").replace(/\bcan't\b/g, "can not")
    .replace(/n't\b/g, " not").replace(/'m\b/g, " am").replace(/'re\b/g, " are").replace(/'ve\b/g, " have").replace(/'ll\b/g, " will")
    .replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
}
function sentenceMatches(input, answer) {
  const target = normSentence(answer);
  const base = normSentence(input);
  // 's có thể là is/has, 'd có thể là had/would
  let variants = [base];
  for (const [re, opts] of [[/'s\b/g, [" is", " has"]], [/'d\b/g, [" had", " would"]]])
    variants = variants.flatMap((v) => (v.match(re) ? opts.map((o) => v.replace(re, o)) : [v]));
  return variants.some((v) => v.replace(/\s+/g, " ") === target);
}

function practiceCheck() {
  const p = tz.p;
  const input = $("#tzAnswer").value.trim();
  if (!input || p.done) return;
  const q = p.q;
  const ans = conjugate(q.time, q.aspect, q.subj, q.verb, q.mode).text;
  p.ok = sentenceMatches(input, ans);
  p.total++;
  if (p.ok) p.right++;
  p.done = true;
  renderPractice();
}

function renderPractice() {
  const p = tz.p;
  const q = p.q;
  const info = TENSE_INFO[`${q.time}.${q.aspect}`];
  const ans = conjugate(q.time, q.aspect, q.subj, q.verb, q.mode);
  const modeLabel = FORMS.find(([k]) => k === q.mode)[1];
  const prev = $("#tzAnswer")?.value || "";
  $("#tzPractice").innerHTML = `
    <div class="card tz-practice">
      <div class="tz-ptop">
        <label class="f">Dạng câu<select id="tzPMode">
          <option value="all"${p.mode === "all" ? " selected" : ""}>Trộn cả 3</option>
          ${FORMS.map(([k, l]) => `<option value="${k}"${p.mode === k ? " selected" : ""}>${l}</option>`).join("")}
        </select></label>
        <span class="muted">Đúng <b>${p.right}</b>/${p.total}</span>
      </div>
      <div class="tz-prompt">
        <div class="tz-ptense">${info.vi} <span class="muted">· ${info.en} · ${modeLabel}</span></div>
        <div class="tz-pq"><span>${esc(q.subj)}</span> / <span>${esc(q.verb)}</span></div>
        <div class="muted tz-pformula">${esc(formulaFor(`${q.time}.${q.aspect}`, q.mode))}</div>
      </div>
      <input id="tzAnswer" placeholder="Viết câu rồi Enter…" autocomplete="off" spellcheck="false"${p.done ? " readonly" : ""}>
      ${p.done
        ? `<div class="fc-answer ${p.ok ? "ok" : "bad"}">${p.ok ? "Đúng" : "Chưa đúng"} — đáp án: <b>${esc(ans.text)}</b>
             <button class="icon-btn" data-say="${esc(ans.text)}" title="Nghe">${icon("speaker")}</button></div>`
        : ""}
      <div class="row-btns tz-pbtns">
        ${p.done ? `<button class="btn primary" id="tzNext">Câu tiếp <kbd>Enter</kbd></button>` : `<button class="btn primary" id="tzCheck">Kiểm tra <kbd>Enter</kbd></button>`}
      </div>
    </div>`;
  const inp = $("#tzAnswer");
  if (p.done) inp.value = prev;
  inp.focus();
}

/* =========================================================
   VIEW: Cài đặt
   ========================================================= */
function setupSettings() {
  const s = state.settings;
  const persist = debounce(() => { saveSettings(); updateSide(); }, 300);
  const aiSet = (k, v) => { s.ai = s.ai || {}; s.ai[s.provider] = { ...s.ai[s.provider], [k]: v }; persist(); };
  $("#sProvider").addEventListener("change", (e) => { s.provider = e.target.value; persist(); renderAiSettings(); $("#sTestRes").textContent = ""; });
  $("#sFormat").addEventListener("change", (e) => aiSet("format", e.target.value));
  $("#sBase").addEventListener("input", (e) => aiSet("baseUrl", e.target.value.trim()));
  $("#sKey").addEventListener("input", (e) => aiSet("apiKey", e.target.value.trim()));
  $("#sModel").addEventListener("input", (e) => aiSet("model", e.target.value.trim()));
  $("#sMeaning").addEventListener("change", (e) => { s.meaningLang = e.target.value; persist(); });
  $("#sGoal").addEventListener("input", (e) => { s.dailyGoal = Math.max(1, +e.target.value || 10); persist(); });
  $("#sKeyShow").addEventListener("click", (e) => {
    const k = $("#sKey");
    k.type = k.type === "password" ? "text" : "password";
    e.target.textContent = k.type === "password" ? "Hiện" : "Ẩn";
  });
  $("#sTest").addEventListener("click", async () => {
    const out = $("#sTestRes");
    const cfg = aiConfig();
    const bad = aiConfigError(cfg);
    if (bad) return (out.textContent = bad);
    const access = requestHostAccess(cfg.baseUrl);
    out.textContent = "Đang kiểm tra…";
    try {
      if (!(await access)) throw new Error(`chưa cấp quyền truy cập ${new URL(cfg.baseUrl).host}`);
      const r = await askAI("hello", "en");
      out.textContent = `✓ ${cfg.name} · ${cfg.model} — “hello”: ${r.meaning || "(không có nghĩa)"}`;
    } catch (e) {
      out.textContent = "✗ " + e.message;
    }
  });

  $("#sExport").addEventListener("click", () => {
    const data = { app: "LearnVocab", version: 1, exportedAt: new Date().toISOString(), words: state.words, activity: state.activity };
    download(`learnvocab-${dayKey(Date.now())}.json`, JSON.stringify(data, null, 2), "application/json");
  });
  $("#sExportCsv").addEventListener("click", () => {
    const cols = ["word", "ipa", "type", "meaning", "examples", "lang", "tags", "link", "notes", "createdAt"];
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = state.words.map((w) =>
      cols.map((c) => cell(c === "examples" ? (w.examples || []).join("\n") : c === "tags" ? (w.tags || []).join(", ") : c === "createdAt" ? fmtDate(w.createdAt) : w[c])).join(",")
    );
    download(`learnvocab-${dayKey(Date.now())}.csv`, "﻿" + [cols.join(","), ...rows].join("\n"), "text/csv");
  });
  $("#sImport").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const r = importData(JSON.parse(await file.text()));
      await saveWords();
      render();
      toast(`Đã nhập: ${r.added} từ mới, cập nhật ${r.updated} từ`);
    } catch (err) {
      toast("File không hợp lệ: " + esc(err.message), true);
    }
  });
  $("#sClear").addEventListener("click", async () => {
    if (!state.words.length) return toast("Không có dữ liệu để xoá");
    if (!confirm(`Xoá toàn bộ ${state.words.length} từ? Hãy xuất JSON để sao lưu trước.`)) return;
    if (prompt('Gõ "XOA" để xác nhận') !== "XOA") return;
    state.words = [];
    state.activity = {};
    await saveWords();
    render();
    toast("Đã xoá toàn bộ dữ liệu");
  });
}

function renderSettings() {
  const s = state.settings;
  renderAiSettings();
  $("#sMeaning").innerHTML = langOptions(s.meaningLang);
  $("#sGoal").value = s.dailyGoal;
  const langs = new Set(state.words.map((w) => w.lang)).size;
  $("#sDataInfo").textContent = `${state.words.length} từ · ${langs} ngôn ngữ. Dữ liệu lưu cục bộ trong trình duyệt — nên xuất JSON định kỳ để sao lưu.`;
}

function renderAiSettings() {
  const cfg = aiConfig();
  const c = state.settings.ai?.[cfg.id] || {};
  $("#sProvider").innerHTML = Object.entries(PROVIDERS).map(([k, p]) => `<option value="${k}"${k === cfg.id ? " selected" : ""}>${esc(p.name)}</option>`).join("");
  $("#sFormatBox").hidden = !cfg.custom;
  $("#sFormat").value = cfg.format;
  $("#sBase").value = c.baseUrl || cfg.baseUrl;
  $("#sBase").placeholder = cfg.baseUrl || "https://…/v1";
  $("#sKey").value = c.apiKey || "";
  $("#sKey").placeholder = cfg.noKey ? "Không cần (để trống)" : cfg.custom ? "Để trống nếu API không cần key" : "Dán API key vào đây";
  $("#sModel").value = c.model || "";
  $("#sModel").placeholder = cfg.models[0] || "tên model";
  $("#modelList").innerHTML = cfg.models.map((m) => `<option value="${esc(m)}">`).join("");
  $("#sKeyLink").hidden = !cfg.keyUrl;
  if (cfg.keyUrl) $("#sKeyLink").href = cfg.keyUrl;
  $("#sHint").textContent = cfg.hint || "";
  $("#sHint").hidden = !cfg.hint;
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(data) {
  const arr = Array.isArray(data) ? data : data?.words;
  if (!Array.isArray(arr)) throw new Error("không tìm thấy danh sách words");
  const map = new Map(state.words.map((w) => [w.id, w]));
  let added = 0;
  let updated = 0;
  const list = (v, sep) => (Array.isArray(v) ? v.map(String) : String(v || "").split(sep)).map((s) => s.trim()).filter(Boolean);
  for (const raw of arr) {
    if (!raw || !raw.word) continue;
    const created = typeof raw.createdAt === "number" ? raw.createdAt : Date.parse(raw.createdAt) || Date.now();
    const w = {
      id: raw.id ? String(raw.id) : uid(),
      lang: String(raw.lang || "en"),
      word: String(raw.word).trim(),
      type: String(raw.type || ""),
      ipa: String(raw.ipa || ""),
      meaning: String(raw.meaning || ""),
      examples: list(raw.examples, "\n"),
      link: String(raw.link || ""),
      tags: list(raw.tags, ","),
      notes: String(raw.notes || ""),
      createdAt: created,
      updatedAt: raw.updatedAt || created,
      srs: { ...newSrs(), ...(raw.srs || {}) },
    };
    if (map.has(w.id)) { Object.assign(map.get(w.id), w); updated++; }
    else { state.words.push(w); map.set(w.id, w); added++; }
  }
  if (data.activity && typeof data.activity === "object")
    for (const [k, v] of Object.entries(data.activity)) state.activity[k] = Math.max(state.activity[k] || 0, +v || 0);
  return { added, updated };
}

/* =========================================================
   Chọn ngôn ngữ cho phiên học
   ========================================================= */
const langMenuOpen = () => !$("#langMenu").hidden;
function closeLangMenu() {
  $("#langMenu").hidden = true;
  $("#langSwitch").setAttribute("aria-expanded", "false");
}

function toggleLangMenu() {
  if (langMenuOpen()) return closeLangMenu();
  const counts = {};
  for (const w of state.words) counts[w.lang] = (counts[w.lang] || 0) + 1;
  const cur = activeLang();
  // Ngôn ngữ có nhiều từ lên trước; ẩn ngôn ngữ giải nghĩa nếu chưa có từ nào
  const langs = LANGS.filter((l) => l.code !== state.settings.meaningLang || counts[l.code])
    .concat(Object.keys(counts).filter((c) => !LANGS.some((l) => l.code === c)).map(langOf))
    .sort((a, b) => (counts[b.code] || 0) - (counts[a.code] || 0));
  const item = (code, name, n, pill) =>
    `<button class="lm-item${code === cur ? " on" : ""}" role="menuitemradio" aria-checked="${code === cur}" data-pick="${esc(code)}">${pill}<span class="lm-name">${esc(name)}</span><span class="lm-n">${n || ""}</span></button>`;
  const menu = $("#langMenu");
  menu.innerHTML =
    item("", "Tất cả ngôn ngữ", state.words.length, '<span class="lang-pill">ALL</span>') +
    '<div class="lm-sep"></div>' +
    langs.map((l) => item(l.code, l.name, counts[l.code], langPill(l.code))).join("");
  menu.hidden = false;
  $("#langSwitch").setAttribute("aria-expanded", "true");
  (menu.querySelector(".lm-item.on") || menu.querySelector(".lm-item")).focus();
}

function setScope(code) {
  state.settings.activeLang = code;
  if (code) state.settings.lastLang = code;
  state.search.lang = "";
  rv.lang = "";
  rv.preset = null;
  if (rv.source === "preset") rv.source = "due";
  rv.screen = "setup";
  saveSettings();
  closeLangMenu();
  render();
}

function applyScope() {
  const code = activeLang();
  document.body.classList.toggle("scoped", !!code);
  $("#lsPill").innerHTML = code ? langPill(code) : '<span class="lang-pill">ALL</span>';
  $("#lsName").textContent = code ? langOf(code).name : "Tất cả ngôn ngữ";
  document.title = code ? `LearnVocab · ${langOf(code).name}` : "LearnVocab";
  // Mục "Thời" chỉ dành cho tiếng Anh
  const tensesOff = !!code && code !== "en";
  $('nav a[data-view="tenses"]').hidden = tensesOff;
  if (tensesOff && state.view === "tenses") location.hash = "#add";
  // Form thêm từ: khoá ngôn ngữ theo phiên, ẩn ô chọn cho gọn
  const sel = addForm.elements.namedItem("lang");
  const field = sel.closest(".f");
  field.hidden = !!code;
  field.parentElement.classList.toggle("one", !!code);
  if (code) {
    if (![...sel.options].some((o) => o.value === code)) sel.add(new Option(langOf(code).name, code));
    sel.value = code;
  }
}

/* =========================================================
   Router & khởi động
   ========================================================= */
const VIEWS = { add: renderAdd, calendar: renderCalendar, search: renderSearch, review: renderReview, tenses: renderTenses, settings: renderSettings };

function render() {
  applyScope();
  VIEWS[state.view]();
  updateSide();
}

function route() {
  const v = location.hash.slice(1);
  state.view = VIEWS[v] ? v : "add";
  $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + state.view));
  $$("nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === state.view));
  closeModal();
  render();
  if (state.view === "add") addForm.elements.namedItem("word").focus();
  if (state.view === "search") $("#q").focus();
}

function setupGlobal() {
  // Mở chi tiết / phát âm / đóng modal (event delegation toàn trang)
  document.addEventListener("click", (e) => {
    if (langMenuOpen() && !e.target.closest("#langMenu, #langSwitch")) closeLangMenu();
    const sp = e.target.closest("[data-speak-id]");
    if (sp) { e.stopPropagation(); const w = byId(sp.dataset.speakId); return w && speak(w.word, w.lang); }
    const op = e.target.closest("[data-open]");
    if (op) return openWord(op.dataset.open);
    if (e.target.closest("[data-close]")) return closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (modalOpen()) { if (e.key === "Escape") closeModal(); return; }
    if (langMenuOpen()) {
      if (e.key === "Escape") { closeLangMenu(); $("#langSwitch").focus(); }
      return;
    }
    const tag = e.target.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;

    if (state.view === "review" && rv.screen === "session") {
      if (e.target.id === "fcInput") {
        if (e.key === "Enter") { e.preventDefault(); flip(); }
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); return rv.flipped ? rateCard(2) : flip(); }
      if (/^[1-4]$/.test(e.key)) { e.preventDefault(); return rateCard(+e.key - 1); }
      if (e.key.toLowerCase() === "s") { const w = currentWord(); return w && speak(w.word, w.lang); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); location.hash = "#search"; $("#q").focus(); }
    else if (e.key === "n") { e.preventDefault(); location.hash = "#add"; addForm.elements.namedItem("word").focus(); }
  });

  // Đồng bộ khi dữ liệu thay đổi từ tab khác
  if (hasChrome)
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== "local") return;
      // Bỏ qua thay đổi do chính tab này ghi (giá trị mới trùng state hiện tại)
      const same = (k, cur) => !ch[k] || JSON.stringify(ch[k].newValue) === JSON.stringify(cur);
      if (same("words", state.words) && same("activity", state.activity) && same("settings", state.settings)) return;
      if (ch.words) state.words = ch.words.newValue || [];
      if (ch.activity) state.activity = ch.activity.newValue || {};
      if (ch.settings) {
        for (const k of Object.keys(state.settings)) delete state.settings[k];
        Object.assign(state.settings, DEFAULT_SETTINGS, ch.settings.newValue);
      }
      if (!(state.view === "review" && rv.screen === "session") && state.view !== "settings") render();
    });
  // Chrome tải danh sách giọng đọc bất đồng bộ
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
}

async function init() {
  const d = await store.get(["words", "settings", "activity"]);
  state.words = Array.isArray(d.words) ? d.words : [];
  state.activity = d.activity || {};
  state.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  if (d.settings?.apiKey && !d.settings.ai) {
    state.settings.ai = { openai: { apiKey: d.settings.apiKey, model: d.settings.model } };
    delete state.settings.apiKey;
    delete state.settings.model;
  }
  hydrateIcons(document);
  setupAdd();
  setupCalendar();
  setupSearch();
  setupReview();
  setupTenses();
  setupSettings();
  setupGlobal();
  window.addEventListener("hashchange", route);
  $("#langSwitch").addEventListener("click", toggleLangMenu);
  $("#langMenu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (b) setScope(b.dataset.pick);
  });
  $("#langMenu").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = $$(".lm-item", $("#langMenu"));
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  });
  route();
}

init();
