# Hướng dẫn Vận hành CI/CD & Triển khai Frontend ERP-UTT

Server triển khai: **Ubuntu 24.04 LTS** (IP: `163.61.72.183`, Domain: `erp-utt.duckdns.org`)

---

## 1. Kiến trúc Hệ thống & Luồng Xử lý HTTPS (Request Flow)

```
                            [NGƯỜI DÙNG / TRÌNH DUYỆT]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼ Port 80 (HTTP)                                ▼ Port 443 (HTTPS)
      ┌─────────────────────┐                         ┌─────────────────────────────────────────┐
      │ NGINX REDIRECT      │                         │     NGINX TLS 1.3 TERMINATION           │
      │ 301 Permanent       │                         │  - SSL Let's Encrypt (Auto-renew)       │
      │ -> https://...      │                         │  - HSTS (1 năm), CSP, Security Headers  │
      └──────────┬──────────┘                         │  - Gzip nén dữ liệu tĩnh (60-80% BW)    │
                 │                                    │  - Caching 1 năm cho Hashed Chunks      │
                 └───────────────────────────────────►│  - no-cache cho index.html              │
                                                      │  - Định tuyến SPA Fallback              │
                                                      └─────────────┬─────────────────┬─────────┘
                                                                    │                 │
                                                  [Request tĩnh]   │                 │   [Request API]
                                            (HTML, JS chunks, CSS)  │                 │   (/api/v1/**)
                                                                    ▼                 ▼
                                                  ┌───────────────────────┐  ┌────────────────────────┐
                                                  │    ANGULAR 21 SPA     │  │  BACKEND SERVICE       │
                                                  │ /opt/ERP-UTT/frontend │  │  Spring Boot (Docker)  │
                                                  │ /browser/             │  │  127.0.0.1:8080        │
                                                  └───────────────────────┘  └───────────┬────────────┘
                                                                                         │
                                                                            ┌────────────┴────────────┐
                                                                            │ (Mạng nội bộ Docker)    │
                                                                            ▼                         ▼
                                                                   ┌─────────────────┐       ┌─────────────────┐
                                                                   │  PostgreSQL 16  │       │     Redis 7     │
                                                                   │  (Port 5432)    │       │  (Port 6379)    │
                                                                   │  (VPN / Lan)    │       │  (VPN / Lan)    │
                                                                   └─────────────────┘       └─────────────────┘
```

---

## 2. Cấu trúc Triển khai trên Server & Repository

### Cấu trúc Thư mục trên Server: `/opt/ERP-UTT/frontend`
```
/opt/ERP-UTT/frontend/
├── browser/                       # Mã nguồn tĩnh Angular đang phục vụ
│   ├── index.html
│   ├── styles-*.css
│   ├── main-*.js
│   ├── chunk-*.js
│   └── assets/
├── backups/                       # Các bản sao lưu tự động (tối đa 5 bản gần nhất)
│   ├── backup-sha-abc1234-20260821230000.tar.gz
│   └── backup-...
├── .last-stable-build.tar.gz      # Bản snapshot stable gần nhất dùng cho Rollback tức thì
├── .last-stable-tag               # Ghi nhận tag/commit SHA đang chạy
└── deploy/
    ├── DEPLOYMENT_GUIDE.md        # Hướng dẫn này
    ├── nginx/
    │   └── erp-utt.conf           # File cấu hình Nginx site (Port 80 redirect + 443 SSL)
    └── scripts/
        ├── deploy.sh              # Script triển khai trung tâm trên Server (Atomic + Health Check)
        ├── rollback.sh            # Script Rollback khẩn cấp tức thì (1s)
        ├── 01-build-transfer.ps1  # Script build tay trên máy Windows Dev
        ├── 01-build-transfer.sh   # Script build tay trên máy Linux/macOS Dev
        ├── 02-setup-nginx.sh      # Script cài đặt & cấu hình Nginx lần đầu
        ├── 03-check-status.sh     # Script chẩn đoán sức khỏe hệ thống
        └── 04-setup-ssl.sh        # Script cấp phát SSL Let's Encrypt (Không cần email)
```

---

## 3. Hệ thống CI/CD Tự động (GitHub Actions)

File workflow: `.github/workflows/ci-cd.yml`

```mermaid
graph LR
    A[Push vào nhánh 'dev'] --> B[Job 1: ⚡ Validate & Lint]
    B --> C[Job 2: 📦 Fast Build & Package]
    C --> D[Job 3: 🚀 SSH Deploy & Health Check]
    D --> E[Job 4: 📢 Discord Notifier]
```

### Các sự kiện kích hoạt Pipeline:
1. **Push vào nhánh `dev`**: Tự động validate, build và triển khai lên server VPS.
2. **Tạo Pull Request vào `dev`**: Chạy validate và test build (không deploy lên server).
3. **Workflow Dispatch (Bấm chạy thủ công từ GitHub UI)**:
   - Vào tab **Actions** ➔ Chọn **Frontend CI/CD Pipeline** ➔ Bấm **Run workflow**.
   - Có thể chọn: `deploy_to_server` (true/false), `build_config` (`production` / `development`), `run_lint` (true/false).

### Cấu hình Secrets trên GitHub Repository (`F-B-Chain-ERP/frontend`):
Vào **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ Đảm bảo có các Repository Secrets:

| Secret Name | Mô tả | Giá trị mẫu |
| :--- | :--- | :--- |
| `SSH_HOST` | Địa chỉ IP của VPS | `163.61.72.183` |
| `SSH_USER` | Tên người dùng SSH | `root` |
| `SSH_PRIVATE_KEY` | Khóa riêng tư SSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SSH_PORT` | Cổng SSH | `22` |
| `DISCORD_WEBHOOK` | Webhook thông báo kênh Discord | `https://discord.com/api/webhooks/...` |

---

## 4. Các Quy trình Build & Triển khai Thủ công (Manual Options)

### Cách 1: Build & Deploy một chạm từ máy Windows (PowerShell)
Mở PowerShell tại thư mục `frontend` hoặc thư mục gốc `ERP-UTT`:
```powershell
# Build production và đẩy thẳng lên Server:
.\frontend\deploy\scripts\01-build-transfer.ps1

# Chỉ build và đóng gói file nén local (không đẩy lên server):
.\frontend\deploy\scripts\01-build-transfer.ps1 -BuildOnly

# Build với cấu hình development:
.\frontend\deploy\scripts\01-build-transfer.ps1 -Config "development"
```

### Cách 2: Build & Deploy một chạm từ máy Linux / macOS / Git Bash
```bash
# Build và triển khai lên server:
bash frontend/deploy/scripts/01-build-transfer.sh 163.61.72.183 root production

# Chỉ build local:
bash frontend/deploy/scripts/01-build-transfer.sh 163.61.72.183 root production --build-only
```

### Cách 3: Chạy Triển khai trực tiếp trên Server (Khi đã có file package)
SSH vào server:
```bash
ssh root@163.61.72.183
```
Chạy script deploy:
```bash
bash /opt/ERP-UTT/frontend/deploy/scripts/deploy.sh frontend-dist-manual.tar.gz manual-v1.0
```

---

## 5. Quy trình Rollback Khẩn cấp (Instant Rollback)

Hệ thống tự động sao lưu bản build trước đó trước mỗi lần deploy mới. Nếu bản build mới gặp lỗi hoặc có sự cố ngoài dự kiến, bạn có thể rollback chỉ trong **1 giây**:

### Cách thực hiện Rollback:
SSH vào server và chạy:
```bash
sudo bash /opt/ERP-UTT/frontend/deploy/scripts/rollback.sh
```

Hoặc khôi phục về một bản backup cụ thể trong thư mục `backups/`:
```bash
sudo bash /opt/ERP-UTT/frontend/deploy/scripts/rollback.sh /opt/ERP-UTT/frontend/backups/backup-sha-abc1234-20260821230000.tar.gz
```

---

## 6. Thiết lập HTTPS & Chứng chỉ SSL Let's Encrypt (Production)

Hệ thống sử dụng chứng chỉ SSL miễn phí của **Let's Encrypt** cho domain `erp-utt.duckdns.org` và cấu hình tự động chuyển hướng mọi truy cập HTTP sang HTTPS bảo mật.

### Bước cấp phát chứng chỉ SSL trên Server (Chạy 1 lần):
SSH vào server:
```bash
ssh root@163.61.72.183
cd /opt/ERP-UTT/frontend
sudo bash deploy/scripts/04-setup-ssl.sh
```

> **Lưu ý:** Script sử dụng cờ `--register-unsafely-without-email` nên **hoàn toàn không cần nhập email**. Chứng chỉ sẽ được cấp phát ngay lập tức và lưu tại `/etc/letsencrypt/live/erp-utt.duckdns.org/`.

### Kiểm tra tính năng tự động gia hạn (Auto-renewal):
Certbot tự động gia hạn trước khi chứng chỉ hết hạn 30 ngày qua Systemd Timer:
```bash
# Kiểm tra timer tự động gia hạn đang kích hoạt
systemctl status certbot.timer

# Chạy thử nghiệm gia hạn giả lập (Dry-run)
certbot renew --dry-run
```

---

## 7. Kiểm tra & Giám sát Hệ thống (Diagnostics)

### Chạy script kiểm tra toàn diện:
```bash
bash /opt/ERP-UTT/frontend/deploy/scripts/03-check-status.sh
```

### Các lệnh quản trị thường dùng:
```bash
# Xem trạng thái Nginx
systemctl status nginx

# Kiểm tra cú pháp Nginx sau khi chỉnh sửa
nginx -t

# Reload lại Nginx không gián đoạn dịch vụ
systemctl reload nginx

# Xem log truy cập Nginx realtime
tail -f /var/log/nginx/access.log

# Xem log lỗi Nginx realtime
tail -f /var/log/nginx/error.log
```

---

## 8. Xử lý Sự cố Thường gặp (Troubleshooting)

| Vấn đề | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **`404 Not Found` khi F5 trang con (`/home`, `/login`)** | Thiếu SPA routing fallback trong Nginx | Đảm bảo khối `location /` có `try_files $uri $uri/ /index.html;`, sau đó chạy `nginx -t && systemctl reload nginx`. |
| **`403 Forbidden` khi truy cập trang web** | Phân quyền thư mục `/opt/ERP-UTT/frontend/browser` chưa đúng cho user `www-data` | Chạy: `chown -R www-data:www-data /opt/ERP-UTT/frontend/browser && chmod -R 755 /opt/ERP-UTT/frontend/browser`. |
| **`502 Bad Gateway` khi gọi API `/api/**`** | Backend Service (Spring Boot) đang khởi động hoặc container bị dừng | Chạy `docker ps` kiểm tra container `erp-backend`. Xem log: `docker logs -f erp-backend`. |
| **Trình duyệt vẫn hiển thị giao diện cũ sau khi deploy** | Trình duyệt bị cache file `index.html` cũ | Cấu hình Nginx đã thiết lập `Cache-Control: no-cache` cho `index.html`. Người dùng chỉ cần F5 một lần là nhận ngay bản mới. |
