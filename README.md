# Học từ vựng TOPIK (web app tĩnh)

Chạy thử trên máy (cần server vì trang dùng `fetch`):

    python3 -m http.server 8000
    # mở http://localhost:8000

Cập nhật dữ liệu từ file Excel (mỗi sheet = 1 cấp độ):

    python3 tools/xlsx_to_json.py file1.xlsx file2.xlsx

Cấu trúc: `index.html` (khung) · `style.css` (giao diện) · `app.js` (logic) · `data/words.json` (từ vựng).
Bảo mật: không có khóa bí mật trong dự án; dữ liệu hiển thị bằng `textContent`; có CSP trong `index.html`.
