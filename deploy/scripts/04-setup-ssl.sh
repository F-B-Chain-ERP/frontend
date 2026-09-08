#!/bin/bash
# ==============================================================================
# Script Cài đặt SSL Let's Encrypt cho ERP-UTT (Không cần đăng ký Email)
# Domain: erp-utt.duckdns.org
# Chạy trên Server VPS Ubuntu 24.04: sudo bash 04-setup-ssl.sh
# ==============================================================================

set -e

DOMAIN="erp-utt.duckdns.org"

echo "========================================================"
echo " [BƯỚC 1/4] Cập nhật gói & Cài đặt Certbot"
echo "========================================================"
apt update
apt install -y certbot python3-certbot-nginx

echo ""
echo "========================================================"
echo " [BƯỚC 2/4] Đảm bảo thư mục ACME Challenge tồn tại"
echo "========================================================"
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

echo ""
echo "========================================================"
echo " [BƯỚC 3/4] Cấp phát chứng chỉ SSL Let's Encrypt cho $DOMAIN"
echo " (Sử dụng cờ --register-unsafely-without-email, không cần email)"
echo "========================================================"

# Để tránh lỗi 'BIO_new_file failed' khi Nginx tải cert chưa tồn tại,
# tạm dừng Nginx 5 giây để Certbot Standalone lấy chứng chỉ gốc Let's Encrypt
systemctl stop nginx || true

certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --pre-hook "systemctl stop nginx" \
  --post-hook "systemctl start nginx"

# Khởi động lại Nginx với chứng chỉ SSL chính thức vừa lấy
systemctl start nginx

echo ""
echo "========================================================"
echo " [BƯỚC 4/4] Kiểm tra hệ thống tự động gia hạn (Auto-renewal)"
echo "========================================================"
# Đảm bảo deploy-hook reload Nginx khi gia hạn thành công
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat << 'EOF' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Kiểm tra systemd timer cho certbot
systemctl enable --now certbot.timer || true

# Chạy thử nghiệm gia hạn giả lập (dry-run)
echo "Kiểm tra gia hạn thử nghiệm (dry-run)..."
certbot renew --dry-run

echo ""
echo "========================================================"
echo "✅ HOÀN TẤT CẤP CHỨNG CHỈ SSL LET'S ENCRYPT CHO $DOMAIN!"
echo " Chứng chỉ được lưu tại:"
echo " - Fullchain: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo " - Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "========================================================"
