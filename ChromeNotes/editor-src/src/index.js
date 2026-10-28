// Editor CodeMirror 6 cho Chrome Notes — đóng gói thành lib/editor.bundle.js (window.LiveEditor)
import { EditorState, EditorSelection, Compartment, Annotation, Prec } from "@codemirror/state";
import { EditorView, keymap, drawSelection, placeholder, dropCursor } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentMore, indentLess } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle, indentUnit } from "@codemirror/language";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";
import { livePreview } from "./live.js";

// Màu lấy từ biến CSS trong notes.css để tự theo giao diện sáng/tối
const mdHighlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: "650", class: "tok-heading" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, class: "tok-link" },
  { tag: t.url, class: "tok-url" },
  { tag: t.monospace, class: "tok-code" },
  { tag: t.processingInstruction, class: "tok-mark" },
  { tag: t.contentSeparator, class: "tok-mark" },
  { tag: t.labelName, class: "tok-label" },
  { tag: t.quote, class: "tok-quote" },
]);

// Bọc / gỡ ký hiệu quanh vùng chọn (**, *, `, ~~)
const toggleMark = (mark) => (view) => {
  const n = mark.length;
  const tr = view.state.changeByRange(({ from, to }) => {
    const doc = view.state.doc;
    if (doc.sliceString(from - n, from) === mark && doc.sliceString(to, to + n) === mark) {
      return {
        changes: [{ from: from - n, to: from }, { from: to, to: to + n }],
        range: EditorSelection.range(from - n, to - n),
      };
    }
    return {
      changes: [{ from, insert: mark }, { from: to, insert: mark }],
      range: EditorSelection.range(from + n, to + n),
    };
  });
  view.dispatch(view.state.update(tr, { scrollIntoView: true, userEvent: "input" }));
  return true;
};

const insertLink = (url) => (view) => {
  const tr = view.state.changeByRange(({ from, to }) => {
    const text = view.state.sliceDoc(from, to) || "liên kết";
    const md = `[${text}](${url})`;
    // Có URL → con trỏ ra sau link; chưa có → con trỏ vào chỗ điền URL
    const cursor = url ? from + md.length : from + text.length + 3;
    return { changes: { from, to, insert: md }, range: EditorSelection.cursor(cursor) };
  });
  view.dispatch(view.state.update(tr, { scrollIntoView: true, userEvent: "input" }));
  return true;
};

// Dán URL khi đang chọn chữ → tạo link Markdown
const pasteLink = EditorView.domEventHandlers({
  paste(e, view) {
    const text = e.clipboardData?.getData("text/plain").trim();
    if (!text || !/^https?:\/\/\S+$/.test(text) || view.state.selection.main.empty) return false;
    e.preventDefault();
    return insertLink(text)(view);
  },
});

// Enter trên dòng trích dẫn / mục danh sách trống → thoát ra, chừa một dòng trống
// để đoạn văn tiếp theo không bị dính vào trích dẫn hay danh sách phía trên
const exitEmptyBlock = (view) => {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return false;
  const line = state.doc.lineAt(sel.head);
  if (sel.head !== line.to || line.number === 1) return false;
  const quote = /^\s*(?:>\s*)+$/.test(line.text);
  const item = /^([-*+]|\d+[.)])\s+(\[[ xX]\]\s*)?$/.test(line.text); // chỉ mục cấp ngoài cùng
  if (!quote && !item) return false;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: "\n" },
    selection: { anchor: line.from + 1 },
    userEvent: "delete",
  });
  return true;
};

const Remote = Annotation.define(); // thay đổi đến từ cửa sổ khác — không lưu lại

export function createEditor(parent, { onChange, onCursor, wrap = true, live = true, placeholderText = "" } = {}) {
  const wrapConf = new Compartment();
  const liveConf = new Compartment();
  let opts = { wrap, live };

  const extensions = () => [
    history(),
    drawSelection(),
    dropCursor(),
    indentUnit.of("  "),
    EditorState.tabSize.of(4),
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(mdHighlight),
    search({ top: true }),
    highlightSelectionMatches(),
    placeholder(placeholderText),
    pasteLink,
    Prec.highest(keymap.of([{ key: "Enter", run: exitEmptyBlock }])),
    wrapConf.of(opts.wrap ? EditorView.lineWrapping : []),
    liveConf.of(opts.live ? livePreview : []),
    keymap.of([
      { key: "Mod-b", run: toggleMark("**") },
      { key: "Mod-i", run: toggleMark("*") },
      { key: "Mod-e", run: toggleMark("`") },
      { key: "Mod-Shift-x", run: toggleMark("~~") },
      { key: "Mod-k", run: insertLink("") },
      { key: "Tab", run: indentMore, shift: indentLess },
      ...searchKeymap,
      ...historyKeymap,
      ...defaultKeymap,
    ]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged && !u.transactions.some((tr) => tr.annotation(Remote))) onChange?.(u.state.doc.toString());
      if (u.docChanged || u.selectionSet) {
        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        onCursor?.(line.number, head - line.from + 1, u.state.doc);
      }
    }),
  ];

  const view = new EditorView({ parent, state: EditorState.create({ doc: "", extensions: extensions() }) });

  // Mỗi tab giữ EditorState riêng → lịch sử hoàn tác và vị trí con trỏ không bị lẫn
  const cache = new Map();
  let currentId = null;

  const reconfigure = () =>
    view.dispatch({
      effects: [
        wrapConf.reconfigure(opts.wrap ? EditorView.lineWrapping : []),
        liveConf.reconfigure(opts.live ? livePreview : []),
      ],
    });

  return {
    view,
    load(id, text) {
      if (currentId) cache.set(currentId, view.state);
      let st = cache.get(id);
      if (!st || st.doc.toString() !== text) {
        st = EditorState.create({ doc: text, extensions: extensions(), selection: EditorSelection.cursor(text.length) });
      }
      currentId = id;
      view.setState(st);
      reconfigure();
      view.dispatch({ effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" }) });
    },
    // Cập nhật nội dung từ cửa sổ khác, giữ nguyên con trỏ
    replace(text) {
      const cur = view.state.doc.toString();
      if (cur === text) return;
      let a = 0;
      while (a < cur.length && a < text.length && cur[a] === text[a]) a++;
      let b = 0;
      while (b < cur.length - a && b < text.length - a && cur[cur.length - 1 - b] === text[text.length - 1 - b]) b++;
      view.dispatch({
        changes: { from: a, to: cur.length - b, insert: text.slice(a, text.length - b) },
        annotations: Remote.of(true),
      });
    },
    forget(id) { cache.delete(id); },
    text: () => view.state.doc.toString(),
    focus: () => view.focus(),
    setWrap(v) { opts.wrap = v; reconfigure(); },
    setLive(v) { opts.live = v; reconfigure(); },
  };
}
