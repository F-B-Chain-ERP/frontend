#!/usr/bin/env bash
# ==============================================================================
# Script kiểm tra toàn diện tình trạng vận hành Hệ thống ERP-UTT trên Server
# Chạy trực tiếp trên server: ssh root@163.61.72.183
# Lệnh chạy: bash /opt/ERP-UTT/frontend/deploy/scripts/03-check-status.sh
# ==============================================================================

echo "=========================================================="
echo "  KIỂM TRA TÌNH TRẠNG HỆ THỐNG ERP-UTT"
echo "  Thời gian: $(date)"
echo "=========================================================="

# 1. Trạng thái Docker containers
echo ""
echo "▶ 1. Trạng thái Docker Containers (Backend, Postgres, Redis):"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Trạng thái Nginx
echo ""
echo "▶ 2. Trạng thái Nginx Web Server:"
systemctl status nginx --no-pager | head -n 8

# 3. Kiểm tra cổng mạng đang lắng nghe
echo ""
echo "▶ 3. Các cổng đang mở (80, 8080, 5432, 6379):"
ss -tulpn | grep -E ':(80|8080|5432|6379)\b' || true

# 4. Kiểm tra HTTP Status Codes
echo ""
echo "▶ 4. Kiểm tra phản hồi HTTP từ Localhost:"

echo -n "  - [GET  /] Frontend Web       : "
HTTP_ROOT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
if [ "$HTTP_ROOT" = "200" ]; then
    echo "OK ($HTTP_ROOT)"
else
    echo "FAIL ($HTTP_ROOT)"
fi

echo -n "  - [GET  /home] SPA Sub-route   : "
HTTP_SPA=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/home)
if [ "$HTTP_SPA" = "200" ]; then
    echo "OK ($HTTP_SPA - try_files SPA hoạt động chuẩn)"
else
    echo "FAIL ($HTTP_SPA)"
fi

echo -n "  - [POST /api/v1/auth/login] API: "
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1/api/v1/auth/login -H "Content-Type: application/json" -d '{"usernameOrEmail":"admin","password":"123456789"}')
if [ "$HTTP_API" = "200" ]; then
    echo "OK ($HTTP_API - Login API phản hồi thành công)"
else
    echo "HTTP Status $HTTP_API (Xem log: docker logs -f erp-backend)"
fi

echo ""
echo "=========================================================="
echo "  HOÀN TẤT KIỂM TRA!"
echo "=========================================================="
