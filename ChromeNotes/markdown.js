// Markdown → HTML (marked + KaTeX + DOMPurify), dùng cho bảng trong live preview
window.MD = (() => {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const tex = (src, displayMode) => {
    try {
      return katex.renderToString(src, { displayMode, throwOnError: false, output: "htmlAndMathml" });
    } catch {
      return `<code class="math-error">${esc(src)}</code>`;
    }
  };

  marked.use({
    gfm: true,
    breaks: true,
    extensions: [
      {
        name: "mathBlock",
        level: "block",
        start: (src) => src.match(/^\$\$/m)?.index,
        tokenizer(src) {
          const m = /^\$\$([\s\S]+?)\$\$[^\S\n]*(?:\n|$)/.exec(src);
          if (m) return { type: "mathBlock", raw: m[0], text: m[1].trim() };
        },
        renderer: (t) => `<div class="math-block">${tex(t.text, true)}</div>\n`,
      },
      {
        name: "mathInline",
        level: "inline",
        start: (src) => {
          const i = src.indexOf("$");
          return i < 0 ? undefined : i;
        },
        tokenizer(src) {
          const m = /^\$\$([^$]+?)\$\$/.exec(src) || /^\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
          if (m) return { type: "mathInline", raw: m[0], text: m[1], display: m[0].startsWith("$$") };
        },
        renderer: (t) => tex(t.text, t.display),
      },
    ],
  });

  // Link trong preview luôn mở tab mới
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  function render(src) {
    return DOMPurify.sanitize(marked.parse(src), { ADD_ATTR: ["target"] });
  }

  return { render };
})();
