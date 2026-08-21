# ==============================================================================
# BƯỚC 1 & 2 (PowerShell): Build Angular Frontend & Chuyển file lên Server
# Chạy tại PowerShell từ thư mục frontend hoặc thư mục gốc ERP-UTT
#
# Cách dùng:
#   .\deploy\scripts\01-build-transfer.ps1 [-ServerIp "163.61.72.183"] [-ServerUser "root"] [-Config "production"] [-BuildOnly]
# Ví dụ:
#   # Build và Deploy toàn diện:
#   .\frontend\deploy\scripts\01-build-transfer.ps1
#
#   # Chỉ build local không deploy:
#   .\frontend\deploy\scripts\01-build-transfer.ps1 -BuildOnly
# ==============================================================================

param (
    [string]$ServerIp = "163.61.72.183",
    [string]$ServerUser = "root",
    [string]$Config = "production",
    [string]$RemoteDir = "/opt/ERP-UTT/frontend",
    [switch]$BuildOnly = $false,
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  [FRONTEND] BUILD & MANUAL DEPLOY LÊN SERVER (PowerShell)" -ForegroundColor Cyan
Write-Host "  Target Host  : $ServerUser@$ServerIp:$RemoteDir" -ForegroundColor Yellow
Write-Host "  Configuration: $Config" -ForegroundColor Yellow
Write-Host "  Build Only   : $BuildOnly" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Xác định thư mục frontend chứa package.json
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
    if (-not $SkipBuild) {
        Write-Host "`n▶ 1. Build Angular frontend ($Config)..." -ForegroundColor Green
        if ($Config -eq "production") {
            npm run build:prod
        } else {
            npm run build:dev
        }
    } else {
        Write-Host "`n▶ 1. Bỏ qua bước build (-SkipBuild)..." -ForegroundColor Yellow
    }

    # 3. Định vị output build
    $DistPath = "dist\frontend\browser"
    if (-not (Test-Path $DistPath)) {
        if (Test-Path "dist\frontend") {
            $DistPath = "dist\frontend"
        } else {
            Write-Error "Không tìm thấy output build tại dist\frontend!"
            exit 1
        }
    }

    # 4. Nén mã nguồn tĩnh
    Write-Host "`n▶ 2. Đóng gói mã nguồn tĩnh..." -ForegroundColor Green
    $ZipFile = "frontend-dist.tar.gz"
    if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }
    
    tar -czf $ZipFile -C "$DistPath" .
    $fileSize = (Get-Item $ZipFile).Length / 1MB
    Write-Host "  ✅ Đã tạo gói nén: $ZipFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green

    if ($BuildOnly) {
        Write-Host "`n==========================================================" -ForegroundColor Cyan
        Write-Host "  ĐÃ HOÀN TẤT BUILD LOCAL (-BuildOnly)!" -ForegroundColor Green
        Write-Host "  File output: $(Get-Location)\$ZipFile" -ForegroundColor Yellow
        Write-Host "==========================================================" -ForegroundColor Cyan
        return
    }

    # 5. Tạo thư mục đích trên server
    Write-Host "`n▶ 3. Khởi tạo cấu trúc thư mục trên Server..." -ForegroundColor Green
    ssh "$ServerUser@$ServerIp" "mkdir -p $RemoteDir/browser $RemoteDir/backups $RemoteDir/staging $RemoteDir/deploy/nginx $RemoteDir/deploy/scripts"

    # 6. SCP chuyển file lên server
    Write-Host "`n▶ 4. Chuyển gói build và scripts lên Server qua SCP..." -ForegroundColor Green
    scp $ZipFile "$ServerUser@$ServerIp:$RemoteDir/$ZipFile"
    scp "deploy/nginx/erp-utt.conf" "$ServerUser@$ServerIp:$RemoteDir/deploy/nginx/"
    scp "deploy/scripts/deploy.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null
    scp "deploy/scripts/rollback.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null
    scp "deploy/scripts/02-setup-nginx.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null
    scp "deploy/scripts/03-check-status.sh" "$ServerUser@$ServerIp:$RemoteDir/deploy/scripts/" 2>$null

    # 7. Kích hoạt script deploy an toàn trên server
    Write-Host "`n▶ 5. Kích hoạt triển khai và Health Check trên Server..." -ForegroundColor Green
    ssh "$ServerUser@$ServerIp" "chmod +x $RemoteDir/deploy/scripts/*.sh && bash $RemoteDir/deploy/scripts/deploy.sh $ZipFile manual-ps1-$(Get-Date -Format 'yyyyMMddHHmmss')"

    # Dọn dẹp file zip local
    Remove-Item $ZipFile -Force

    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host "  ✅ TRIỂN KHAI THỦ CÔNG LÊN SERVER THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "  Địa chỉ kiểm tra:" -ForegroundColor Yellow
    Write-Host "  - Giao diện Web: http://$ServerIp/"
    Write-Host "  - SPA Sub-route: http://$ServerIp/home"
    Write-Host "==========================================================" -ForegroundColor Cyan
} finally {
    Pop-Location
}
