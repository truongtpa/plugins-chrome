/* bibtex.js — parser, normalizer & formatter dùng chung cho cả 2 tab */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- parse */

  function parse(src) {
    const entries = [];
    const errors = [];
    let i = 0;
    const n = src.length;

    const skipWs = () => { while (i < n && /\s/.test(src[i])) i++; };

    function readBalanced(open, close) {
      let depth = 0, out = '';
      for (; i < n; i++) {
        const c = src[i];
        if (c === '\\' && i + 1 < n) { out += c + src[i + 1]; i++; continue; }
        if (c === open) { depth++; if (depth === 1) continue; }
        else if (c === close) { depth--; if (depth === 0) { i++; return out; } }
        out += c;
      }
      throw new Error('thiếu dấu đóng "' + close + '"');
    }

    function readQuoted() {
      i++; // bỏ qua "
      let out = '', depth = 0;
      for (; i < n; i++) {
        const c = src[i];
        if (c === '\\' && i + 1 < n) { out += c + src[i + 1]; i++; continue; }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '"' && depth === 0) { i++; return out; }
        out += c;
      }
      throw new Error('thiếu dấu đóng ngoặc kép');
    }

    function readValue() {
      const parts = [];
      for (;;) {
        skipWs();
        if (i >= n) break;
        const c = src[i];
        if (c === '{') parts.push(readBalanced('{', '}'));
        else if (c === '"') parts.push(readQuoted());
        else {
          let bare = '';
          while (i < n && !/[,}\s#]/.test(src[i])) bare += src[i++];
          if (!bare) break;
          parts.push(bare);
        }
        skipWs();
        if (src[i] === '#') { i++; continue; }
        break;
      }
      return parts.join('');
    }

    while (i < n) {
      while (i < n && src[i] !== '@') i++;
      if (i >= n) break;
      const at = i;
      i++;
      let type = '';
      while (i < n && /[A-Za-z]/.test(src[i])) type += src[i++];
      type = type.toLowerCase();
      skipWs();
      if (src[i] !== '{' && src[i] !== '(') {
        errors.push('Bỏ qua "@' + (type || '?') + '" ở vị trí ' + at + ': không tìm thấy dấu "{".');
        continue;
      }
      const open = src[i], close = open === '{' ? '}' : ')';

      if (type === 'comment' || type === 'string' || type === 'preamble') {
        try { readBalanced(open, close); } catch (e) { errors.push('@' + type + ': ' + e.message); break; }
        continue;
      }

      i++; // bỏ qua dấu mở
      let key = '';
      while (i < n && src[i] !== ',' && src[i] !== close) key += src[i++];
      key = key.trim();
      if (src[i] === ',') i++;

      const fields = [];
      let broken = false;
      for (;;) {
        skipWs();
        if (i >= n) { errors.push('@' + type + '{' + key + '}: thiếu dấu "}" kết thúc.'); broken = true; break; }
        if (src[i] === close) { i++; break; }
        if (src[i] === ',') { i++; continue; }

        let name = '';
        while (i < n && !/[=,\s{}()]/.test(src[i])) name += src[i++];
        skipWs();
        if (src[i] !== '=') {
          errors.push('@' + type + '{' + key + '}: trường "' + (name || src[i]) + '" thiếu dấu "=".');
          while (i < n && src[i] !== ',' && src[i] !== close) i++;
          continue;
        }
        i++;
        let value;
        try { value = readValue(); }
        catch (e) { errors.push('@' + type + '{' + key + '}, trường "' + name + '": ' + e.message); broken = true; break; }
        fields.push({ name: name.toLowerCase(), value: squash(value) });
      }

      entries.push({ type, key, fields });
      if (broken) break;
    }

    return { entries, errors };
  }

  const squash = (s) => s.replace(/[\t\r\n]+/g, ' ').replace(/ {2,}/g, ' ').trim();

  /* ------------------------------------------------------------ normalize */

  const TYPE_ALIAS = {
    conference: 'inproceedings',
    electronic: 'online',
    www: 'online',
    webpage: 'online',
    mastersthesis: 'thesis',
    phdthesis: 'thesis',
    periodical: 'article'
  };

  const NAME_ALIAS = {
    journal: 'journaltitle',
    school: 'institution',
    address: 'location',
    year: 'year', month: 'month', day: 'day' // gộp thành date ở bước sau
  };

  // Thứ tự trong mảng cũng chính là thứ tự xuất ra
  const KEEP = {
    article:       ['title', 'journaltitle', 'author', 'date', 'volume', 'number', 'pages', 'doi'],
    inproceedings: ['title', 'booktitle', 'author', 'editor', 'date', 'pages', 'publisher', 'doi'],
    incollection:  ['title', 'booktitle', 'author', 'editor', 'date', 'pages', 'publisher', 'doi'],
    book:          ['title', 'author', 'editor', 'date', 'edition', 'series', 'volume', 'publisher', 'isbn', 'doi'],
    inbook:        ['title', 'booktitle', 'author', 'editor', 'date', 'chapter', 'pages', 'publisher', 'doi'],
    thesis:        ['title', 'author', 'type', 'date', 'institution', 'doi'],
    techreport:    ['title', 'author', 'date', 'institution', 'number', 'doi'],
    report:        ['title', 'author', 'date', 'institution', 'number', 'doi'],
    manual:        ['title', 'author', 'organization', 'date', 'edition'],
    online:        ['author', 'title', 'date', 'year', 'url', 'urldate', 'note'],
    misc:          ['author', 'title', 'date', 'year', 'howpublished', 'url', 'urldate', 'note'],
    unpublished:   ['title', 'author', 'date', 'note'],
    proceedings:   ['title', 'editor', 'date', 'publisher', 'doi']
  };
  const KEEP_DEFAULT = ['title', 'booktitle', 'journaltitle', 'author', 'editor', 'date', 'volume',
                        'number', 'pages', 'publisher', 'institution', 'doi'];

  const REQUIRED = {
    article:       ['author', 'title', 'journaltitle', 'date'],
    inproceedings: ['author', 'title', 'booktitle', 'date'],
    incollection:  ['author', 'title', 'booktitle', 'date'],
    book:          ['title', 'publisher', 'date'],
    inbook:        ['title', 'publisher', 'date'],
    thesis:        ['author', 'title', 'institution', 'date'],
    techreport:    ['author', 'title', 'institution', 'date'],
    report:        ['author', 'title', 'institution', 'date'],
    online:        ['title', 'url'],
    misc:          ['title'],
    proceedings:   ['title', 'date']
  };

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
                   january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8,
                   september: 9, october: 10, november: 11, december: 12 };

  const pad2 = (x) => String(x).padStart(2, '0');

  function monthNum(raw) {
    if (!raw) return null;
    const s = String(raw).replace(/[{}~\\.]/g, '').trim().toLowerCase();
    if (/^\d{1,2}$/.test(s)) { const m = +s; return m >= 1 && m <= 12 ? m : null; }
    const k = Object.keys(MONTHS).find((m) => s.startsWith(m.slice(0, 3)) && MONTHS[m]);
    return k ? MONTHS[k] : null;
  }

  function normalizePages(v) {
    return v
      .replace(/\s*(--+|—|–|-)\s*/g, '--')
      .replace(/^p{1,2}\.?\s*/i, '')
      .trim();
  }

  function normalizeAuthors(v) {
    // tách theo " and " ở ngoài mọi cặp ngoặc
    const parts = [];
    let depth = 0, cur = '';
    for (let k = 0; k < v.length; k++) {
      const c = v[k];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (depth === 0 && /\s/.test(c) && /(^|\s)and$/i.test(cur) && /^\s/.test(v.slice(k))) {
        parts.push(cur.replace(/\s+and$/i, '').trim());
        cur = '';
        continue;
      }
      cur += c;
    }
    parts.push(cur.trim());
    return parts.filter(Boolean).join(' and ');
  }

  /**
   * Rút gọn + chuẩn hoá một entry.
   * opts: { keepDoi, keepUrl, yearToDate }
   */
  function clean(entry, opts) {
    opts = opts || {};
    const type = TYPE_ALIAS[entry.type] || entry.type;
    const src = {};
    const infos = [];
    const seen = [];
    for (const f of entry.fields) {
      const name = NAME_ALIAS[f.name] || f.name;
      if (!(name in src)) seen.push(name);
      src[name] = f.value;
    }

    // year/month/day -> date (chuẩn biblatex)
    if (opts.yearToDate !== false) {
      if (!src.date && src.year) {
        const y = (src.year.match(/\d{4}/) || [])[0] || src.year;
        const m = monthNum(src.month);
        const d = src.day && /^\d{1,2}$/.test(src.day.trim()) ? +src.day.trim() : null;
        src.date = m ? (d ? `${y}-${pad2(m)}-${pad2(d)}` : `${y}-${pad2(m)}`) : y;
      }
      delete src.year; delete src.month; delete src.day;
    } else if (src.date && !src.year) {
      src.year = (src.date.match(/\d{4}/) || [src.date])[0];
    }

    // @phdthesis/@mastersthesis -> @thesis + type (biblatex)
    if (type === 'thesis' && !src.type) {
      if (entry.type === 'phdthesis') src.type = 'phdthesis';
      else if (entry.type === 'mastersthesis') src.type = 'mathesis';
    }

    if (src.pages) src.pages = normalizePages(src.pages);
    if (src.author) src.author = normalizeAuthors(src.author);
    if (src.editor) src.editor = normalizeAuthors(src.editor);
    if (src.doi) src.doi = src.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');

    const isOnline = type === 'online' || type === 'misc';
    let keep = (KEEP[type] || KEEP_DEFAULT).slice();
    if (opts.keepDoi === false) keep = keep.filter((k) => k !== 'doi');
    if (opts.keepUrl && !keep.includes('url')) keep.push('url', 'urldate');
    if (!opts.keepUrl && !isOnline) keep = keep.filter((k) => k !== 'url' && k !== 'urldate');
    if (opts.yearToDate === false) {
      keep = keep.map((k) => (k === 'date' ? 'year' : k));
    } else {
      keep = keep.filter((k) => k !== 'year');
    }

    const fields = [];
    for (const name of keep) if (src[name]) fields.push({ name, value: src[name] });

    const kept = new Set(fields.map((f) => f.name));
    const dropped = seen.filter((s) => !kept.has(s) && !['year', 'month', 'day'].includes(s));

    const warnings = [];
    const req = REQUIRED[type] || [];
    const missing = req.filter((r) => {
      if (r === 'author') return !kept.has('author') && !kept.has('editor');
      if (r === 'date') return !kept.has('date') && !kept.has('year');
      return !kept.has(r);
    });
    if (missing.length) warnings.push('thiếu trường bắt buộc: ' + missing.join(', '));
    if (!entry.key) warnings.push('thiếu citation key');
    if (!KEEP[type]) infos.push('kiểu "@' + type + '" không có trong danh sách chuẩn, dùng bộ trường mặc định');
    if (entry.type !== type) infos.push('đổi kiểu @' + entry.type + ' → @' + type);

    return { type, key: entry.key || makeKey(src), fields, warnings, infos, dropped };
  }

  /* -------------------------------------------------------------- format */

  function format(e, opts) {
    opts = opts || {};
    const indent = opts.indent || '  ';
    const trailing = opts.trailingComma !== false;
    const w = opts.align ? Math.max(0, ...e.fields.map((f) => f.name.length)) : 0;
    const body = e.fields.map((f, idx) => {
      const pad = opts.align ? ' '.repeat(w - f.name.length) : '';
      const comma = trailing || idx < e.fields.length - 1 ? ',' : '';
      return `${indent}${f.name}${pad} = {${f.value}}${comma}`;
    });
    return `@${e.type}{${e.key},\n${body.join('\n')}\n}`;
  }

  /* ----------------------------------------------------------- key maker */

  const STOP = new Set(['a', 'an', 'the', 'on', 'of', 'in', 'for', 'and', 'to', 'with', 'at', 'from',
                        'by', 'via', 'is', 'are', 'using', 'towards', 'toward']);

  function deaccent(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  function titleKey(title, max) {
    const words = deaccent(String(title || ''))
      .replace(/[{}\\$]/g, ' ')
      .split(/[^A-Za-z0-9]+/)
      .filter((w) => w && !STOP.has(w.toLowerCase()));
    return words.slice(0, max || 3)
      .map((w) => (w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
      .join('');
  }

  function makeKey(src) {
    const first = (src.author || src.editor || '').split(' and ')[0].replace(/[{}]/g, '');
    const last = first.includes(',') ? first.split(',')[0] : first.split(/\s+/).pop() || '';
    const year = (String(src.date || src.year || '').match(/\d{4}/) || [''])[0];
    const base = titleKey(last, 1) || titleKey(src.title, 2) || 'Ref';
    return base + year;
  }

  global.BIB = { parse, clean, format, titleKey, deaccent, makeKey, normalizePages, normalizeAuthors };
})(window);
