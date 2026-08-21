#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DEPLOY TỰ ĐỘNG CHO FRONTEND (ANGULAR 21 SPA) TRÊN SERVER
# Hỗ trợ: Atomic Swap, Tự động Sao lưu (Auto Backup), Health Check & Tự động Rollback
#
# Cách dùng:
#   bash deploy/scripts/deploy.sh [package_file] [version_tag]
# Ví dụ:
#   bash deploy/scripts/deploy.sh frontend-dist-abc1234.tar.gz sha-abc1234
# ==============================================================================

set -eo pipefail

FRONTEND_DIR="/opt/ERP-UTT/frontend"
PKG_FILE=${1:-"frontend-dist.tar.gz"}
VERSION_TAG=${2:-"manual-$(date '+%Y%m%d%H%M%S')"}

BROWSER_DIR="${FRONTEND_DIR}/browser"
STAGING_DIR="${FRONTEND_DIR}/staging"
BACKUPS_DIR="${FRONTEND_DIR}/backups"
LAST_STABLE_BACKUP="${FRONTEND_DIR}/.last-stable-build.tar.gz"
LAST_STABLE_TAG_FILE="${FRONTEND_DIR}/.last-stable-tag"

echo "=========================================================="
echo "  🚀 BẮT ĐẦU TRIỂN KHAI FRONTEND (ANGULAR)"
echo "  Version Tag  : ${VERSION_TAG}"
echo "  Package File : ${PKG_FILE}"
echo "  Directory    : ${FRONTEND_DIR}"
echo "  Timestamp    : $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="

mkdir -p "${BROWSER_DIR}" "${STAGING_DIR}" "${BACKUPS_DIR}"

# 1. Xác định vị trí file package
FULL_PKG_PATH="${PKG_FILE}"
if [ ! -f "${FULL_PKG_PATH}" ]; then
  if [ -f "${FRONTEND_DIR}/${PKG_FILE}" ]; then
    FULL_PKG_PATH="${FRONTEND_DIR}/${PKG_FILE}"
  elif [ -f "${FRONTEND_DIR}/deploy/${PKG_FILE}" ]; then
    FULL_PKG_PATH="${FRONTEND_DIR}/deploy/${PKG_FILE}"
  else
    echo "❌ [ERROR] Không tìm thấy file package: ${PKG_FILE}"
    exit 1
  fi
fi

# 2. Tự động sao lưu phiên bản hiện tại trước khi ghi đè
echo ""
echo "▶ [1/5] Sao lưu phiên bản hiện tại..."
if [ -f "${BROWSER_DIR}/index.html" ]; then
  BACKUP_NAME="backup-${VERSION_TAG}-$(date '+%Y%m%d%H%M%S').tar.gz"
  tar -czf "${BACKUPS_DIR}/${BACKUP_NAME}" -C "${BROWSER_DIR}" .
  cp -f "${BACKUPS_DIR}/${BACKUP_NAME}" "${LAST_STABLE_BACKUP}"
  echo "  ✅ Đã lưu snapshot bản cũ vào: ${BACKUPS_DIR}/${BACKUP_NAME}"
  
  # Giữ lại tối đa 5 bản backup gần nhất, xóa bớt bản cũ
  ls -t "${BACKUPS_DIR}"/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f || true
else
  echo "  ℹ️  Chưa có bản build cũ nào trong ${BROWSER_DIR} (triển khai lần đầu)."
fi

# 3. Giải nén vào Staging Directory để kiểm tra tính toàn vẹn
echo ""
echo "▶ [2/5] Giải nén và kiểm tra file tĩnh..."
rm -rf "${STAGING_DIR:?}"/*
tar -xzf "${FULL_PKG_PATH}" -C "${STAGING_DIR}"

if [ ! -f "${STAGING_DIR}/index.html" ]; then
  echo "❌ [ERROR] Gói build không hợp lệ! Không tìm thấy index.html trong staging."
  rm -rf "${STAGING_DIR:?}"/*
  exit 1
fi
echo "  ✅ Gói build hợp lệ (chứa index.html và các bundle chunks)."

# 4. Atomic Swap: Cập nhật thư mục browser chính
echo ""
echo "▶ [3/5] Triển khai mã nguồn mới vào thư mục phục vụ..."
rm -rf "${BROWSER_DIR:?}"/*
cp -r "${STAGING_DIR}"/* "${BROWSER_DIR}/"
rm -rf "${STAGING_DIR:?}"/*

# Phân quyền chuẩn: SSH user giữ quyền sở hữu, Nginx (www-data) có quyền đọc và duyệt file (755)
chmod -R 755 "${FRONTEND_DIR}"
chmod -R 755 "${BROWSER_DIR}"

# 5. Đồng bộ cấu hình Nginx (nếu có) & Reload không gián đoạn
echo ""
echo "▶ [4/5] Đồng bộ cấu hình Nginx & Reload..."
NGINX_SRC="${FRONTEND_DIR}/deploy/nginx/erp-utt.conf"
NGINX_DEST="/etc/nginx/sites-available/erp-utt"
NGINX_ENABLED="/etc/nginx/sites-enabled/erp-utt"

if [ -f "${NGINX_SRC}" ]; then
  cp -f "${NGINX_SRC}" "${NGINX_DEST}" 2>/dev/null || sudo -n cp -f "${NGINX_SRC}" "${NGINX_DEST}" 2>/dev/null || true
  ln -sf "${NGINX_DEST}" "${NGINX_ENABLED}" 2>/dev/null || sudo -n ln -sf "${NGINX_DEST}" "${NGINX_ENABLED}" 2>/dev/null || true
fi

if nginx -t 2>/dev/null || sudo -n nginx -t 2>/dev/null; then
  sudo -n systemctl reload nginx 2>/dev/null || systemctl reload nginx 2>/dev/null || sudo -n systemctl restart nginx 2>/dev/null || true
  echo "  ✅ Nginx đã reload cấu hình mới thành công."
else
  echo "  ⚠️ Cú pháp Nginx có cảnh báo hoặc không có quyền reload, vui lòng kiểm tra lại nginx -t!"
fi

# 6. Kiểm tra Sức khỏe Hệ thống (Automated Health Check & Smoke Test)
echo ""
echo "▶ [5/5] Kiểm tra sức khỏe hệ thống (Health Check)..."
MAX_RETRIES=5
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  COUNT=$((COUNT + 1))
  sleep 1

  # Test route gốc
  HTTP_ROOT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || echo "000")
  # Test SPA sub-route
  HTTP_SPA=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/home || echo "000")

  echo "  [Thử ${COUNT}/${MAX_RETRIES}] Root HTTP: ${HTTP_ROOT} | SPA Route HTTP: ${HTTP_SPA}"

  if [ "${HTTP_ROOT}" = "200" ] && [ "${HTTP_SPA}" = "200" ]; then
    HEALTHY=true
    break
  fi
done

# 7. Đánh giá kết quả & Tự động Rollback nếu thất bại
if [ "${HEALTHY}" = true ]; then
  echo "=========================================================="
  echo "  ✅ TRIỂN KHAI FRONTEND THÀNH CÔNG!"
  echo "  Phiên bản: ${VERSION_TAG} đang hoạt động ổn định."
  echo "=========================================================="
  echo "${VERSION_TAG}" > "${LAST_STABLE_TAG_FILE}"
  
  # Dọn dẹp file package tạm
  rm -f "${FULL_PKG_PATH}" 2>/dev/null || true
  exit 0
else
  echo "=========================================================="
  echo "  ❌ DEPLOY THẤT BẠI! Frontend không vượt qua Health Check."
  echo "=========================================================="

  # Kích hoạt Rollback tự động nếu có bản sao lưu trước đó
  if [ -f "${LAST_STABLE_BACKUP}" ]; then
    echo ""
    echo "⚠️  TIẾN HÀNH ROLLBACK TỰ ĐỘNG VỀ BẢN STABLE TRƯỚC ĐÓ..."
    bash "${FRONTEND_DIR}/deploy/scripts/rollback.sh" || true
  else
    echo "⚠️  Không tìm thấy bản backup nào để rollback."
  fi

  exit 1
fi
