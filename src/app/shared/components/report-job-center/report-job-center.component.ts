import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ReportService, ReportJobSummaryResponse } from '../../services/report.service';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { AppNotificationService } from '../../app-notification/app-notification.service';

@Component({
  selector: 'app-report-job-center',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    NzDrawerModule,
    NzButtonModule,
    NzTagModule,
    NzSpinModule,
    NzIconModule,
    NzBadgeModule,
    NzPopconfirmModule,
    NzEmptyModule,
    NzTooltipModule,
  ],
  templateUrl: './report-job-center.component.html',
  styleUrls: ['./report-job-center.component.scss'],
})
export class ReportJobCenterComponent implements OnInit, OnDestroy {
  readonly visible = signal(false);
  readonly loading = signal(false);
  readonly jobs = signal<ReportJobSummaryResponse[]>([]);
  readonly downloadingJobIds = signal<Set<string>>(new Set());

  readonly activeJobCount = computed(() =>
    this.jobs().filter(j => j.status === 'PENDING' || j.status === 'PROCESSING').length
  );

  private readonly reportService = inject(ReportService);
  private readonly realtime = inject(RealtimeNotificationService);
  private readonly toast = inject(AppNotificationService);

  private sseSub: Subscription | null = null;
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.loadJobs();

    // Listen to realtime report completion events
    this.sseSub = this.realtime.reportEvents.subscribe(() => {
      this.loadJobs(false);
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.stopPolling();
  }

  open(): void {
    this.visible.set(true);
    this.loadJobs();
    this.startPolling();
  }

  close(): void {
    this.visible.set(false);
    this.stopPolling();
  }

  loadJobs(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.reportService.listMyJobs(0, 30).subscribe({
      next: res => {
        this.jobs.set(res.content ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  downloadFile(job: ReportJobSummaryResponse): void {
    if (this.downloadingJobIds().has(job.id)) {
      return;
    }

    this.downloadingJobIds.update(set => new Set(set).add(job.id));
    this.reportService.downloadJobFile(job.id).subscribe({
      next: ({ blob, filename }) => {
        this.reportService.downloadBlob(blob, filename);
        this.toast.success(`Đã tải xuống tệp ${filename} thành công!`);
        this.downloadingJobIds.update(set => {
          const updated = new Set(set);
          updated.delete(job.id);
          return updated;
        });
      },
      error: () => {
        this.toast.error('Tải file thất bại', 'Không thể kết nối đến máy chủ lưu trữ tệp.');
        this.downloadingJobIds.update(set => {
          const updated = new Set(set);
          updated.delete(job.id);
          return updated;
        });
      },
    });
  }

  cancelJob(jobId: string): void {
    this.reportService.cancelJob(jobId).subscribe({
      next: () => {
        this.toast.success('Đã hủy tác vụ xuất báo cáo thành công.');
        this.loadJobs(false);
      },
      error: () => {
        this.toast.error('Hủy tác vụ thất bại', 'Tác vụ có thể đã được tiến hành xử lý.');
      },
    });
  }

  private startPolling(): void {
    this.stopPolling();
    // Khi mở drawer và có job đang chạy:
    // - Nếu SSE kết nối: sự kiện realtime (reportEvents) đã tự động gọi loadJobs(false) khi job hoàn tất.
    //   Chỉ cần kiểm tra an toàn chậm mỗi 30s đề phòng mạng trễ.
    // - Nếu SSE ngắt kết nối: fallback polling mỗi 10s.
    let elapsedSeconds = 0;
    this.pollSub = interval(5000).subscribe(() => {
      if (!this.visible() || this.activeJobCount() === 0) return;
      elapsedSeconds += 5;
      const isSseConnected = this.realtime.isConnected();
      if (!isSseConnected) {
        if (elapsedSeconds % 10 === 0) {
          this.loadJobs(false);
        }
      } else {
        if (elapsedSeconds % 30 === 0) {
          this.loadJobs(false);
        }
      }
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  getReportTitle(type: string): string {
    switch (type) {
      case 'STORE_SHIFT_REPORT':
      case 'STORE_SHIFT_HANDOVER':
      case 'STORE_SHIFT_LIST':
        return 'Báo cáo ca làm việc';
      case 'STORE_DAILY_REPORT':
      case 'STORE_DAILY_CLOSING':
      case 'STORE_DAILY_LIST':
        return 'Báo cáo doanh thu ngày';
      case 'POS_ORDER_LIST':
        return 'Danh sách đơn hàng POS';
      case 'POS_SALES_SUMMARY':
        return 'Báo cáo tổng kết bán hàng POS';
      default:
        return type || 'Báo cáo';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'DONE':
        return 'success';
      case 'PROCESSING':
        return 'processing';
      case 'PENDING':
        return 'default';
      case 'FAILED':
        return 'error';
      case 'CANCELLED':
        return 'default';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'DONE':
        return 'Hoàn thành';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'FAILED':
        return 'Thất bại';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'EXPIRED':
        return 'Đã hết hạn';
      default:
        return status;
    }
  }
}
