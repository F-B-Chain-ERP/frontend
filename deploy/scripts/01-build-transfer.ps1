# ==============================================================================
# BƯỚC 1 & 2 (PowerShell): Build Angular Frontend & Chuyển file lên Server
# Chạy tại PowerShell từ thư mục frontend hoặc thư mục gốc ERP-UTT
# Cách dùng: .\deploy\scripts\01-build-transfer.ps1 [-ServerIp "163.61.72.183"] [-ServerUser "root"] [-Config "production"]
# ==============================================================================

param (
    [string]$ServerIp = "163.61.72.183",
    [string]$ServerUser = "root",
    [string]$Config = "production",
    [string]$RemoteDir = "/opt/ERP-UTT/frontend"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  [FRONTEND] BUILD & TRANSFER LÊN SERVER (PowerShell)" -ForegroundColor Cyan
Write-Host "  Target: $ServerUser@$ServerIp:$RemoteDir" -ForegroundColor Yellow
Write-Host "  Build Configuration: $Config" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Xác định thư mục frontend
$FrontendDir = "."
if (-not (Test-Path "package.json")) {
    if (Test-Path "frontend\package.json") {
        $FrontendDir = "frontend"
    } elseif (Test-Path "..\package.json") {
        $FrontendDir = ".."
    } else {
        Write-Error "Không tìm thấy thư mục frontend (chứa package.json)!"
        exit 1
    }
}

Push-Location $FrontendDir

try {
    # 2. Build Angular
    Write-Host "`n▶ 1. Build Angular frontend ($Config)..." -ForegroundColor Green
    if ($Config -eq "production") {
        npm run build:prod
    } else {
        npm run build:dev
    }

    $DistPath = "dist\frontend\browser"
    if (-not (Test-Path $DistPath)) {
        if (Test-Path "dist\frontend") {
            $DistPath = "dist\frontend"
        } else {
            Write-Error "Không tìm thấy output build tại dist\frontend!"
            exit 1
        }
    }

    Write-Host "`n▶ 2. Tạo thư mục đích trên Server qua SSH..." -ForegroundColor Green
    ssh "$ServerUser@$ServerIp" "mkdir -p $RemoteDir/browser $RemoteDir/deploy/nginx $RemoteDir/deploy/scripts"

    Write-Host "`n▶ 3. Nén và truyền mã nguồn tĩnh lên Server..." -ForegroundColor Green
    $ZipFile = "frontend-dist.tar.gz"
    if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }
    
    # Nén thư mục browser
    tar -czf $ZipFile -C "$DistPath" .

    # SCP file nén lên server
    scp $ZipFile "$ServerUser@$ServerIp:$RemoteDir/$ZipFile"

    # Giải nén trên server và phân quyền
    ssh "$ServerUser@$ServerIp" "cd $RemoteDir && rm -rf browser/* && tar -xzf $ZipFile -C browser/ && rm -f $ZipFile"
    Remove-Item $ZipFile -Force

    Write-Host "`n▶ 4. Chuyển cấu hình Nginx và deploy scripts lên Server..." -ForegroundColor Green
    scp "deploy/nginx/erp-utt.conf" "$ServerUser@$ServerIp:$RemoteDir/deploy/nginx/"
    scp "deploy/scripts/02-setup-nginx.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null
    scp "deploy/scripts/03-check-status.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null

    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host "  HOÀN THÀNH BUILD VÀ TRANSFER FRONTEND LÊN SERVER!" -ForegroundColor Green
    Write-Host "  Các bước tiếp theo trên server ($ServerIp):" -ForegroundColor Yellow
    Write-Host "  1. SSH vào server: ssh $ServerUser@$ServerIp"
    Write-Host "  2. Chạy cấu hình Nginx: sudo bash $RemoteDir/deploy/scripts/02-setup-nginx.sh"
    Write-Host "  3. Kiểm tra website: http://$ServerIp/"
    Write-Host "==========================================================" -ForegroundColor Cyan
} finally {
    Pop-Location
}
