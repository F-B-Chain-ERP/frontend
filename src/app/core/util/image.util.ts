/**
 * Tiện ích chuẩn hóa URL ảnh sản phẩm linh hoạt cho cả Production (HTTPS) và Local Development:
 *
 * 1. Khi chạy trên HTTPS (Production - https://erp-utt.duckdns.org):
 *    - Trình duyệt chặn toàn bộ kết nối HTTP qua cổng 9000 (Lỗi Mixed Content).
 *    - Hàm tự động chuyển đổi URL dạng http://...:9000/... thành relative URL /storage/...
 *      để Nginx reverse proxy phục vụ an toàn qua HTTPS.
 *
 * 2. Khi chạy trên Localhost / HTTP Dev (http://localhost:4200 hoặc http://127.0.0.1:4200):
 *    - Không bị giới hạn Mixed Content.
 *    - Nếu URL là http://163.61.72.183:9000/..., giữ nguyên để browser tải trực tiếp từ máy chủ VPS.
 *    - Nếu URL là relative /storage/..., tự động trỏ về máy chủ VPS http://163.61.72.183:9000/...
 *      để tránh phụ thuộc local proxy (tránh lỗi 500 khi dev không chạy MinIO local).
 */
export const DEFAULT_BEVERAGE_IMAGE =
  'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80';

export const DEFAULT_STYLE_IMAGE =
  'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80';

const REMOTE_MINIO_URL = 'http://163.61.72.183:9000';

export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const isBrowser = typeof window !== 'undefined';
  const isHttps = isBrowser && window.location.protocol === 'https:';
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.'));

  // ── Môi trường Production (HTTPS) ──────────────────────────────────
  if (isHttps) {
    // 1. Chuyển đổi URL MinIO có port :9000/... thành relative /storage/...
    if (trimmed.includes(':9000/')) {
      const idx = trimmed.indexOf(':9000/');
      return '/storage/' + trimmed.substring(idx + 6);
    }
    // 2. Chuyển đổi URL tuyệt đối chứa /storage/... thành relative /storage/...
    if (trimmed.includes('/storage/')) {
      const idx = trimmed.indexOf('/storage/');
      return trimmed.substring(idx);
    }
    // 3. Chuyển đổi URL chứa bucket erp-products thành relative /storage/erp-products/...
    if (trimmed.includes('/erp-products/')) {
      const idx = trimmed.indexOf('/erp-products/');
      return '/storage' + trimmed.substring(idx);
    }
    // 4. Nếu là HTTP URL trên domain ngoài (Unsplash, CDN), nâng cấp lên HTTPS để tránh Mixed Content
    if (trimmed.startsWith('http://') && !trimmed.includes('163.61.72.183')) {
      return 'https://' + trimmed.substring(7);
    }
    return trimmed;
  }

  // ── Môi trường Local Development (HTTP / Localhost) ─────────────────
  if (isLocalhost) {
    // Nếu URL là relative /storage/..., trỏ trực tiếp về VPS MinIO
    if (trimmed.startsWith('/storage/')) {
      return `${REMOTE_MINIO_URL}/${trimmed.substring('/storage/'.length)}`;
    }
    // Nếu URL đã là http://163.61.72.183:9000/... hoặc http://..., giữ nguyên để load trực tiếp
    return trimmed;
  }

  // ── Fallback (nếu không xác định được browser context) ──────────────
  if (trimmed.includes(':9000/')) {
    const idx = trimmed.indexOf(':9000/');
    return '/storage/' + trimmed.substring(idx + 6);
  }
  if (trimmed.includes('/storage/')) {
    const idx = trimmed.indexOf('/storage/');
    return trimmed.substring(idx);
  }
  if (trimmed.includes('/erp-products/')) {
    const idx = trimmed.indexOf('/erp-products/');
    return '/storage' + trimmed.substring(idx);
  }

  return trimmed;
}
