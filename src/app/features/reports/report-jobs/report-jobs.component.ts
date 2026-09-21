import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { ReportService, ReportJobSummaryResponse, ReportJobResponse } from '../../../shared/services/report.service';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';

@Component({
  selector: 'app-report-jobs',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    NzIconModule,
    NzTableModule,
    NzCardModule,
    NzSelectModule,
    NzInputModule,
    NzPopconfirmModule,
    NzEmptyModule,
    NzSpinModule,
    NzTagModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
  ],
  templateUrl: './report-jobs.component.html',
  styleUrls: ['./report-jobs.component.scss'],
})
export class ReportJobsComponent implements OnInit, OnDestroy {
  private readonly reportService = inject(ReportService);
  private readonly realtime = inject(RealtimeNotificationService);
  private readonly toast = inject(AppNotificationService);

  // Data state
  readonly loading = signal(false);
  readonly jobs = signal<ReportJobSummaryResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(1);
  readonly pageSize = signal(10);
  readonly downloadingJobIds = signal<Set<string>>(new Set());

  // Filter state
  readonly statusFilter = signal<string>('ALL');
  readonly formatFilter = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  // Detail Modal state
  readonly detailModalVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly selectedJob = signal<ReportJobResponse | null>(null);

  // Realtime connection state
  readonly isRealtimeConnected = computed(() => this.realtime.isConnected());

  // Active (Pending / Processing) jobs count
  readonly activeJobCount = computed(() =>
    this.jobs().filter(j => j.status === 'PENDING' || j.status === 'PROCESSING').length
  );

  // Statistics KPI counts (computed from loaded page / batch)
  readonly statsTotal = computed(() => this.totalElements());
  readonly statsProcessing = computed(() =>
    this.jobs().filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length
  );
  readonly statsDone = computed(() =>
    this.jobs().filter(j => j.status === 'DONE').length
  );
  readonly statsFailed = computed(() =>
    this.jobs().filter(j => j.status === 'FAILED' || j.status === 'CANCELLED').length
  );

  // Filtered jobs on current page based on user search & select filters
  readonly filteredJobs = computed(() => {
    let result = this.jobs();
    const status = this.statusFilter();
    const format = this.formatFilter();
    const query = this.searchQuery().trim().toLowerCase();

    if (status !== 'ALL') {
      result = result.filter(j => j.status === status);
    }
    if (format !== 'ALL') {
      result = result.filter(j => j.format === format);
    }
    if (query) {
      result = result.filter(
        j =>
          j.id.toLowerCase().includes(query) ||
          this.getReportTitle(j.reportType).toLowerCase().includes(query) ||
          (j.module && j.module.toLowerCase().includes(query)) ||
          j.format.toLowerCase().includes(query)
      );
    }
    return result;
  });

  private sseSub: Subscription | null = null;
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.loadJobs();

    // Listen to realtime report completion events from SSE
    this.sseSub = this.realtime.reportEvents.subscribe(event => {
      this.loadJobs(false);
      if (event.status === 'DONE') {
        this.toast.success(
          'Báo cáo hoàn tất!',
          `Tác vụ ${event.jobId.slice(0, 8)}... đã tạo xong tệp xuất báo cáo.`
        );
      } else if (event.status === 'FAILED') {
        this.toast.error(
          'Xuất báo cáo thất bại',
          event.errorMessage || 'Tác vụ xử lý không thành công.'
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.stopPolling();
  }

  loadJobs(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    const pageZeroIndexed = this.pageIndex() - 1;
    this.reportService.listMyJobs(pageZeroIndexed, this.pageSize()).subscribe({
      next: res => {
        this.jobs.set(res.content ?? []);
        this.totalElements.set(res.totalElements ?? 0);
        this.loading.set(false);

        // Manage background polling if active jobs exist
        if (this.activeJobCount() > 0) {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPageIndexChange(page: number): void {
    this.pageIndex.set(page);
    this.loadJobs();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.loadJobs();
  }

  onSearch(): void {
    // Current filtering is computed on client, but reload page 1 if search text
    this.pageIndex.set(1);
  }

  resetFilters(): void {
    this.statusFilter.set('ALL');
    this.formatFilter.set('ALL');
    this.searchQuery.set('');
    this.pageIndex.set(1);
    this.loadJobs();
  }

  downloadFile(job: ReportJobSummaryResponse | ReportJobResponse): void {
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
        if (this.detailModalVisible() && this.selectedJob()?.id === jobId) {
          this.detailModalVisible.set(false);
        }
      },
      error: () => {
        this.toast.error('Hủy tác vụ thất bại', 'Tác vụ có thể đã được tiến hành xử lý.');
      },
    });
  }

  viewJobDetail(jobId: string): void {
    this.detailLoading.set(true);
    this.detailModalVisible.set(true);
    this.reportService.getJobStatus(jobId).subscribe({
      next: job => {
        this.selectedJob.set(job);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.toast.error('Không thể lấy thông tin chi tiết tác vụ.');
      },
    });
  }

  closeDetailModal(): void {
    this.detailModalVisible.set(false);
    this.selectedJob.set(null);
  }

  copyToClipboard(text: string, label = 'Mã tác vụ'): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success(`Đã sao chép ${label} vào bộ nhớ tạm.`);
    });
  }

  private startPolling(): void {
    if (this.pollSub) return;
    let elapsedSeconds = 0;
    this.pollSub = interval(5000).subscribe(() => {
      if (this.activeJobCount() === 0) {
        this.stopPolling();
        return;
      }
      elapsedSeconds += 5;
      const isSseConnected = this.realtime.isConnected();
      if (!isSseConnected) {
        if (elapsedSeconds % 10 === 0) {
          this.loadJobs(false);
        }
      } else {
        if (elapsedSeconds % 25 === 0) {
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

  getModuleLabel(module: string): string {
    switch (module) {
      case 'POS':
        return 'Bán hàng (POS)';
      case 'STORE_OPS':
        return 'Vận hành cửa hàng';
      case 'INVENTORY':
        return 'Kho & Cung ứng';
      case 'FINANCE':
        return 'Tài chính';
      default:
        return module || 'Hệ thống';
    }
  }

  getModuleIcon(module: string): string {
    switch (module) {
      case 'POS':
        return 'shopping-cart';
      case 'STORE_OPS':
        return 'shop';
      case 'INVENTORY':
        return 'inbox';
      case 'FINANCE':
        return 'dollar';
      default:
        return 'file-text';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'DONE':
        return 'status-badge--done';
      case 'PROCESSING':
        return 'status-badge--processing';
      case 'PENDING':
        return 'status-badge--pending';
      case 'FAILED':
        return 'status-badge--failed';
      case 'CANCELLED':
        return 'status-badge--cancelled';
      case 'EXPIRED':
        return 'status-badge--expired';
      default:
        return 'status-badge--default';
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
        return 'Hết hạn (30 ngày)';
      default:
        return status;
    }
  }
}
