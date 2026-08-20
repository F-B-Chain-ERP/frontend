#!/usr/bin/env bash
# ==============================================================================
# BƯỚC 1 & 2 (Bash): Build Angular Frontend & Chuyển file lên Server
# Chạy từ thư mục frontend hoặc thư mục gốc ERP-UTT
# Cách dùng: bash deploy/scripts/01-build-transfer.sh [SERVER_IP] [SERVER_USER] [CONFIG]
# ==============================================================================

set -e

SERVER_IP=${1:-"163.61.72.183"}
SERVER_USER=${2:-"root"}
CONFIG=${3:-"production"}
REMOTE_DIR="/opt/ERP-UTT/frontend"

echo "=========================================================="
echo "  [FRONTEND] BUILD & TRANSFER LÊN SERVER (Bash)"
echo "  Target: $SERVER_USER@$SERVER_IP:$REMOTE_DIR"
echo "  Build Configuration: $CONFIG"
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
        echo "[ERROR] Không tìm thấy output build tại dist/frontend!"
        exit 1
    fi
fi

echo ""
echo "▶ 2. Tạo thư mục đích trên Server qua SSH..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR/browser $REMOTE_DIR/deploy/nginx $REMOTE_DIR/deploy/scripts"

echo ""
echo "▶ 3. Nén và truyền mã nguồn tĩnh lên Server..."
TAR_FILE="frontend-dist.tar.gz"
rm -f "$TAR_FILE"
tar -czf "$TAR_FILE" -C "$DIST_PATH" .
scp "$TAR_FILE" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/$TAR_FILE"

ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && rm -rf browser/* && tar -xzf $TAR_FILE -C browser/ && rm -f $TAR_FILE"
rm -f "$TAR_FILE"

echo ""
echo "▶ 4. Chuyển cấu hình Nginx và deploy scripts lên Server..."
scp deploy/nginx/erp-utt.conf "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/nginx/"
scp deploy/scripts/02-setup-nginx.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true
scp deploy/scripts/03-check-status.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/deploy/scripts/" || true

echo ""
echo "=========================================================="
echo "  HOÀN THÀNH BUILD VÀ TRANSFER FRONTEND LÊN SERVER!"
echo "  Các bước tiếp theo trên server ($SERVER_IP):"
echo "  1. SSH vào server: ssh $SERVER_USER@$SERVER_IP"
echo "  2. Chạy cấu hình Nginx: sudo bash $REMOTE_DIR/deploy/scripts/02-setup-nginx.sh"
echo "  3. Kiểm tra website: http://$SERVER_IP/"
echo "=========================================================="
