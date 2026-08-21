#!/usr/bin/env bash
# ==============================================================================
# BƯỚC 1 & 2 (Bash): Build Angular Frontend & Chuyển file lên Server
# Chạy từ thư mục frontend hoặc thư mục gốc ERP-UTT
#
# Cách dùng:
#   bash deploy/scripts/01-build-transfer.sh [SERVER_IP] [SERVER_USER] [CONFIG] [BUILD_ONLY]
# Ví dụ:
#   bash frontend/deploy/scripts/01-build-transfer.sh 163.61.72.183 root production
# ==============================================================================

set -eo pipefail

SERVER_IP=${1:-"163.61.72.183"}
SERVER_USER=${2:-"root"}
CONFIG=${3:-"production"}
BUILD_ONLY=${4:-"false"}
REMOTE_DIR="/opt/ERP-UTT/frontend"

echo "=========================================================="
echo "  [FRONTEND] BUILD & MANUAL DEPLOY LÊN SERVER (Bash)"
echo "  Target Host  : $SERVER_USER@$SERVER_IP:$REMOTE_DIR"
echo "  Configuration: $CONFIG"
echo "  Build Only   : $BUILD_ONLY"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "▶ 1. Build Angular frontend ($CONFIG)..."
if [ "$CONFIG" = "production" ]; then
    npm run build:prod
else
    npm run build:dev
fi

DIST_PATH="dist/frontend/browser"
if [ ! -d "$DIST_PATH" ]; then
    if [ -d "dist/frontend" ]; then
        DIST_PATH="dist/frontend"
    else
        echo "❌ [ERROR] Không tìm thấy output build tại dist/frontend!"
        exit 1
    fi
fi

echo ""
echo "▶ 2. Đóng gói mã nguồn tĩnh..."
TAR_FILE="frontend-dist.tar.gz"
rm -f "$TAR_FILE"
tar -czf "$TAR_FILE" -C "$DIST_PATH" .
echo "  ✅ Đã tạo gói nén: $TAR_FILE"

if [ "$BUILD_ONLY" = "true" ] || [ "$BUILD_ONLY" = "--build-only" ]; then
    echo ""
    echo "=========================================================="
    echo "  ĐÃ HOÀN TẤT BUILD LOCAL (Build Only)!"
    echo "  File output: $(pwd)/$TAR_FILE"
    echo "=========================================================="
    exit 0
fi

echo ""
echo "▶ 3. Khởi tạo cấu trúc thư mục trên Server qua SSH..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR/browser $REMOTE_DIR/backups $REMOTE_DIR/staging $REMOTE_DIR/deploy/nginx $REMOTE_DIR/deploy/scripts"

echo ""
echo "▶ 4. Chuyển gói build và scripts lên Server qua SCP..."
scp "$TAR_FILE" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/$TAR_FILE"
scp deploy/nginx/erp-utt.conf "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/nginx/"
scp deploy/scripts/deploy.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true
scp deploy/scripts/rollback.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true
scp deploy/scripts/02-setup-nginx.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true
scp deploy/scripts/03-check-status.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true
rm -f "$TAR_FILE"

echo ""
echo "▶ 5. Kích hoạt triển khai và Health Check trên Server..."
ssh "$SERVER_USER@$SERVER_IP" "chmod +x $REMOTE_DIR/deploy/scripts/*.sh && bash $REMOTE_DIR/deploy/scripts/deploy.sh $TAR_FILE manual-sh-$(date '+%Y%m%d%H%M%S')"

echo ""
echo "=========================================================="
echo "  ✅ TRIỂN KHAI THỦ CÔNG LÊN SERVER THÀNH CÔNG!"
echo "  Địa chỉ kiểm tra:"
echo "  - Giao diện Web: http://$SERVER_IP/"
echo "  - SPA Sub-route: http://$SERVER_IP/home"
echo "=========================================================="
