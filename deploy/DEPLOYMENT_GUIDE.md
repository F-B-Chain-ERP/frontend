# Hướng dẫn Triển khai Frontend & Toàn Hệ thống ERP UTT (Local → Server)

Server triển khai: **Ubuntu 24.04 LTS** (IP: `163.61.72.183`, Hostname: `vm08181524.bnixvps.io.vn`)

---

## 1. Kiến trúc Hệ thống & Luồng Dữ liệu (Request Flow)

```
                            [NGƯỜI DÙNG / TRÌNH DUYỆT]
                                         │
                                         │ HTTP Port 80 (hoặc 443 sau này)
                                         ▼
                 ┌──────────────────────────────────────────────────┐
                 │          NGINX REVERSE PROXY (Port 80)           │
                 │          - Gzip nén dữ liệu tĩnh (60-80%)       │
                 │          - Cache static files (JS/CSS/Fonts 1y) │
                 │          - Định tuyến SPA (try_files index.html)│
                 └───────────────┬──────────────────┬───────────────┘
                                 │                  │
               [Request tĩnh]   │                  │   [Request API]
         (HTML, JS chunks, CSS)  │                  │   (/api/v1/**)
                                 ▼                  ▼
               ┌───────────────────────┐   ┌────────────────────────┐
               │    ANGULAR 21 SPA     │   │  BACKEND SERVICE       │
               │ /opt/ERP-UTT/frontend │   │  Spring Boot (Docker)  │
               │ /browser/             │   │  Port 8080             │
               └───────────────────────┘   └───────────┬────────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │                         │
                                          ▼                         ▼
                                 ┌─────────────────┐       ┌─────────────────┐
                                 │  PostgreSQL 16  │       │     Redis 7     │
                                 │  Port 5432      │       │  Port 6379      │
                                 │  (Docker)       │       │  (Rate Limiting)│
                                 └─────────────────┘       └─────────────────┘
```

---

## 2. Cấu trúc Triển khai trên Server

Thư mục trên Server: `/opt/ERP-UTT/frontend`
```
/opt/ERP-UTT/frontend/
├── browser/                       # Mã nguồn tĩnh Angular sau khi build
│   ├── index.html
│   ├── styles.css
│   ├── main.js
│   ├── chunk-*.js
│   └── assets/
└── deploy/
    ├── DEPLOYMENT_GUIDE.md        # Hướng dẫn này
    ├── nginx/
    │   └── erp-utt.conf           # File cấu hình Nginx site
    └── scripts/
        ├── 01-build-transfer.ps1  # Chạy trên Windows Local: Build & SCP lên server
        ├── 01-build-transfer.sh   # Chạy trên Linux/Mac Local: Build & SCP lên server
        ├── 02-setup-nginx.sh      # Chạy trên Server: Cài Nginx & cấu hình site
        └── 03-check-status.sh     # Chạy trên Server: Kiểm tra sức khỏe hệ thống
```

---

## 3. Quy trình Triển khai Frontend 3 Bước

```
[MÁY DEV LOCAL (Windows / Linux)]              [SERVER: 163.61.72.183]
───────────────────────────────────────        ───────────────────────────────────────
Bước 1: Build & Truyền mã nguồn lên Server
  .\frontend\deploy\scripts\01-build-transfer.ps1
  (hoặc bash 01-build-transfer.sh)
                                              Bước 2: Cài đặt & Cấu hình Nginx
                                                SSH vào server và chạy:
                                                sudo bash /opt/ERP-UTT/frontend/deploy/scripts/02-setup-nginx.sh

                                              Bước 3: Kiểm tra hệ thống toàn diện
                                                bash /opt/ERP-UTT/frontend/deploy/scripts/03-check-status.sh
```

---

### Chi tiết các bước thực hiện:

### Bước 1: Build & Chuyển file lên Server (Từ Local)

**Trên Windows PowerShell (từ thư mục gốc ERP-UTT):**
```powershell
.\frontend\deploy\scripts\01-build-transfer.ps1
```

*(Tuỳ chọn: Nếu muốn build theo môi trường development, thêm tham số `-Config "development"`)*

**Trên Linux / macOS / Git Bash:**
```bash
bash frontend/deploy/scripts/01-build-transfer.sh 163.61.72.183 root production
```

Script sẽ tự động:
1. Chạy `npm run build:prod` để tối ưu hóa code Angular thành các file tĩnh.
2. Đóng gói file nén `frontend-dist.tar.gz`.
3. Chuyển file nén và các script cấu hình sang server qua SSH.
4. Tự động giải nén vào thư mục `/opt/ERP-UTT/frontend/browser/`.

---

### Bước 2: Cài đặt & Khởi chạy Nginx trên Server

SSH vào Server:
```bash
ssh root@163.61.72.183
```

Chạy script cài đặt và kích hoạt Nginx:
```bash
sudo bash /opt/ERP-UTT/frontend/deploy/scripts/02-setup-nginx.sh
```

Script này sẽ:
- Tự động cài đặt `nginx` nếu chưa có.
- Mở cổng 80 (HTTP) và 443 (HTTPS) trên firewall UFW.
- Thiết lập phân quyền thư mục cho user `www-data`.
- Áp dụng cấu hình Nginx site `/etc/nginx/sites-available/erp-utt` (kèm Gzip, Caching, SPA Fallback, Reverse Proxy `/api/`).
- Kiểm tra tính hợp lệ của cấu hình (`nginx -t`) và reload dịch vụ Nginx.

---

### Bước 3: Kiểm thử Hệ thống

Chạy script kiểm tra tự động trên server:
```bash
bash /opt/ERP-UTT/frontend/deploy/scripts/03-check-status.sh
```

Hoặc kiểm tra thủ công từ trình duyệt và terminal:
1. **Truy cập Giao diện Web:** Mở trình duyệt và truy cập `http://163.61.72.183/`
2. **Kiểm tra SPA Routing:** Tải lại trang tại đường dẫn `http://163.61.72.183/login` hoặc `http://163.61.72.183/home` (xác nhận không bị lỗi 404).
3. **Đăng nhập:** Đăng nhập với tài khoản `admin` / `123456789`.
4. **Kiểm tra API qua Nginx Proxy:**
```bash
curl -X POST http://163.61.72.183/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"usernameOrEmail":"admin","password":"123456789"}'
```

---

## 4. Các Lệnh Quản trị & Vận hành Thường dùng

### Quản trị Nginx:
```bash
# Kiểm tra trạng thái Nginx
systemctl status nginx

# Kiểm tra cú pháp cấu hình Nginx sau khi sửa đổi
nginx -t

# Khởi động lại Nginx
systemctl restart nginx

# Xem log truy cập Nginx realtime
tail -f /var/log/nginx/access.log

# Xem log lỗi Nginx realtime
tail -f /var/log/nginx/error.log
```

### Cập nhật Frontend khi có Code mới:
Mỗi khi có cập nhật mới ở frontend, chỉ cần chạy lại từ máy local:
```powershell
.\frontend\deploy\scripts\01-build-transfer.ps1
```
*(Nginx tự động phục vụ file mới mà không cần restart server)*

---

## 5. Tối ưu Chịu tải Cao (High Load & Performance Tuning)

Hệ thống được cấu hình sẵn các cơ chế tối ưu hiệu năng:

1. **Nginx Static File Caching:**
   - Các file bundle (JS/CSS/Fonts) được Angular tự động gắn mã băm (content hash, ví dụ `chunk-CFWC5MMN.js`). Nginx thiết lập header `Cache-Control: public, immutable` với thời hạn `expires 1y`, giúp trình duyệt không cần tải lại file tĩnh trong các lần truy cập tiếp theo.
2. **Gzip On-the-fly Compression:**
   - Nén toàn bộ dữ liệu phản hồi (JS, CSS, JSON, SVG) từ level 6, giảm 60% – 80% dung lượng băng thông mạng.
3. **API Proxy Streaming & Buffering:**
   - Kết nối giữa Nginx và Spring Boot `:8080` sử dụng HTTP/1.1 loopback nội bộ (`127.0.0.1`), loại bỏ độ trễ mạng ngoại vi.
4. **Bảo vệ Hệ thống với Rate Limiting:**
   - Tầng Backend đã tích hợp Redis Bucket4j Rate Limiter:
     - Khách vãng lai (Anonymous): Giới hạn 20 request / 60 giây.
     - Người dùng đã đăng nhập (Authenticated): Giới hạn 100 request / 60 giây.

---

## 6. Xử lý Sự cố Thường gặp (Troubleshooting)

### 1. Lỗi `404 Not Found` khi F5 (Reload) trang con
- **Nguyên nhân:** Nginx chưa được cấu hình SPA routing fallback.
- **Khắc phục:** Đảm bảo trong khối `location /` của `/etc/nginx/sites-available/erp-utt` có dòng `try_files $uri $uri/ /index.html;`, sau đó chạy `nginx -t && systemctl reload nginx`.

### 2. Lỗi `502 Bad Gateway` khi gọi API
- **Nguyên nhân:** Backend Service (Spring Boot) chưa khởi động hoặc container bị dừng.
- **Khắc phục:**
  ```bash
  # Kiểm tra container backend
  docker ps -a | grep erp-backend
  # Xem log lỗi backend
  docker logs -f erp-backend
  # Khởi động lại backend
  docker compose -f /opt/ERP-UTT/backend-service/src/main/docker/app.yml restart backend-service
  ```

### 3. Lỗi `403 Forbidden` khi truy cập website
- **Nguyên nhân:** Phân quyền thư mục `/opt/ERP-UTT/frontend/browser` chưa đúng.
- **Khắc phục:**
  ```bash
  sudo chown -R www-data:www-data /opt/ERP-UTT/frontend/browser
  sudo chmod -R 755 /opt/ERP-UTT/frontend/browser
  ```

---

## 7. Kế hoạch Giai đoạn Sau (Phase 2 Roadmap)

- **Cấu hình SSL/TLS (HTTPS):** Sử dụng `certbot` để kích hoạt chứng chỉ miễn phí Let's Encrypt cho tên miền `vm08181524.bnixvps.io.vn` (hoặc tên miền chính thức của UTT).
- **Tự động hóa CI/CD:** Thiết lập GitHub Actions / Gitea Actions để tự động build và deploy khi merge code vào nhánh `main`.
