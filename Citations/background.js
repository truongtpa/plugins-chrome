/* background.js — proxy fetch cho tab "Từ URL".
   Service worker MV3 không có DOM nên chỉ tải HTML thô rồi trả về cho popup parse. */

const MAX_BYTES = 3 * 1024 * 1024;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'fetchPage') {
    fetchPage(msg.url).then(sendResponse).catch((e) =>
      sendResponse({ ok: false, error: String((e && e.message) || e) })
    );
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }
});

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      credentials: 'omit',
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    });
    const ctype = res.headers.get('content-type') || '';
    if (!/html|xml|text\/plain/i.test(ctype) && ctype) {
      return { ok: false, status: res.status, finalUrl: res.url, error: 'Nội dung không phải HTML (' + ctype + ')' };
    }
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const charset = (ctype.match(/charset=([\w-]+)/i) || [, 'utf-8'])[1];
    let text;
    try { text = new TextDecoder(charset).decode(bytes); }
    catch { text = new TextDecoder('utf-8').decode(bytes); }
    return { ok: res.ok, status: res.status, finalUrl: res.url, text };
  } finally {
    clearTimeout(timer);
  }
}
