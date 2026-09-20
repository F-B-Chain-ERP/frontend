import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subscription, Observable, firstValueFrom, interval, EMPTY } from 'rxjs';
import { catchError, filter, switchMap, takeWhile } from 'rxjs/operators';
import { ReportService, ExportResult, ReportJobResponse } from '../../services/report.service';
import { ReportConfigService } from '../../services/report-config.service';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { ReportSseEvent } from '../../../core/notification/notification.model';
import { AppNotificationService } from '../../app-notification/app-notification.service';

/**
 * Nút xuất báo cáo thống nhất (Excel/PDF).
 *
 * <p>Hỗ trợ cả 2 luồng của Backend:
 * <ul>
 *   <li><b>Đồng bộ (SYNC):</b> nhận file nhị phân ngay, tự tải xuống.</li>
 *   <li><b>Bất đồng bộ (ASYNC):</b> nhận {@code jobId} rồi theo dõi tiến độ — ưu tiên
 *       thông báo realtime qua SSE ({@code REPORT_DONE}/{@code REPORT_FAILED}), lấy
 *       chu kỳ polling từ {@link ReportConfigService} làm fallback khi mạng gián đoạn.
 *       Khi hoàn tất tự tải file về máy.</li>
 * </ul>
 */
@Component({
  selector: 'app-report-export-button',
  standalone: true,
  imports: [CommonModule, NzDropdownModule, NzButtonModule, NzIconModule, NzSpinModule],
  templateUrl: './report-export-button.component.html',
  styleUrls: ['./report-export-button.component.scss'],
})
export class ReportExportButtonComponent implements OnInit, OnDestroy {
  @Input({ required: true }) endpoint!: string;
  @Input() payload: any = {};
  @Input() label = 'Xuất báo cáo';
  @Input() btnType: 'primary' | 'default' | 'dashed' = 'default';
  @Input() disabled = false;

  @Output() exportStarted = new EventEmitter<void>();
  @Output() exportCompleted = new EventEmitter<ExportResult>();
  @Output() exportJobDone = new EventEmitter<{ jobId: string; filename: string; blob: Blob }>();
  @Output() exportError = new EventEmitter<string>();

  readonly loading = signal(false);
  readonly pending = signal(false);

  private readonly reportService = inject(ReportService);
  private readonly reportConfig = inject(ReportConfigService);
  private readonly realtime = inject(RealtimeNotificationService);
  private readonly toast = inject(AppNotificationService);

  private activeJobId: string | null = null;
  private sseSub: Subscription | null = null;
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.reportConfig.loadConfig().subscribe({ error: () => undefined });
  }

  ngOnDestroy(): void {
    this.clearTracking();
  }

  triggerExport(format: 'EXCEL' | 'PDF'): void {
    if (this.loading() || this.pending() || this.disabled) return;

    this.loading.set(true);
    this.exportStarted.emit();

    const requestBody = {
      ...this.payload,
      format,
    };

    this.reportService.exportReport(this.endpoint, requestBody).subscribe({
      next: result => {
        this.loading.set(false);
        this.exportCompleted.emit(result);

        if (result.isAsync && result.job) {
          this.beginAsyncTracking(result.job);
        } else if (result.blob && result.filename) {
          this.reportService.downloadBlob(result.blob, result.filename);
          this.toast.success(`Đã xuất và tải xuống tệp ${result.filename} thành công!`);
        }
      },
      error: err => {
        this.loading.set(false);
        this.handleExportError(err);
      },
    });
  }

  /** Theo dõi tiến độ job bất đồng bộ bằng SSE + Polling fallback. */
  private beginAsyncTracking(job: ReportJobResponse): void {
    this.activeJobId = job.id;
    this.pending.set(true);

    this.toast.info(
      `Báo cáo khối lượng lớn đã được đưa vào hàng đợi xử lý ngầm (Mã tác vụ: ${job.id.slice(0, 8)}...).`,
      'Hệ thống sẽ thông báo và tự tải file khi hoàn tất.',
    );

    // 1. Kênh realtime qua SSE (nhanh nhất)
    this.sseSub = this.realtime.reportEvents.pipe(filter(e => e.jobId === job.id)).subscribe(event => {
      if (event.status === 'DONE') {
        this.finishJobSuccess(job.id);
      } else {
        this.finishJobFailure(job.id, event.errorMessage || event.message || 'Báo cáo xử lý thất bại');
      }
    });

    // 2. Polling fallback khi SSE bị gián đoạn / không bật
    const pollInterval = Math.max(this.reportConfig.getPollIntervalMs(), 1500);
    this.pollSub = interval(pollInterval)
      .pipe(
        takeWhile(() => this.pending() && this.activeJobId === job.id),
        switchMap(() =>
          this.reportService.getJobStatus(job.id).pipe(
            // Lỗi mạng tạm thời: bỏ qua lần này, vòng lặp vẫn tiếp tục
            catchError(() => EMPTY),
          ),
        ),
        takeWhile(s => s.status === 'PENDING' || s.status === 'PROCESSING'),
      )
      .subscribe({
        next() {
          /* còn đang xử lý — tiếp tục vòng lặp */
        },
        error: () => undefined,
        complete: () => {
          // Vòng lặp dừng khi trạng thái khác PENDING/PROCESSING hoặc bị hủy
          if (this.activeJobId !== job.id || !this.pending()) return;
          this.reportService.getJobStatus(job.id).subscribe({
            next: s => {
              if (s.status === 'DONE') {
                this.finishJobSuccess(job.id);
              } else if (s.status === 'FAILED') {
                this.finishJobFailure(job.id, s.errorMessage || 'Báo cáo xử lý thất bại.');
              }
            },
            error: () => this.finishJobFailure(job.id, 'Không kiểm tra được tiến độ báo cáo.'),
          });
        },
      });
  }

  private async finishJobSuccess(jobId: string): Promise<void> {
    if (this.activeJobId !== jobId) return;
    this.clearPolling();
    this.pending.set(false);

    try {
      const { blob, filename } = await firstValueFrom(this.reportService.downloadJobFile(jobId));
      this.reportService.downloadBlob(blob, filename);
      this.toast.success(`Báo cáo đã hoàn tất và tải xuống: ${filename}`);
      this.exportJobDone.emit({ jobId, filename, blob });
    } catch (err) {
      this.toast.info('Báo cáo đã hoàn tất nhưng tải file bị lỗi.', 'Bạn có thể vào danh sách tác vụ báo cáo để tải lại.');
    }
  }

  private finishJobFailure(jobId: string, message: string): void {
    if (this.activeJobId !== jobId) return;
    this.clearPolling();
    this.pending.set(false);
    this.toast.error('Xuất báo cáo thất bại', message);
    this.exportError.emit(message);
  }

  private clearPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private clearTracking(): void {
    this.sseSub?.unsubscribe();
    this.sseSub = null;
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.activeJobId = null;
    this.pending.set(false);
  }

  /** Đọc lỗi trả về (body blob) khi yêu cầu kiểu {@code responseType: 'blob'}. */
  private handleExportError(err: unknown): void {
    const message$: Observable<string> = new Observable<string>(observer => {
      const blob: Blob | undefined = (err as { error?: Blob })?.error;
      if (blob && typeof blob.text === 'function') {
        blob
          .text()
          .then(text => {
            try {
              const parsed = JSON.parse(text);
              observer.next(parsed?.message || parsed?.errorCode || text);
            } catch {
              observer.next(text || 'Có lỗi xảy ra khi xuất báo cáo.');
            }
            observer.complete();
          })
          .catch(() => {
            observer.next('Có lỗi xảy ra khi xuất báo cáo.');
            observer.complete();
          });
      } else {
        observer.next((err as { message?: string })?.message || 'Có lỗi xảy ra khi xuất báo cáo.');
        observer.complete();
      }
    });

    message$.subscribe({
      next: message => {
        const normalized = message.startsWith('{') ? 'Có lỗi xảy ra khi xuất báo cáo.' : message;
        this.toast.error('Xuất báo cáo thất bại', normalized);
        this.exportError.emit(normalized);
      },
    });
  }
}

export default ReportExportButtonComponent;
