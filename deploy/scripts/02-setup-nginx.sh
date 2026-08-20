#!/usr/bin/env bash
# ==============================================================================
# BƯỚC 3 (Server): Cài đặt Nginx, thiết lập Reverse Proxy và phục vụ Frontend
# Chạy trực tiếp trên Server: ssh root@163.61.72.183
# Lệnh chạy: sudo bash /opt/ERP-UTT/frontend/deploy/scripts/02-setup-nginx.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "  [FRONTEND] THIẾT LẬP NGINX & REVERSE PROXY TRÊN SERVER"
echo "=========================================================="

# 1. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo "[!] Vui lòng chạy script với quyền root hoặc sudo: sudo bash $0"
  exit 1
fi

FRONTEND_DIR="/opt/ERP-UTT/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NGINX_CONF_SOURCE="$SCRIPT_DIR/deploy/nginx/erp-utt.conf"
if [ ! -f "$NGINX_CONF_SOURCE" ]; then
    NGINX_CONF_SOURCE="$FRONTEND_DIR/deploy/nginx/erp-utt.conf"
fi
NGINX_CONF_DEST="/etc/nginx/sites-available/erp-utt"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled/erp-utt"

# 2. Cài đặt Nginx nếu chưa có
if ! command -v nginx &> /dev/null; then
    echo "▶ 1. Cài đặt Nginx..."
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
else
    echo "▶ 1. Nginx đã được cài đặt sẵn."
fi

# 3. Mở cổng Firewall 80 & 443 nếu UFW đang bật
if command -v ufw &> /dev/null; then
    echo "▶ 2. Đảm bảo cổng Firewall 80 (HTTP) và 443 (HTTPS) được mở..."
    ufw allow 80/tcp comment 'Nginx HTTP' || true
    ufw allow 443/tcp comment 'Nginx HTTPS' || true
fi

# 4. Phân quyền thư mục web tĩnh
echo "▶ 3. Phân quyền thư mục frontend..."
mkdir -p "$FRONTEND_DIR/browser"
chmod -R 755 "$FRONTEND_DIR/browser"
# Đảm bảo Nginx (user www-data) có quyền đọc
chown -R www-data:www-data "$FRONTEND_DIR/browser" || true

# 5. Cấu hình Nginx Site
echo "▶ 4. Cài đặt file cấu hình Nginx..."
if [ -f "$NGINX_CONF_SOURCE" ]; then
    cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST"
else
    echo "[!] Không tìm thấy $NGINX_CONF_SOURCE, tạo cấu hình mặc định..."
    cat <<'EOF' > "$NGINX_CONF_DEST"
server {
    listen 80;
    listen [::]:80;
    server_name 163.61.72.183 vm08181524.bnixvps.io.vn localhost;

    root /opt/ERP-UTT/frontend/browser;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml image/svg+xml font/woff font/woff2;

    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|otf|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }
}
EOF
fi

# 6. Kích hoạt Site và vô hiệu hóa default site cũ
echo "▶ 5. Kích hoạt cấu hình Nginx ERP-UTT..."
rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_CONF_DEST" "$NGINX_CONF_ENABLED"

# 7. Kiểm tra cú pháp Nginx
echo "▶ 6. Kiểm tra cú pháp cấu hình Nginx..."
nginx -t

# 8. Reload / Khởi động lại Nginx
echo "▶ 7. Khởi động lại Nginx service..."
systemctl restart nginx

# 9. Kiểm tra file tĩnh Angular
if [ ! -f "$FRONTEND_DIR/browser/index.html" ]; then
    echo ""
    echo "[CẢNH BÁO] Chưa tìm thấy file index.html trong $FRONTEND_DIR/browser/ !"
    echo "  -> Nginx sẽ trả về lỗi '403 Forbidden' khi truy cập web cho đến khi bạn đưa code đã build vào thư mục này."
    echo "  -> Cách xử lý:"
    echo "     1. Nếu bạn build từ máy Local: Chạy script .\\frontend\\deploy\\scripts\\01-build-transfer.ps1"
    echo "     2. Nếu bạn có source trên VPS (ví dụ ~/frontend): Chạy:"
    echo "        cd ~/frontend && npm run build:prod"
    echo "        sudo cp -r dist/frontend/browser/* /opt/ERP-UTT/frontend/browser/ (hoặc dist/frontend/*)"
    echo "        sudo chown -R www-data:www-data /opt/ERP-UTT/frontend/browser"
fi

echo ""
echo "=========================================================="
echo "  THIẾT LẬP NGINX THÀNH CÔNG!"
echo "=========================================================="
echo "Địa chỉ truy cập hệ thống:"
echo "  - Giao diện Web (Frontend): http://163.61.72.183/"
echo "  - API Backend (qua proxy) : http://163.61.72.183/api/v1/auth/login"
echo ""
echo "Kiểm tra nhanh:"
echo "  curl -I http://localhost/"
echo "  curl -I http://localhost/home"
echo "=========================================================="
