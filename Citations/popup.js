/* popup.js — điều khiển 3 tab */
'use strict';

const $ = (id) => document.getElementById(id);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ tabs */

const TABS = [
  { btn: 'tab-btn-clean', panel: 'panel-clean' },
  { btn: 'tab-btn-url', panel: 'panel-url' },
  { btn: 'tab-btn-snip', panel: 'panel-snip' }
];

function showTab(idx) {
  TABS.forEach((t, i) => {
    const on = i === idx;
    $(t.btn).classList.toggle('active', on);
    $(t.btn).setAttribute('aria-selected', String(on));
    $(t.panel).hidden = !on;
  });
  chrome.storage.local.set({ activeTab: idx });
}
TABS.forEach((t, i) => $(t.btn).addEventListener('click', () => showTab(i)));

/* -------------------------------------------------------------- report UI */

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function report(el, kind, title, items) {
  const box = $(el);
  box.className = 'report ' + kind;
  box.hidden = false;
  const list = (items || []).filter(Boolean);
  box.innerHTML =
    `<span class="t">${esc(title)}</span>` +
    (list.length ? '<ul>' + list.map((s) => `<li>${s}</li>`).join('') + '</ul>' : '');
}

function flash(id, msg, kind) {
  const el = $(id);
  el.textContent = msg;
  el.className = 'status ' + (kind || '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; el.className = 'status'; }, 2500);
}

async function copyFrom(areaId, statusId) {
  const text = $(areaId).value;
  if (!text.trim()) return flash(statusId, 'Chưa có gì để chép.', 'err');
  try {
    await navigator.clipboard.writeText(text);
    flash(statusId, '✓ Đã chép', 'ok');
  } catch {
    $(areaId).select();
    document.execCommand('copy');
    flash(statusId, '✓ Đã chép', 'ok');
  }
}

/* ==================================================== TAB 1 · rút gọn bib */

function runClean() {
  const src = $('in-bib').value;
  if (!src.trim()) {
    $('out-bib').value = '';
    return report('report1', 'err', 'Chưa nhập BibTeX.');
  }

  const opts = {
    keepDoi: $('opt-doi').checked,
    keepUrl: $('opt-url').checked,
    yearToDate: $('opt-date').checked
  };
  const fmt = { align: $('opt-align').checked, trailingComma: true };

  const { entries, errors } = BIB.parse(src);
  if (!entries.length) {
    $('out-bib').value = '';
    return report('report1', 'err', 'Không đọc được entry nào.', errors.map(esc));
  }

  const out = [];
  const notes = [];
  const keys = new Set();
  let bad = 0;
  let nFields = 0;

  for (const raw of entries) {
    const e = BIB.clean(raw, opts);
    if (keys.has(e.key)) e.warnings.push('trùng citation key với entry trước');
    keys.add(e.key);
    nFields += e.fields.length;
    const label = `<code>@${esc(e.type)}{${esc(e.key)}}</code>`;

    if (!e.fields.length) {          // entry hỏng / rỗng: không xuất khối trống
      bad++;
      notes.push(`${label} không còn trường nào dùng được, đã bỏ qua`);
      continue;
    }
    out.push(BIB.format(e, fmt));

    if (e.warnings.length) { bad++; notes.push(`${label} ${esc(e.warnings.join('; '))}`); }
    if (e.infos.length) notes.push(`${label} <span class="dim">${esc(e.infos.join('; '))}</span>`);
    if (e.dropped.length) {
      notes.push(`${label} <span class="dim">đã bỏ ${e.dropped.length} trường: ${esc(e.dropped.join(', '))}</span>`);
    }
  }

  $('out-bib').value = out.join('\n\n');

  const head = `${entries.length} entry · giữ lại ${nFields} trường`;
  if (errors.length) report('report1', 'err', 'Có lỗi cú pháp — ' + head, errors.map(esc).concat(notes));
  else if (bad) report('report1', 'warn', 'Đọc được nhưng thiếu dữ liệu — ' + head, notes);
  else report('report1', 'ok', '✓ Hợp lệ — ' + head, notes);
}

$('btn-clean').addEventListener('click', runClean);
$('btn-clear1').addEventListener('click', () => {
  $('in-bib').value = ''; $('out-bib').value = ''; $('report1').hidden = true; $('in-bib').focus();
});
$('btn-copy1').addEventListener('click', () => copyFrom('out-bib', 'status1'));
$('btn-paste').addEventListener('click', async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (!t.trim()) return flash('status1', 'Clipboard trống.', 'err');
    $('in-bib').value = t;
    runClean();
  } catch {
    flash('status1', 'Không đọc được clipboard, hãy dán bằng Ctrl/Cmd+V.', 'err');
  }
});
$('in-bib').addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runClean();
});
['opt-doi', 'opt-url', 'opt-date', 'opt-align'].forEach((id) =>
  $(id).addEventListener('change', () => {
    chrome.storage.local.set({ [id]: $(id).checked });
    if ($('in-bib').value.trim()) runClean();
  })
);

/* ======================================================== TAB 2 · từ URL */

const TRACKERS = /^(utm_|ga_|_ga|_gl|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|yclid|vero_id|scm|spm|s_cid|cmpid|wt_mc)/i;

function tidyUrl(u, strip) {
  try {
    const url = new URL(u);
    if (strip) {
      [...url.searchParams.keys()].forEach((k) => { if (TRACKERS.test(k)) url.searchParams.delete(k); });
    }
    if (url.hash === '#') url.hash = '';
    return url.toString();
  } catch { return u; }
}

const latex = (s) =>
  String(s || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([&%#_$])/g, '\\$1')
    .trim();

function personName(raw) {
  const s = String(raw).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.includes(',')) return s;                       // đã ở dạng "Họ, Tên"
  const parts = s.split(' ');
  if (parts.length < 2) return s;
  return parts[parts.length - 1] + ', ' + parts.slice(0, -1).join(' ');
}

const ORG_HINT = /\b(foundation|inc\.?|ltd\.?|llc|gmbh|corp\.?|corporation|company|team|project|group|university|institute|laborator|association|consortium|committee|society|press|news|docs?|wiki|community|software|technologies|labs?)\b/i;

function looksLikeOrg(s) {
  if (!s) return false;
  if (ORG_HINT.test(s)) return true;
  const words = s.trim().split(/\s+/);
  return words.length > 4 || words.length === 1;
}

const SLD = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne', 'go']);
const GENERIC_SUB = new Set(['www', 'm', 'web', 'site', 'home', 'en', 'vi', 'www2']);

const cap = (s) => s.split(/[-_]/).filter(Boolean)
  .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** "hadoop.apache.org" -> "Apache Hadoop"; "en.wikipedia.org" -> "Wikipedia" */
function orgFromHost(host) {
  const labels = String(host || '').toLowerCase().split('.').filter(Boolean);
  if (!labels.length) return '';
  labels.pop();                                        // bỏ TLD
  if (labels.length > 1 && SLD.has(labels[labels.length - 1])) labels.pop();   // .co.uk, .com.vn…
  if (!labels.length) return '';
  const base = labels.pop();
  const subs = labels.filter((l) => !GENERIC_SUB.has(l) && !/^[a-z]{2}$/.test(l));
  return [cap(base)].concat(subs.map(cap)).join(' ').trim();
}

const BLOCKED = /^(just a moment|attention required|access denied|please wait|checking your browser|are you a robot|security check|403 forbidden|404 |page not found|error \d{3})/i;

function extract(html, finalUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pick = (sel, attr) => {
    const el = doc.querySelector(sel);
    const v = el ? (attr ? el.getAttribute(attr) : el.textContent) : '';
    return v ? v.replace(/\s+/g, ' ').trim() : '';
  };
  const meta = (name) =>
    pick(`meta[property="${name}" i]`, 'content') || pick(`meta[name="${name}" i]`, 'content');
  const all = (name) =>
    [...doc.querySelectorAll(`meta[name="${name}" i], meta[property="${name}" i]`)]
      .map((m) => (m.getAttribute('content') || '').trim()).filter(Boolean);

  let host = '';
  try { host = new URL(finalUrl).hostname; } catch { host = ''; }
  const site = meta('og:site_name') || meta('application-name') || orgFromHost(host);

  // --- title: cắt hậu tố " | Tên site" / " - Tên site"
  let title = meta('citation_title') || meta('og:title') || meta('twitter:title') || pick('title') || pick('h1');
  const suffixes = [meta('og:site_name'), meta('application-name'), orgFromHost(host), host.replace(/^www\./, '')];
  for (const s of suffixes) {
    if (!s || !title) continue;
    const re = new RegExp('\\s*[|\\u2013\\u2014\\u00b7\\u2022-]\\s*' +
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
    const t2 = title.replace(re, '').trim();
    if (t2 && t2 !== title) { title = t2; break; }
  }
  if (!title) title = site || host;
  const blocked = BLOCKED.test(title);

  // --- author
  const scholars = all('citation_author');
  let author = '', isOrg = false;
  if (scholars.length) {
    author = scholars.map(personName).join(' and ');
  } else {
    const cand = meta('author') || meta('article:author') || meta('dc.creator') || meta('twitter:creator');
    const usable = cand && !/^https?:/i.test(cand) ? cand : '';
    if (usable && !looksLikeOrg(usable)) author = personName(usable);
    else { author = usable || site || host; isOrg = true; }
  }
  if (isOrg && author) author = '{' + author + '}';   // -> {{Tên tổ chức}} sau khi bọc ngoặc trường

  // --- year
  const dateRaw = meta('citation_publication_date') || meta('citation_date') ||
                  meta('article:published_time') || meta('datePublished') ||
                  meta('date') || pick('time[datetime]', 'datetime');
  const year = (String(dateRaw).match(/\b(19|20)\d{2}\b/) || [''])[0] || String(new Date().getFullYear());

  const scholarly = !!(meta('citation_title') &&
    (meta('citation_journal_title') || meta('citation_conference_title') || meta('citation_doi')));

  return { title, author, year, site, host, scholarly, blocked, dated: !!dateRaw };
}

function buildOnline() {
  const key = ($('f-key').value.trim() || 'Ref').replace(/[\s,{}]/g, '');
  const fields = [];
  const add = (n, v) => { if (v) fields.push({ name: n, value: v }); };
  add('author', $('f-author').value.trim());
  add('title', $('f-title').value.trim());
  add('year', $('f-year').value.trim());
  add('url', $('f-url').value.trim());
  const acc = $('f-accessed').value;
  if (acc) {
    if ($('opt-urldate').checked) add('urldate', acc);
    else add('note', 'Accessed: ' + acc);
  }
  $('out-url').value = BIB.format({ type: 'online', key, fields }, { align: true, trailingComma: false });
}

async function fetchAndBuild() {
  let url = $('in-url').value.trim();
  if (!url) return report('report2', 'err', 'Chưa nhập URL.');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
  let parsed;
  try { parsed = new URL(url); } catch { return report('report2', 'err', 'URL không hợp lệ.'); }
  if (!/^https?:$/.test(parsed.protocol)) return report('report2', 'err', 'Chỉ hỗ trợ http/https.');

  const btn = $('btn-fetch');
  btn.disabled = true;
  btn.textContent = 'Đang tải…';
  report('report2', '', 'Đang tải trang…');

  let res;
  try {
    res = await chrome.runtime.sendMessage({ type: 'fetchPage', url: parsed.toString() });
  } catch (e) {
    res = { ok: false, error: String((e && e.message) || e) };
  }
  btn.disabled = false;
  btn.textContent = 'Tạo BibTeX';

  const cleanUrl = tidyUrl((res && res.finalUrl) || parsed.toString(), $('opt-strip').checked);
  const host = parsed.hostname;

  let info;
  const notes = [];
  if (res && res.ok && res.text) {
    info = extract(res.text, cleanUrl);
    if (info.blocked) notes.push('Trang trả về màn hình chặn/kiểm tra bot nên metadata có thể sai — hãy kiểm tra lại title và author.');
    if (!info.dated) notes.push('Trang không khai báo ngày xuất bản, dùng năm hiện tại.');
    if (info.scholarly) notes.push('Trang có metadata học thuật (<code>citation_*</code>) — BibTeX của nhà xuất bản sẽ chuẩn hơn, hãy thử tab 1.');
  } else {
    const org = orgFromHost(host) || host;
    info = { title: org, author: '{' + org + '}', year: String(new Date().getFullYear()), host };
    notes.push('Không đọc được nội dung' + (res && res.status ? ' (HTTP ' + res.status + ')' : '') +
               (res && res.error ? ': ' + esc(res.error) : '') + '. Hãy tự sửa các trường bên dưới.');
  }

  $('f-title').value = latex(info.title);
  $('f-author').value = latex(info.author);
  $('f-year').value = info.year;
  $('f-url').value = cleanUrl;
  $('f-accessed').value = todayISO();
  $('f-key').value = BIB.titleKey(info.title, 4) || BIB.titleKey(orgFromHost(host), 3) || 'Website';
  $('meta').hidden = false;

  buildOnline();
  report('report2',
    res && res.ok && !info.blocked ? (notes.length ? 'warn' : 'ok') : 'warn',
    res && res.ok ? '✓ Đã lấy metadata từ ' + host : 'Tạo mục tạm từ tên miền',
    notes);
}

$('btn-fetch').addEventListener('click', fetchAndBuild);
$('in-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchAndBuild(); });
$('btn-copy2').addEventListener('click', () => copyFrom('out-url', 'status2'));
$('btn-clear2').addEventListener('click', () => {
  ['in-url', 'out-url', 'f-key', 'f-author', 'f-title', 'f-year', 'f-url'].forEach((id) => { $(id).value = ''; });
  $('meta').hidden = true; $('report2').hidden = true; $('in-url').focus();
});
['f-key', 'f-author', 'f-title', 'f-year', 'f-url', 'f-accessed'].forEach((id) =>
  $(id).addEventListener('input', buildOnline)
);
$('opt-urldate').addEventListener('change', () => {
  chrome.storage.local.set({ 'opt-urldate': $('opt-urldate').checked });
  if (!$('meta').hidden) buildOnline();
});
$('opt-strip').addEventListener('change', () => chrome.storage.local.set({ 'opt-strip': $('opt-strip').checked }));

$('btn-tab').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && /^https?:/i.test(tab.url || '')) {
    $('in-url').value = tab.url;
    fetchAndBuild();
  } else {
    report('report2', 'err', 'Tab hiện tại không phải trang http/https.');
  }
});

/* ====================================================== TAB 3 · snippet */

let snippets = [];          // [{ id, name, code, created, updated }]
let editingId = null;
let armedDelete = null;     // id đang chờ xác nhận xoá

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'vừa xong';
  const m = s / 60;
  if (m < 60) return Math.floor(m) + ' phút trước';
  const h = m / 60;
  if (h < 24) return Math.floor(h) + ' giờ trước';
  const d = h / 24;
  if (d < 30) return Math.floor(d) + ' ngày trước';
  return new Date(ts).toLocaleDateString('vi-VN');
}

function saveSnips(after) {
  chrome.storage.local.set({ snippets }, () => {
    const err = chrome.runtime.lastError;
    if (err) flash('status3', 'Không lưu được: ' + err.message, 'err');
    else if (after) after();
  });
}

/** bôi vàng phần khớp từ khoá trong chuỗi đã escape */
function mark(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark class="hit">' + esc(text.slice(i, i + q.length)) +
         '</mark>' + esc(text.slice(i + q.length));
}

function renderSnips() {
  const q = $('snip-search').value.trim().toLowerCase();
  const list = $('snip-list');
  const open = new Set([...list.querySelectorAll('.snip.open')].map((el) => el.dataset.id));

  const shown = snippets.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));

  list.innerHTML = shown.map((s) => {
    const lines = s.code.split('\n').length;
    const isOpen = open.has(s.id);
    return `<li class="snip${isOpen ? ' open' : ''}" data-id="${esc(s.id)}">
      <div class="snip-head">
        <button class="snip-name" data-act="toggle" title="Bấm để xem nội dung"><span class="caret">${isOpen ? '▾' : '▸'}</span> ${mark(s.name, q)}</button>
        <span class="snip-meta">${lines} dòng · ${esc(ago(s.updated))}</span>
        <button class="ic" data-act="copy" title="Sao chép nội dung">Chép</button>
        <button class="ic" data-act="edit" title="Sửa snippet">Sửa</button>
        <button class="ic" data-act="del" title="Xoá snippet">Xoá</button>
      </div>
      <pre class="snip-body"${isOpen ? '' : ' hidden'}>${esc(s.code)}</pre>
    </li>`;
  }).join('');

  const total = snippets.length;
  $('snip-count').textContent = total ? (q ? `${shown.length}/${total}` : `${total} snippet`) : '';
  $('snip-empty').hidden = total > 0;
  if (total && !shown.length) {
    list.innerHTML = '<li class="empty">Không có snippet nào khớp từ khoá.</li>';
  }
  $('snip-search').parentElement.hidden = total < 2;
  armedDelete = null;
}

function resetForm() {
  editingId = null;
  $('snip-name').value = '';
  $('snip-code').value = '';
  $('btn-snip-save').textContent = 'Thêm vào danh sách';
  $('btn-snip-cancel').hidden = true;
}

function submitSnip() {
  const code = $('snip-code').value.replace(/\s+$/, '');
  if (!code.trim()) {
    flash('status3', 'Nội dung đang trống.', 'err');
    return $('snip-code').focus();
  }
  // không có tên thì lấy dòng đầu tiên làm tên
  let name = $('snip-name').value.trim();
  if (!name) name = code.split('\n')[0].trim().slice(0, 60) || 'Snippet';

  if (editingId) {
    const s = snippets.find((x) => x.id === editingId);
    if (s) { s.name = name; s.code = code; s.updated = Date.now(); }
    snippets.sort((a, b) => b.updated - a.updated);
  } else {
    snippets.unshift({ id: uid(), name, code, created: Date.now(), updated: Date.now() });
  }

  const wasEdit = !!editingId;
  saveSnips(() => {
    resetForm();
    renderSnips();
    flash('status3', wasEdit ? '✓ Đã cập nhật' : '✓ Đã lưu', 'ok');
    $('snip-name').focus();
  });
}

async function copySnip(s) {
  try {
    await navigator.clipboard.writeText(s.code);
    flash('status3', '✓ Đã chép "' + s.name + '"', 'ok');
  } catch {
    flash('status3', 'Không chép được vào clipboard.', 'err');
  }
}

$('btn-snip-save').addEventListener('click', submitSnip);
$('btn-snip-cancel').addEventListener('click', () => { resetForm(); flash('status3', 'Đã huỷ sửa'); });
$('snip-code').addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitSnip();
});
$('snip-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('snip-code').focus(); }
});
$('snip-search').addEventListener('input', renderSnips);

// Tab trong ô nội dung = 2 dấu cách, không nhảy sang nút khác
$('snip-code').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || e.shiftKey) return;
  e.preventDefault();
  const el = e.target, a = el.selectionStart, b = el.selectionEnd;
  el.value = el.value.slice(0, a) + '  ' + el.value.slice(b);
  el.selectionStart = el.selectionEnd = a + 2;
});

$('snip-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const li = btn.closest('.snip');
  const id = li && li.dataset.id;
  const s = snippets.find((x) => x.id === id);
  if (!s) return;
  const act = btn.dataset.act;

  if (act !== 'del' && armedDelete) {                 // bấm chỗ khác thì huỷ trạng thái chờ xoá
    const armed = $('snip-list').querySelector('.ic.armed');
    if (armed) { armed.classList.remove('armed'); armed.textContent = 'Xoá'; }
    armedDelete = null;
  }

  if (act === 'toggle') {
    const open = li.classList.toggle('open');
    li.querySelector('.snip-body').hidden = !open;
    li.querySelector('.caret').textContent = open ? '▾' : '▸';
  } else if (act === 'copy') {
    copySnip(s);
  } else if (act === 'edit') {
    editingId = s.id;
    $('snip-name').value = s.name;
    $('snip-code').value = s.code;
    $('btn-snip-save').textContent = 'Cập nhật';
    $('btn-snip-cancel').hidden = false;
    $('snip-name').focus();
    $('snip-name').scrollIntoView({ block: 'nearest' });
  } else if (act === 'del') {
    if (armedDelete !== id) {                         // bấm lần 1: hỏi lại
      armedDelete = id;
      btn.classList.add('armed');
      btn.textContent = 'Xoá?';
      return;
    }
    snippets = snippets.filter((x) => x.id !== id);   // bấm lần 2: xoá thật
    if (editingId === id) resetForm();
    saveSnips(() => { renderSnips(); flash('status3', 'Đã xoá "' + s.name + '"'); });
  }
});

// đồng bộ nếu popup khác / cửa sổ khác vừa đổi danh sách
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.snippets) return;
  snippets = Array.isArray(changes.snippets.newValue) ? changes.snippets.newValue : [];
  renderSnips();
});

/* --------------------------------------------------------------- khởi tạo */

chrome.storage.local.get(
  ['activeTab', 'opt-doi', 'opt-url', 'opt-date', 'opt-align', 'opt-urldate', 'opt-strip', 'snippets'],
  (st) => {
    ['opt-doi', 'opt-url', 'opt-align', 'opt-urldate'].forEach((id) => { if (st[id] === true) $(id).checked = true; });
    ['opt-date', 'opt-strip'].forEach((id) => { if (st[id] === false) $(id).checked = false; });

    snippets = Array.isArray(st.snippets) ? st.snippets : [];
    renderSnips();

    const idx = [0, 1, 2].includes(st.activeTab) ? st.activeTab : 0;
    showTab(idx);
    [$('in-bib'), $('in-url'), $('snip-name')][idx].focus();
  }
);
