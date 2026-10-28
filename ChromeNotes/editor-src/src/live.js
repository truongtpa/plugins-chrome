// Live preview kiểu Obsidian: Markdown được hiển thị ngay khi gõ.
// Ký hiệu (#, **, `, [](url), $…$) chỉ hiện ra khi con trỏ nằm trong phần tử đó.
import { StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";

// ---------- Widgets ----------
class MathWidget extends WidgetType {
  constructor(tex, display) {
    super();
    this.tex = tex;
    this.display = display;
  }
  eq(o) { return o.tex === this.tex && o.display === this.display; }
  toDOM() {
    const el = document.createElement(this.display ? "div" : "span");
    el.className = this.display ? "cm-math-block" : "cm-math-inline";
    try {
      window.katex.render(this.tex, el, { displayMode: this.display, throwOnError: false });
    } catch {
      el.textContent = this.tex;
    }
    return el;
  }
  ignoreEvent() { return false; } // bấm vào → con trỏ vào công thức → hiện mã nguồn
}

class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-bullet";
    el.textContent = "•";
    return el;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(checked) {
    super();
    this.checked = checked;
  }
  eq(o) { return o.checked === this.checked; }
  toDOM(view) {
    const wrap = document.createElement("span");
    wrap.className = "cm-task";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      e.preventDefault();
      // Tìm lại "[ ]" trên dòng hiện tại của widget rồi đảo trạng thái
      const line = view.state.doc.lineAt(view.posAtDOM(wrap));
      const m = /\[( |x|X)\]/.exec(line.text);
      if (!m) return;
      const at = line.from + m.index + 1;
      view.dispatch({ changes: { from: at, to: at + 1, insert: this.checked ? " " : "x" }, userEvent: "input" });
    });
    wrap.appendChild(box);
    return wrap;
  }
  ignoreEvent() { return true; }
}

class ImageWidget extends WidgetType {
  constructor(src, alt) {
    super();
    this.src = src;
    this.alt = alt;
  }
  eq(o) { return o.src === this.src && o.alt === this.alt; }
  toDOM() {
    const img = document.createElement("img");
    img.className = "cm-image";
    img.src = this.src;
    img.alt = this.alt;
    img.title = this.alt;
    return img;
  }
  ignoreEvent() { return false; }
}

class HtmlBlockWidget extends WidgetType {
  constructor(src, cls) {
    super();
    this.src = src;
    this.cls = cls;
  }
  eq(o) { return o.src === this.src; }
  toDOM() {
    const el = document.createElement("div");
    el.className = this.cls;
    el.innerHTML = window.MD.render(this.src);
    return el;
  }
  ignoreEvent() { return false; }
}

// ---------- Tính decorations ----------
const hide = Decoration.replace({});
const lineClass = (cls) => Decoration.line({ class: cls });
const INLINE_MATH = /(?<![\\$])\$(?!\s)((?:\\\$|[^$\n])+?)(?<![\s\\])\$(?![\d$])/g;

function build(state) {
  const { doc, selection } = state;
  const tree = ensureSyntaxTree(state, doc.length, 200) || syntaxTree(state);
  const out = [];
  const touches = (from, to) => selection.ranges.some((r) => r.from <= to && r.to >= from);
  const linesActive = (from, to) => touches(doc.lineAt(from).from, doc.lineAt(to).to);
  const within = (list, from, to) => list.some(([a, b]) => from >= a && to <= b);
  const addLines = (from, to, cls) => {
    for (let n = doc.lineAt(from).number, last = doc.lineAt(to).number; n <= last; n++) out.push(lineClass(cls).range(doc.line(n).from));
  };
  const hideMarkAndSpace = (from, to) => {
    const end = doc.sliceString(to, to + 1) === " " ? to + 1 : to;
    out.push(hide.range(from, end));
  };

  // 1) Vùng code (không xử lý công thức bên trong)
  const code = [];
  tree.iterate({
    enter(n) {
      if (n.name === "FencedCode" || n.name === "CodeBlock" || n.name === "InlineCode") code.push([n.from, n.to]);
    },
  });

  // 2) Công thức: khối $$…$$ và trong dòng $…$
  const math = [];
  const blocks = [];
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const tx = line.text.trim();
    if (!tx.startsWith("$$") || within(code, line.from, line.from)) continue;
    let end = line;
    let tex;
    if (tx.length > 4 && tx.endsWith("$$")) {
      tex = tx.slice(2, -2);
    } else {
      let j = i + 1;
      while (j <= doc.lines && !doc.line(j).text.trim().endsWith("$$")) j++;
      if (j > doc.lines) continue; // chưa đóng $$
      end = doc.line(j);
      tex = doc.sliceString(line.from, end.to).trim().slice(2, -2);
      i = j;
    }
    math.push([line.from, end.to]);
    if (linesActive(line.from, end.to)) addLines(line.from, end.to, "cm-math-src");
    else {
      out.push(Decoration.replace({ widget: new MathWidget(tex.trim(), true), block: true }).range(line.from, end.to));
      blocks.push([line.from, end.to]);
    }
  }
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (!line.text.includes("$") || within(math, line.from, line.to)) continue;
    INLINE_MATH.lastIndex = 0;
    for (let m; (m = INLINE_MATH.exec(line.text)); ) {
      const from = line.from + m.index;
      const to = from + m[0].length;
      if (code.some(([a, b]) => from < b && to > a)) continue;
      math.push([from, to]);
      out.push(
        touches(from, to)
          ? Decoration.mark({ class: "cm-math-src" }).range(from, to)
          : Decoration.replace({ widget: new MathWidget(m[1], false) }).range(from, to)
      );
    }
  }

  // 3) Các phần tử Markdown
  tree.iterate({
    enter(n) {
      const { name, from, to } = n;
      if (within(math, from, to) && name !== "Document") return false;
      if (within(blocks, from, to)) return false;

      let m;
      if ((m = /^ATXHeading(\d)$/.exec(name))) {
        out.push(lineClass(`cm-h cm-h${m[1]}`).range(doc.lineAt(from).from));
        const mark = n.node.firstChild;
        if (mark?.name === "HeaderMark" && !linesActive(from, to)) hideMarkAndSpace(mark.from, mark.to);
        return;
      }
      if ((m = /^SetextHeading(\d)$/.exec(name))) {
        out.push(lineClass(`cm-h cm-h${m[1]}`).range(doc.lineAt(from).from));
        return;
      }

      switch (name) {
        case "Emphasis":
        case "StrongEmphasis":
        case "Strikethrough":
        case "InlineCode":
          if (!touches(from, to)) {
            for (let c = n.node.firstChild; c; c = c.nextSibling) {
              if (/Mark$/.test(c.name)) out.push(hide.range(c.from, c.to));
            }
          }
          return name === "InlineCode" ? false : undefined;

        case "Link": {
          const marks = n.node.getChildren("LinkMark");
          const url = n.node.getChild("URL");
          if (marks.length >= 3 && url && !touches(from, to)) {
            const href = doc.sliceString(url.from, url.to);
            out.push(hide.range(marks[0].from, marks[0].to));
            out.push(Decoration.mark({ class: "cm-link", attributes: { "data-href": href, title: href + "\n⌘/Ctrl + click để mở" } }).range(marks[0].to, marks[1].from));
            out.push(hide.range(marks[1].from, to));
            return false;
          }
          return;
        }

        case "Image": {
          const url = n.node.getChild("URL");
          if (url && !touches(from, to)) {
            const text = doc.sliceString(from, to);
            const alt = /^!\[([^\]]*)\]/.exec(text)?.[1] || "";
            out.push(Decoration.replace({ widget: new ImageWidget(doc.sliceString(url.from, url.to), alt) }).range(from, to));
          }
          return false;
        }

        case "URL":
          if (n.node.parent?.name !== "Link" && n.node.parent?.name !== "Image") {
            const href = doc.sliceString(from, to);
            out.push(Decoration.mark({ class: "cm-link cm-bare-url", attributes: { "data-href": href, title: "⌘/Ctrl + click để mở" } }).range(from, to));
          }
          return;

        case "Blockquote":
          addLines(from, to, "cm-quote");
          return;

        case "QuoteMark":
          if (!linesActive(from, to)) hideMarkAndSpace(from, to);
          return;

        case "ListMark": {
          const item = n.node.parent;
          const task = n.node.nextSibling?.name === "Task" ? n.node.nextSibling.getChild("TaskMarker") : null;
          if (task) {
            const checked = /x/i.test(doc.sliceString(task.from, task.to));
            if (checked) out.push(lineClass("cm-task-done").range(doc.lineAt(from).from));
            if (!linesActive(from, from)) out.push(Decoration.replace({ widget: new CheckboxWidget(checked) }).range(from, task.to));
          } else if (item?.parent?.name === "BulletList") {
            if (!linesActive(from, from)) out.push(Decoration.replace({ widget: new BulletWidget() }).range(from, to));
          } else {
            out.push(Decoration.mark({ class: "cm-list-num" }).range(from, to));
          }
          return;
        }

        case "HorizontalRule":
          if (!linesActive(from, to)) {
            out.push(lineClass("cm-hr").range(doc.lineAt(from).from));
            out.push(hide.range(from, to));
          }
          return false;

        case "FencedCode":
        case "CodeBlock": {
          const first = doc.lineAt(from).number;
          const last = doc.lineAt(to).number;
          for (let i = first; i <= last; i++) {
            const cls = "cm-codeblock" + (i === first ? " cm-cb-first" : "") + (i === last ? " cm-cb-last" : "");
            out.push(lineClass(cls).range(doc.line(i).from));
          }
          if (name === "FencedCode" && !linesActive(from, to)) {
            for (const c of n.node.getChildren("CodeMark")) out.push(hide.range(c.from, c.to));
          }
          return false;
        }

        case "Table":
          if (!linesActive(from, to)) {
            const a = doc.lineAt(from).from;
            const b = doc.lineAt(to).to;
            out.push(Decoration.replace({ widget: new HtmlBlockWidget(doc.sliceString(a, b), "cm-table md"), block: true }).range(a, b));
          } else {
            addLines(from, to, "cm-table-src");
          }
          return false;
      }
    },
  });

  return Decoration.set(out, true);
}

const livePreviewField = StateField.define({
  create: (state) => build(state),
  update(deco, tr) {
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState)) return build(tr.state);
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ⌘/Ctrl + click vào link để mở
const linkClick = EditorView.domEventHandlers({
  mousedown(e) {
    if (!(e.metaKey || e.ctrlKey)) return false;
    const el = e.target.closest?.("[data-href]");
    if (!el) return false;
    e.preventDefault();
    window.open(el.dataset.href, "_blank", "noopener");
    return true;
  },
});

export const livePreview = [livePreviewField, linkClick];
