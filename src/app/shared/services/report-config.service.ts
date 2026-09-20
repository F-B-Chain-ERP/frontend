
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map, tap } from 'rxjs';
import { ApplicationConfigService } from '../../core/config/application-config.service';

/**
 * Cấu hình ngưỡng Sync/Async xuất báo cáo trả về từ BE.
 * @see GET /api/v1/reports/config
 */
export interface ReportConfig {
  /** Ngưỡng bản ghi: từ đây trở lên tự chuyển sang xử lý bất đồng bộ (vd: 100) */
  asyncThresholdRecords: number;
  /** Giới hạn an toàn tối đa cho luồng đồng bộ (chống OOM, vd: 500) */
  maxHardSyncRecords: number;
  /** Danh sách định dạng hỗ trợ (EXCEL, PDF) */
  supportedFormats: string[];
  /** Danh sách chế độ điều phối (AUTO, SYNC, ASYNC) */
  supportedModes: string[];
  /** Chu kỳ polling job khi theo dõi trạng thái bất đồng bộ */
  pollIntervalMs: number;
  /** Hệ thống có bật SSE đẩy thông báo realtime hay không */
  sseEnabled: boolean;
}

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Truy cập tập trung cấu hình xuất báo cáo từ
 * {@code GET /api/v1/reports/config} — Frontend không hard-code ngưỡng
 * Sync/Async trùng lặp, luôn lấy từ Backend (erp-core-model làm nguồn chân lý).
 */
@Injectable({
  providedIn: 'root',
})
export class ReportConfigService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(ApplicationConfigService);

  private readonly configSignal = signal<ReportConfig | null>(null);
  private loadPromise: Promise<ReportConfig> | null = null;

  /** Cấu hình hiện tại (null nếu chưa tải). */
  get config(): ReportConfig | null {
    return this.configSignal();
  }

  /** Lấy cấu hình từ backend, cache 1 lần. */
  loadConfig(force = false): Observable<ReportConfig> {
    const cached = this.configSignal();
    if (cached && !force) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    return this.http.get<ApiEnvelope<ReportConfig>>(this.appConfig.getEndpointFor('api/v1/reports/config')).pipe(
      map(res => res.data),
      tap(config => this.configSignal.set(config)),
    );
  }

  /**
   * Phiên bản Promise (dùng được trong async/await). Nếu có yêu cầu đang
   * chạy sẽ chia sẻ cùng một Promise để tránh bắn nhiều request trùng lặp.
   */
  loadConfigAsync(force = false): Promise<ReportConfig> {
    const cached = this.configSignal();
    if (cached && !force) {
      return Promise.resolve(cached);
    }
    if (!this.loadPromise || force) {
      this.loadPromise = firstValueFrom(this.loadConfig(force)).finally(() => (this.loadPromise = null));
    }
    return this.loadPromise;
  }

  /** Ngưỡng bản ghi chuyển sang Async (mặc định 100 trong lúc chưa tải). */
  getAsyncThreshold(): number {
    return this.configSignal()?.asyncThresholdRecords ?? 100;
  }

  /** Chu kỳ polling (mặc định 3000ms). */
  getPollIntervalMs(): number {
    return this.configSignal()?.pollIntervalMs ?? 3000;
  }

  /** Hệ thống có bật SSE hay không. */
  isSseEnabled(): boolean {
    return this.configSignal()?.sseEnabled ?? true;
  }
}
