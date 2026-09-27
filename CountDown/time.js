// Dùng chung cho popup và background.

// "2026-09-27 10:49:45" (hoặc "2026-09-27T10:49:45") -> ms, theo giờ máy
function parseStart(str) {
  const m = String(str).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const t = new Date(y, mo - 1, d, h, mi, s || 0).getTime();
  return Number.isNaN(t) ? null : t;
}

// "23:55:27", "47:00:00" hoặc kiểu Slurm "1-23:55:27" -> ms
function parseWalltime(str) {
  const m = String(str).trim().match(/^(?:(\d+)-)?(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const [, d, h, mi, s] = m;
  return ((Number(d || 0) * 24 + Number(h)) * 3600 + Number(mi) * 60 + Number(s || 0)) * 1000;
}

function pad(n) { return String(n).padStart(2, "0"); }

function formatDuration(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
}

function formatDate(ms) {
  const t = new Date(ms);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}

// Chữ ngắn cho badge trên icon
function badgeText(ms) {
  if (ms <= 0) return "END";
  const min = Math.ceil(ms / 60000);
  if (min < 60) return min + "m";
  const h = Math.floor(min / 60);
  if (h < 100) return h + "h";
  return Math.floor(h / 24) + "d";
}
