#!/usr/bin/env bash
# ==============================================================================
# SCRIPT ROLLBACK KHẨN CẤP CHO FRONTEND (ANGULAR)
# Khôi phục tức thì về bản build stable gần nhất trên Server
#
# Cách dùng trên server:
#   sudo bash /opt/ERP-UTT/frontend/deploy/scripts/rollback.sh [backup_file_optional]
# ==============================================================================

set -eo pipefail

FRONTEND_DIR="/opt/ERP-UTT/frontend"
BROWSER_DIR="${FRONTEND_DIR}/browser"
BACKUPS_DIR="${FRONTEND_DIR}/backups"
LAST_STABLE_BACKUP="${FRONTEND_DIR}/.last-stable-build.tar.gz"
LAST_STABLE_TAG_FILE="${FRONTEND_DIR}/.last-stable-tag"

echo "=========================================================="
echo "  ⚠️  BẮT ĐẦU QUY TRÌNH ROLLBACK FRONTEND"
echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="

TARGET_BACKUP="${1}"

# Nếu không chỉ định file cụ thể, tự tìm file stable gần nhất
if [ -z "${TARGET_BACKUP}" ]; then
  if [ -f "${LAST_STABLE_BACKUP}" ]; then
    TARGET_BACKUP="${LAST_STABLE_BACKUP}"
  else
    # Tìm file backup mới nhất trong thư mục backups
    LATEST_IN_DIR=$(ls -t "${BACKUPS_DIR}"/backup-*.tar.gz 2>/dev/null | head -n 1 || true)
    if [ -n "${LATEST_IN_DIR}" ]; then
      TARGET_BACKUP="${LATEST_IN_DIR}"
    fi
  fi
fi

if [ -z "${TARGET_BACKUP}" ] || [ ! -f "${TARGET_BACKUP}" ]; then
  echo "❌ [ERROR] Không tìm thấy bản backup nào để rollback!"
  exit 1
fi

echo "▶ Khôi phục mã nguồn tĩnh từ backup: ${TARGET_BACKUP}"

# Khôi phục vào browser directory
mkdir -p "${BROWSER_DIR}"
rm -rf "${BROWSER_DIR:?}"/*
tar -xzf "${TARGET_BACKUP}" -C "${BROWSER_DIR}"

# Phân quyền chuẩn
chmod -R 755 "${BROWSER_DIR}"
chown -R www-data:www-data "${BROWSER_DIR}" 2>/dev/null || true

# Reload Nginx
echo "▶ Reload Nginx Web Server..."
systemctl reload nginx || systemctl restart nginx

# Kiểm tra lại sau khi rollback
echo "▶ Kiểm tra trạng thái sau Rollback..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
  echo "=========================================================="
  echo "  ✅ ROLLBACK THÀNH CÔNG!"
  echo "  Hệ thống Frontend đã được khôi phục về trạng thái ổn định."
  echo "  HTTP Status: ${HTTP_CODE} OK"
  echo "=========================================================="
  exit 0
else
  echo "=========================================================="
  echo "  ❌ CẢNH BÁO: Rollback hoàn tất nhưng HTTP Status là ${HTTP_CODE}"
  echo "  Vui lòng kiểm tra log: /var/log/nginx/error.log"
  echo "=========================================================="
  exit 1
fi
