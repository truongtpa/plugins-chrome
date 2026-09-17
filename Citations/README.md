# BibTeX Citation Maker

Chrome extension (Manifest V3) tạo và dọn dẹp trích dẫn BibTeX, kèm một kho snippet để chép nhanh. Gồm 3 tab.

## Cài đặt

1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục này.

## Tab 1 · Rút gọn BibTeX

Dán một hoặc nhiều entry BibTeX đầy đủ (ví dụ bản xuất từ Zotero), nhấn
**Rút gọn & kiểm tra**. Extension sẽ:

- phân tích cú pháp (hỗ trợ `{...}`, `"..."`, nối chuỗi `#`, ngoặc lồng nhau)
  và báo lỗi kèm vị trí nếu BibTeX hỏng;
- chỉ giữ những trường cần cho từng kiểu entry, bỏ `abstract`, `keywords`,
  `file`, `isbn`, `langid`, `urldate`… ;
- chuẩn hoá: `year` + `month` → `date`, `131-141` → `131--141`,
  `journal` → `journaltitle`, `school` → `institution`,
  `@conference` → `@inproceedings`, `@phdthesis` → `@thesis` + `type = {phdthesis}`,
  gỡ tiền tố `https://doi.org/` khỏi `doi`;
- cảnh báo khi thiếu trường bắt buộc hoặc trùng citation key.

Kết quả:

```bibtex
@inproceedings{Starling2020,
  title = {Starling: {{A Scalable Query Engine}} on {{Cloud Functions}}},
  booktitle = {Proceedings of the 2020 {{ACM SIGMOD International Conference}} on {{Management}} of {{Data}}},
  author = {Perron, Matthew and Castro Fernandez, Raul and DeWitt, David and Madden, Samuel},
  date = {2020-06-11},
  pages = {131--141},
  publisher = {ACM},
}
```

Tuỳ chọn: giữ `doi`, giữ `url`, tắt `year`→`date`, căn thẳng dấu `=`.
Phím tắt: `Ctrl`/`Cmd` + `Enter` trong ô nhập.

## Tab 2 · Từ URL

Nhập URL (hoặc bấm **Tab hiện tại**) → extension tải trang, đọc metadata
(`og:*`, `citation_*`, `<title>`, `meta[name=author]`…) và sinh entry `@online`:

```bibtex
@online{ApacheHadoop,
  author = {{Apache Software Foundation}},
  title  = {Apache Hadoop},
  year   = {2026},
  url    = {https://hadoop.apache.org/},
  note   = {Accessed: 2026-01-06}
}
```

- Tên tổ chức được bọc `{{...}}` để BibTeX không tách thành họ/tên.
- Ngày truy cập mặc định là hôm nay; đổi được sang `urldate` thay cho `note`.
- Tham số theo dõi (`utm_*`, `fbclid`, `gclid`…) bị loại khỏi URL.
- Không có ngày xuất bản thì dùng năm hiện tại và báo trong phần ghi chú.
- Các trường `key / author / title / year / url / ngày truy cập` sửa tay được,
  kết quả cập nhật ngay — hữu ích khi trang bị Cloudflare chặn hoặc thiếu metadata.

## Tab 3 · Snippet

Kho lưu các đoạn code / lệnh / mẫu văn bản hay dùng.

- Nhập **tên** + **nội dung** → **Thêm vào danh sách**. Bỏ trống tên thì
  dòng đầu tiên của nội dung được dùng làm tên.
- Mỗi mục trong danh sách có: bấm vào tên để xem/ẩn nội dung, **Chép**
  (đưa thẳng vào clipboard), **Sửa** (nạp ngược lên form), **Xoá**
  (bấm hai lần: lần đầu nút đổi thành `Xoá?` để xác nhận).
- Ô tìm kiếm lọc theo cả tên lẫn nội dung (hiện khi có từ 2 snippet trở lên).
- `Ctrl`/`Cmd` + `Enter` trong ô nội dung = lưu; phím `Tab` chèn 2 dấu cách.

Dữ liệu nằm trong `chrome.storage.local` của extension: chỉ ở máy này, không
đồng bộ lên tài khoản Google, và bị xoá nếu gỡ extension. Popup đang mở sẽ tự
cập nhật khi một cửa sổ khác thay đổi danh sách.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `manifest.json` | khai báo MV3 |
| `popup.html` / `popup.css` / `popup.js` | giao diện và luồng xử lý 3 tab |
| `bibtex.js` | parser, bộ chuẩn hoá và bộ định dạng BibTeX |
| `background.js` | service worker tải HTML của URL (popup không parse được HTML trong SW) |
