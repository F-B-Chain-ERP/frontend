#!/usr/bin/env bash
# ==============================================================================
# Script kiểm tra toàn diện tình trạng vận hành Hệ thống ERP-UTT trên Server
# Chạy trực tiếp trên server: ssh root@163.61.72.183
# Lệnh chạy: bash /opt/ERP-UTT/frontend/deploy/scripts/03-check-status.sh
# ==============================================================================

echo "=========================================================="
echo "  🔍 KIỂM TRA TÌNH TRẠNG HỆ THỐNG ERP-UTT"
echo "  Thời gian: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="

FRONTEND_DIR="/opt/ERP-UTT/frontend"

# 1. Trạng thái Docker containers (Backend, Postgres, Redis)
echo ""
echo "▶ 1. Trạng thái Docker Containers:"
if command -v docker &> /dev/null; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
  echo "  [!] Docker không có trên máy."
fi

# 2. Trạng thái Nginx
echo ""
echo "▶ 2. Trạng thái Nginx Web Server:"
if systemctl is-active --quiet nginx; then
  echo "  ✅ Nginx đang chạy (active: running)"
else
  echo "  ❌ Nginx đang DỪNG hoặc gặp lỗi!"
  systemctl status nginx --no-pager | head -n 10
fi

# 3. Kiểm tra cổng mạng đang lắng nghe
echo ""
echo "▶ 3. Các cổng đang lắng nghe (80, 8080, 5432, 6379):"
ss -tulpn | grep -E ':(80|8080|5432|6379)\b' || true

# 4. Kiểm tra mã nguồn tĩnh Frontend
echo ""
echo "▶ 4. Kiểm tra thư mục Frontend Static Files:"
if [ -f "${FRONTEND_DIR}/browser/index.html" ]; then
  TOTAL_FILES=$(find "${FRONTEND_DIR}/browser" -type f | wc -l)
  DIR_SIZE=$(du -sh "${FRONTEND_DIR}/browser" | cut -f1)
  echo "  ✅ index.html tồn tại (${TOTAL_FILES} files, tổng dung lượng: ${DIR_SIZE})"
  if [ -f "${FRONTEND_DIR}/.last-stable-tag" ]; then
    echo "  ℹ️  Phiên bản deploy gần nhất: $(cat "${FRONTEND_DIR}/.last-stable-tag")"
  fi
else
  echo "  ❌ CHƯA TÌM THẤY file ${FRONTEND_DIR}/browser/index.html!"
fi

# 5. Kiểm tra HTTP Status Codes
echo ""
echo "▶ 5. Kiểm tra phản hồi HTTP từ Localhost:"

echo -n "  - [GET  /] Frontend Web Root  : "
HTTP_ROOT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
if [ "$HTTP_ROOT" = "200" ]; then
    echo "✅ OK ($HTTP_ROOT)"
else
    echo "❌ FAIL ($HTTP_ROOT)"
fi

echo -n "  - [GET  /home] SPA Routing    : "
HTTP_SPA=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/home)
if [ "$HTTP_SPA" = "200" ]; then
    echo "✅ OK ($HTTP_SPA - SPA Fallback hoạt động chuẩn)"
else
    echo "❌ FAIL ($HTTP_SPA)"
fi

echo -n "  - [GET  /api/v1/auth/info] API: "
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/v1/auth/login || echo "000")
if [ "$HTTP_API" = "200" ] || [ "$HTTP_API" = "405" ] || [ "$HTTP_API" = "400" ]; then
    echo "✅ OK ($HTTP_API - Nginx Reverse Proxy kết nối thành công tới Backend :8080)"
else
    echo "⚠️ HTTP Status $HTTP_API (Backend có thể chưa sẵn sàng, kiểm tra: docker logs erp-backend)"
fi

echo ""
echo "=========================================================="
echo "  HOÀN TẤT KIỂM TRA!"
echo "=========================================================="
