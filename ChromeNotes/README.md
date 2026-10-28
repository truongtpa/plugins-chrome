# Chrome Notes – Ghi chú Markdown nhiều tab

Tiện ích Chrome ghi chú Markdown **hiển thị trực tiếp khi gõ** (live preview kiểu Obsidian), khung giao diện kiểu VS Code, chia thành nhiều tab. Tự động lưu vào `chrome.storage.local`.

## Cài đặt
1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked** → chọn thư mục `ChromeNotes`.
3. Ghim biểu tượng lên thanh công cụ.

## Tính năng
- **Live preview**: gõ `## Tiêu đề`, `**đậm**`, `[link](url)`, `$x^2$`… là hiện định dạng ngay; ký hiệu Markdown chỉ hiện lại ở chỗ con trỏ đang đứng để sửa.
- **Công thức LaTeX** với KaTeX: `$...$` (trong dòng) và `$$...$$` (khối).
- **Checklist** `- [ ]`: bấm thẳng vào ô vuông để đánh dấu xong.
- Bảng, code block, trích dẫn, đường kẻ, ảnh; ⌘/Ctrl + click để mở link.
- Enter tự nối danh sách / checklist / trích dẫn; Enter ở dòng trống để thoát.
- Dán URL khi đang chọn chữ → tự tạo link `[chữ](url)`.
- **Xem mã nguồn** (Ctrl+/) khi muốn sửa Markdown thô.
- Mỗi tab có lịch sử hoàn tác riêng; tìm kiếm trong ghi chú bằng Ctrl+F.
- Nhiều tab: thêm, đóng, đổi tên (nhấp đúp / F2), kéo thả để sắp xếp.
- Xuất tab ra `.md`, sao lưu/nhập toàn bộ `.json`, nhập file `.md` (hoặc kéo thả file vào cửa sổ).
- Mở toàn trang (panel nổi) hoặc trong Side Panel; đồng bộ trực tiếp giữa các cửa sổ.
- Giao diện sáng/tối theo hệ điều hành.

## Phím tắt (Ctrl trên Windows/Linux = ⌘ trên macOS)
| Phím | Chức năng |
|---|---|
| Ctrl+B / Ctrl+I | In đậm / in nghiêng |
| Ctrl+E | Code trong dòng |
| Ctrl+Shift+X | Gạch ngang |
| Ctrl+K | Chèn link |
| Tab / Shift+Tab | Thụt / lùi dòng |
| Ctrl+F | Tìm / thay thế |
| Ctrl+/ | Xem mã nguồn ↔ live preview |
| Alt+Z | Tự xuống dòng |
| Alt+N / Alt+W | Tab mới / đóng tab |
| Alt+← / Alt+→, Alt+1…9 | Chuyển tab |
| F2 | Đổi tên tab |

## Phát triển
Editor dùng [CodeMirror 6](https://codemirror.net), mã nguồn ở `editor-src/` (live preview: `editor-src/src/live.js`).
Sau khi sửa, build lại `lib/editor.bundle.js`:

```bash
cd editor-src && npm install && npm run build
```

## Thư viện kèm theo (`lib/`)
- [CodeMirror 6](https://codemirror.net) — MIT (đóng gói trong `editor.bundle.js`)
- [marked](https://github.com/markedjs/marked) 12.0.2 — MIT
- [DOMPurify](https://github.com/cure53/DOMPurify) 3.1.6 — Apache-2.0 / MPL-2.0
- [KaTeX](https://katex.org) 0.16.11 — MIT
