# Bài Tập Lớn Thực Tập Sinh - File Sharing Application (Fullstack)

Đây là ứng dụng Fullstack chia sẻ file an toàn, được phát triển dựa trên hệ sinh thái Cloudflare.

## 🏗 Kiến trúc tổng quan
Hệ thống sử dụng kiến trúc hoàn toàn Serverless/Edge trên nền tảng Cloudflare:
- **Frontend**: Next.js 16 + Tailwind CSS v4, được biên dịch bằng OpenNext (`@opennextjs/cloudflare`) và deploy dưới dạng Cloudflare Workers (kết hợp Workers Assets để phục vụ file tĩnh).
- **Backend**: Hono framework chạy trên Cloudflare Workers, cung cấp API RESTful siêu tốc với độ trễ gần như bằng 0 khi giao tiếp với Frontend cùng mạng Edge.
- **Database**: Cloudflare D1 (SQLite) lưu trữ metadata (thông tin file, token, lượt tải, thời gian hết hạn).
- **Storage**: Cloudflare R2 lưu trữ file vật lý (Object Storage). Toàn bộ file ở trạng thái Private, chỉ có thể tải xuống thông qua Backend (đóng vai trò Proxy kiểm duyệt).

## 🛠 Database / Schema Setup
Hệ thống sử dụng Cloudflare D1. File schema SQL được đặt tại `backend/schema.sql`.
Khởi tạo Database ở local để test:
```bash
cd backend
npx wrangler d1 execute file-db --local --file=./schema.sql
```

## 🚀 Hướng dẫn chạy dự án ở môi trường Local
### 1. Backend (Chạy trước)
```bash
cd backend
npm install
npm run dev   # Chạy Hono server tại http://localhost:8787
```

### 2. Frontend (Môi trường Dev và Preview Production)
**Chạy Dev (Node.js runtime):**
```bash
cd frontend
npm install
npm run dev   # Chạy Next.js dev server tại http://localhost:3000
```
**Chạy giả lập Production (Edge Runtime):**
Để tránh lỗi không tương thích thư viện Node.js khi lên Production, dự án hỗ trợ chạy giả lập bằng OpenNext:
```bash
cd frontend
npm run build && npx @opennextjs/cloudflare build
npx @opennextjs/cloudflare preview
```

## 🌍 Cách Deploy lên Cloudflare
**BƯỚC 1: Deploy Backend**
```bash
cd backend
npm run deploy
```
*Lưu ý: Bạn cần tạo D1, R2 trên Cloudflare Dashboard và cập nhật `database_id` vào `wrangler.jsonc` trước khi deploy.*

**BƯỚC 2: Cập nhật biến môi trường cho Frontend**
Copy URL của Backend vừa deploy xong (ví dụ: `https://backend.username.workers.dev`) và dán vào file `frontend/.env`:
`NEXT_PUBLIC_API_URL=https://backend.username.workers.dev/api`

**BƯỚC 3: Deploy Frontend**
```bash
cd frontend
npm run deploy
```

## 🎯 Các quyết định kỹ thuật quan trọng
1. **Dùng OpenNext thay vì `@cloudflare/next-on-pages`**: Tận dụng tối đa sức mạnh của Cloudflare Workers, tương thích Next.js hoàn hảo hơn (hỗ trợ Middleware, ISR) và phản ánh đúng xu hướng gộp chung Workers Assets của Cloudflare.
2. **Atomic Update trên SQLite (D1)**: Gộp chung logic kiểm tra (Hết hạn? Đủ lượt?) và cập nhật số lượt tải vào duy nhất 1 câu SQL `UPDATE ... RETURNING`. Ngăn chặn triệt để lỗi Race Condition mà không cần thiết lập Transaction cồng kềnh.
3. **Manual Rollback khi Upload**: Nếu ghi file lên R2 thành công nhưng lưu vào D1 thất bại, `try/catch` sẽ bắt lỗi và gọi lệnh xóa file R2 ngay lập tức, ưu tiên sự sống còn của tiến trình.
4. **Luồng tải qua Proxy**: Tránh lộ public R2 URL. Backend trực tiếp `env.FILE_BUCKET.get()` lấy `ReadableStream` và truyền thẳng tới Frontend thông qua cơ chế Streaming. Giữ mức sử dụng RAM luôn là O(1) bất kể kích thước file, tránh sập Server (OOM).

## ⚠️ Các Limitation hiện tại
- **Rác dữ liệu khi gián đoạn**: Nếu Server sập ngang lúc đang Rollback R2 (vì insert D1 lỗi), file rác vẫn kẹt lại R2 vĩnh viễn. 
- **Thiếu Self-healing**: Khi tải file, nếu D1 còn thông tin nhưng R2 mất file, hệ thống văng lỗi 404 an toàn nhưng chưa tự động xóa rác ở D1.
- **Chưa có tính năng upload file lớn**: Với các file rất lớn (nhiều GB), cần nâng cấp lên tính năng Multipart Upload

---

## Trả lời các câu hỏi phỏng vấn (Review Questions)

**1. Tại sao metadata được lưu trong D1 và file được lưu trong R2?**

Hai công nghệ này được sinh ra với mục đích sử dụng hoàn toàn khác nhau:
- **D1 (SQLite)** là cơ sở dữ liệu quan hệ, được tối ưu cho việc truy vấn dữ liệu có cấu trúc. Rất hoàn hảo để lưu thông tin metadata như tên file, size, token, số lượt tải... cho phép tra cứu nhanh. Tuy nhiên, nó không phù hợp để lưu các khối dữ liệu nhị phân khổng lồ (BLOB). Và thường cũng không nên lưu BLOB vào DB như vậy vì sẽ làm phình DB rất nhiều và gây ra nhiều bất lợi khác như backup chậm, restore chậm,...
- **R2 (Object Storage)** là dịch vụ lưu trữ đối tượng tương tự S3, vốn sinh ra để chứa các file tĩnh kích thước lớn với chi phí cực thấp, băng thông cao và hỗ trợ truyền tải dạng luồng (Streaming). Mà những gì chuyên sinh ra để làm việc gì thì thường rất tối ưu cho việc đó.
Object Storage có nhiều tính năng tốt như tận dụng CDN, scale dễ, thêm dung lượng và băng thông dễ, chi phí tốt,...
Việc tách riêng Metadata ở D1 và File vật lý ở R2 giúp tận dụng được thế mạnh cốt lõi của từng hệ thống, tạo ra một kiến trúc hiệu suất cao và chi phí tối ưu.

**2. Concurrency problem của download_count là gì và implementation hiện tại xử lý như thế nào?**

- **Vấn đề Concurrency (Race Condition)**: Khi một link chỉ còn 1 lượt tải (max_downloads = 5, download_count = 4) nhưng có 2 người click vào link cùng một khoảnh khắc. Nếu Backend xử lý theo luồng thông thường: đọc dữ liệu từ DB (cả 2 đều thấy count=4) -> kiểm tra điều kiện (cả 2 đều thỏa mãn) -> tăng count lên 1 (cả 2 cùng gán count=5) rồi trả file. Kết quả là file bị tải 2 lần, vi phạm quy tắc.
- **Cách hệ thống hiện tại xử lý**: Hệ thống sử dụng sức mạnh của SQL thông qua **Atomic Update**. Backend thực thi trực tiếp câu lệnh:
  `UPDATE shares SET download_count = download_count + 1 WHERE share_token = ? AND download_count < max_downloads RETURNING ...`
  SQLite sẽ đảm bảo tính tuần tự (ACID) cho phép cập nhật này. Chỉ request nào lọt vào trước mới update được và nhận về dữ liệu, request đến sau (dù chỉ 1 mili-giây) sẽ bị chặn lại vì điều kiện `download_count < max_downloads` không còn đúng nữa, từ đó từ chối trả về file một cách an toàn, chính xác.

**3. Nếu R2 thành công nhưng D1 thất bại, hệ thống xử lý như thế nào?**

Trường hợp này sẽ sinh ra rác: File vật lý tồn tại trên Cloud (tốn tiền lưu trữ) nhưng không có bản ghi Metadata nào quản lý nó. 
- **Xử lý (Rollback)**: Luồng upload được đặt trong khối `try/catch`. Khi upload lên R2 hoàn tất, code tiếp tục gọi lệnh `INSERT` vào D1. Nếu thao tác `INSERT` này bị lỗi (do mạng, do timeout, hay lỗi schema), luồng xử lý sẽ nhảy vào `catch`.
- Tại đây, hệ thống gọi lệnh `await c.env.FILE_BUCKET.delete(objectKey)` để chủ động xóa bỏ ngay file vừa upload trên R2. Thao tác Rollback này giúp đảm bảo tính nhất quán dữ liệu, không để lại file rác trên hệ thống.

**4. Nếu có thêm hai ngày phát triển, ba việc quan trọng nhất bạn muốn cải thiện là gì? Tại sao?**

1. **Cơ chế dọn rác tự động (Automated Garbage Collection)**: 
   - *Tại sao*: Hiện tại, khi một file hết hạn hoặc hết lượt tải, nó chỉ bị chặn truy cập ở mức logic nhưng vẫn nằm chiếm dung lượng vật lý trên R2 Bucket (tốn chi phí lưu trữ). Nên thiết lập Cron Job để chạy ngầm định kỳ, quét D1 và dọn dẹp sạch sẽ các file R2 đã quá hạn.
2. **Thêm Upload Progress Bar thực (Realtime)**:
   - *Tại sao*: Trải nghiệm người dùng sẽ khá "mù mờ" nếu chỉ hiển thị một biểu tượng xoay (spinner) khi upload các file có dung lượng trung bình/lớn. Việc bắt sự kiện tiến trình tải lên (upload progress) và hiển thị thanh % sẽ mang lại trải nghiệm chuyên nghiệp tốt hơn cho người dùng.
3. **Preview file trực tiếp (In-browser Preview)**:
   - *Tại sao*: Hiện tại mọi file đều bị ép tải xuống. Nếu người dùng chỉ chia sẻ ảnh (JPG, PNG) hoặc PDF, việc có thể xem lướt qua trực tiếp trên trình duyệt để xác nhận đúng file trước khi tải sẽ tiện hơn rất nhiều. Việc này chỉ đòi hỏi tinh chỉnh lại HTTP Headers lúc trả về và thêm một chút UI ở Frontend, tốn ít thời gian nhưng nâng tầm UX lên rất nhiều.

**5. Đánh giá Trade-off trong xử lý Data Consistency giữa D1 và R2**

Hệ thống chọn cách tiếp cận thực dụng nhằm tránh lỗi sập hệ thống khiến người dùng hoang mang, chấp nhận một số đánh đổi nhỏ về tính toàn vẹn:
- **Trường hợp 1 (Upload R2 thành công, Insert D1 lỗi)**: Sử dụng`try/catch` bắt lỗi để gọi lệnh await env.FILE_BUCKET.delete(objectKey) ngay lập tức. 
  - *Đánh giá*: Rất đơn giản và hiệu quả, bao phủ 99% lỗi thông thường. 
  - *Trade-off*: Nếu server sập hoặc mất điện đột ngột ngay khoảnh khắc chưa kịp gọi lệnh xóa, sẽ để lại file rác trên R2. Tuy nhiên hệ thống không bị treo hay kẹt trạng thái.

- **Trường hợp 2 (D1 còn metadata, nhưng file R2 đã mất)**: Trong luồng tải file, luôn check `if (!object)` từ R2 rồi mới thao tác, nếu không có thì trả về `File data is missing` với statuscode 404 một cách an toàn.
  - *Đánh giá*: Rào chắn cực kỳ quan trọng để ngăn chặn lỗi `Null Reference` làm sập toàn bộ request và văng lỗi 500 (Internal Server Error).
  - *Trade-off*: Vẫn còn bản ghi trong D1. 

Tóm lại, kiến trúc này đặt **Sự sống còn của tiến trình (Resilience)** lên trên tính an toàn tuyệt đối. Mọi nhược điểm tồn đọng (Rác R2, rác D1) đều có thể được quét sạch hoàn toàn bởi **Cơ chế Cron Job dọn rác** (đã đề xuất ở câu 4) mà không cần làm phức tạp hóa luồng code chính.
