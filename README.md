# Hệ Thống TikTok LIVE Tương Tác: Một Niệm An Lành (Interactive Buddhist Live Stream)

Hệ thống mô phỏng đạo tràng bái Phật trực tuyến theo thời gian thực trên TikTok LIVE. Khi người xem tương tác (theo dõi, tặng quà, bình luận), hệ thống tự động sinh nhân vật Phật tử ngồi lạy trên thảm đỏ, hiển thị tên tài khoản, hiệu ứng dâng hương, hoa sen nở và mưa cánh sen.

---

## 1. Cấu Trúc Dự Án

```
e:\Buddha/
├── server.js              # Node.js backend: Express, Socket.IO, tiktok-live-connector
├── package.json           # Cấu hình dự án & dependencies
├── test/
│   └── verify.js          # Bộ test kiểm tra toàn bộ 9 chức năng hệ thống
└── public/
    ├── index.html         # Giao diện TikTok LIVE tỷ lệ 9:16 + Bảng điều khiển
    ├── style.css          # Giao diện CSS hiện đại (bảng xếp hạng, thông báo, hiệu ứng)
    └── app.js             # Three.js 3D WebGL (Tượng Phật, Phật tử, Hào quang, Particle, Âm thanh Web Audio)
```

---

## 2. Cách Khởi Chạy

### Khởi động Server:
```bash
npm start
```
Mặc định hệ thống chạy tại: `http://localhost:3000`

### Chạy Kiểm Tra Toàn Diện (Systematic Test):
```bash
npm test
```

---

## 3. Các Tính Năng Đã Hoàn Thiện

1. **Khung cảnh Chùa 3D (Three.js):**
   - Tượng Đức Phật thếp vàng ngồi đài sen (tư thế Thiền Định - Dhyana Mudra).
   - Hào quang quay chậm và toả sáng nhịp nhàng sau lưng Phật.
   - Thảm đỏ trải dài từ cửa vào đến bàn thờ, có các hàng bồ đoàn (ghế đệm).
   - Đèn lồng ấm cúng và trụ cột gỗ đồ sộ.

2. **Cơ chế Nhân vật Phật tử (Disciples Grid):**
   - Khi có người Follow hoặc gửi quà, tự động xếp vào vị trí ngồi lạy trên thảm đỏ.
   - Bảng tên (Billboard Sprite) hiển thị biệt danh của tài khoản.
   - Hoạt ảnh dập đầu bái Phật nhịp nhàng.
   - Bong bóng thoại hiển thị câu niệm Phật khi người xem bình luận.

3. **Cơ chế Quà Tặng (Gifts) & Hiệu Ứng (VFX):**
   - **Theo dõi kênh (Lễ Phật):** Tạo nhân vật mới vào quỳ lạy.
   - **1 coin (Dâng hương):** Đốt hương, khói trầm bay nghi ngút trước tượng Phật + tiếng gõ mõ.
   - **5 coin (Sen nở):** Hoa sen vàng nở rộ tỏa ánh hào quang trên bàn thờ + tiếng chuông ngân.
   - **>10 coin (Mưa cánh sen):** Hàng trăm cánh hoa sen hồng rơi từ trần chùa xuống toàn bộ đạo tràng + tiếng chuông lớn.

4. **Âm Thanh Phật Giáo (Web Audio API Synthesizer):**
   - Tích hợp sẵn tiếng Chuông Chùa ngân vang và tiếng Mõ gỗ, không cần tải thêm file mp3 bên ngoài.

5. **Bảng Điều Khiển (Control Panel):**
   - Bấm phím `H`, `Tab` hoặc icon ⚙️ ở góc trên bên phải để bật/tắt bảng điều khiển.
   - **Chế độ Giả lập (Simulation):** Bấm các nút thử nghiệm Follow, Quà 1 coin, 5 coins, 10 coins, Chat mà không cần đợi live TikTok thật.
   - **Kết nối Thật:** Điền username TikTok của kênh đang live và bấm "Kết nối".

---

## 4. Hướng Dẫn Phát Trực Tiếp Lên TikTok Bằng OBS Studio

1. Khởi động server bằng lệnh `npm start`.
2. Mở trình duyệt vào `http://localhost:3000`.
3. Mở **OBS Studio**:
   - Chọn Source: **Browser Source** (hoặc **Window Capture**).
   - URL: `http://localhost:3000`
   - Độ phân giải: `1080 x 1920` (chuẩn dọc 9:16 của TikTok) hoặc `720 x 1280`.
4. Điền Stream Key của TikTok LIVE và bấm **Start Streaming**.

