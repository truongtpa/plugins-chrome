# LearnVocab – Học từ vựng đa ngôn ngữ

Chrome extension (Manifest V3) dạng **full page**: bấm icon extension là mở (hoặc chuyển tới) tab LearnVocab.

## Tính năng

- **Học theo từng ngôn ngữ** – nút ngôn ngữ trên thanh bên mở danh sách để chọn ngôn ngữ đang học; mọi màn hình
  (thêm từ, lịch, tìm kiếm, ôn tập, thống kê) chỉ hiện từ của ngôn ngữ đó. Chọn *Tất cả ngôn ngữ* để xem chung.
- **Thêm từ** – ngôn ngữ, từ, loại từ, phiên âm, nghĩa, ví dụ (mỗi dòng một câu), link, tags, ghi chú.
  Cảnh báo khi từ đã có trong sổ. `Ctrl/⌘ + Enter` để lưu.
- **Tự điền AI – dùng AI nào cũng được** – nhập từ rồi bấm *Tự điền AI* (hoặc `Alt + Enter`): tự lấy phiên âm,
  loại từ, nghĩa, ví dụ, ghi chú, tags. Chỉ điền vào ô còn trống. Chọn nhà cung cấp trong *Cài đặt*:
  OpenAI, Anthropic (Claude), Google Gemini, OpenRouter, Groq, DeepSeek, Mistral, xAI, Ollama (chạy trên máy),
  hoặc **Tuỳ chỉnh** — nhập Base URL, kiểu API (tương thích OpenAI hoặc Anthropic), key, model bất kỳ.
  Mỗi nhà cung cấp nhớ key/model riêng. Với host tuỳ chỉnh, Chrome sẽ hỏi cấp quyền truy cập lần đầu.
- **Lịch học** – xem theo Ngày / Tuần / Tháng, heatmap 20 tuần, chuỗi ngày học, mục tiêu mỗi ngày.
  Nút *Ôn các từ này* để ôn đúng các từ của ngày/tuần/tháng đang xem.
- **Tìm kiếm** – tìm trong từ, nghĩa, ví dụ, ghi chú, tags (không phân biệt dấu: `buom` tìm ra *bướm*);
  lọc theo ngôn ngữ, loại từ, mức độ; sắp xếp.
- **Ôn tập flashcard** – lật thẻ 3D, lặp lại ngắt quãng (SM-2 rút gọn): Quên / Khó / Nhớ / Dễ.
  Bộ thẻ: đến hạn, hôm nay, tuần này, hay quên, tất cả. Chiều Từ → Nghĩa, Nghĩa → Từ hoặc trộn.
  Tuỳ chọn gõ đáp án trước khi lật. Phát âm bằng giọng đọc của trình duyệt.
  Phím tắt: `Space` lật, `1–4` đánh giá, `S` phát âm.
- **Các thời tiếng Anh** (chỉ hiện khi đang học tiếng Anh hoặc *Tất cả*) – bảng 3 mốc thời gian × 4 dạng
  (đơn, tiếp diễn, hoàn thành, hoàn thành tiếp diễn).
  - *Chọn thời nào?* – trả lời 2 câu (xảy ra khi nào, muốn nhấn mạnh gì) để biết dùng thời nào, kèm trục thời gian
    minh hoạ và mẹo phân biệt các cặp hay nhầm.
  - *Bảng* – gõ động từ bất kỳ (kể cả bất quy tắc, cụm động từ như *give up*) để bảng tự chia; đổi chủ ngữ và dạng
    câu khẳng định / phủ định / nghi vấn; bấm một ô để xem công thức, cách dùng, dấu hiệu, ví dụ.
  - *Luyện tập* – ra đề ngẫu nhiên (ưu tiên động từ trong sổ từ tiếng Anh) và chấm câu bạn gõ, chấp nhận dạng viết tắt.
- **Dữ liệu** – lưu trong `chrome.storage.local`; xuất/nhập JSON, xuất CSV.

Phím tắt chung: `n` thêm từ, `/` tìm kiếm.

## Cài đặt

1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `LearnVoCab`.
3. Bấm icon LearnVocab trên thanh công cụ.

## File

| File | Vai trò |
| --- | --- |
| `manifest.json` | Khai báo extension, quyền `storage`, host của các nhà cung cấp AI (host tuỳ chỉnh xin quyền khi dùng) |
| `background.js` | Mở / focus tab `app.html` khi bấm icon |
| `app.html`, `app.css`, `app.js` | Toàn bộ giao diện và logic |
