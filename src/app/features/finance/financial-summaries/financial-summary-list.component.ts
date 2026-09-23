import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { FinancialSummaryService, BranchOption } from './financial-summary.service';
import {
  FinancialSummaryExpenseSource,
  FinancialSummaryOrderSource,
  FinancialSummaryRecord,
  FinancialSummaryRefundSource,
  FinancialSummarySourceType,
  FINANCIAL_SUMMARY_STATUS_OPTIONS,
  getFinancialSummaryStatusMeta,
} from './financial-summary.model';

@Component({
  selector: 'app-financial-summary-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzModalModule,
    NzTooltipModule,
    NzGridModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTabsModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './financial-summary-list.component.html',
  styleUrls: ['./financial-summary-list.component.scss'],
})
export class FinancialSummaryListComponent implements OnInit {
  private readonly financialSummaryService = inject(FinancialSummaryService);
  private readonly toast = inject(AppNotificationService);

  readonly ROLE = ROLE;
  readonly statusOptions = FINANCIAL_SUMMARY_STATUS_OPTIONS;

  summaries = signal<FinancialSummaryRecord[]>([]);
  isLoading = signal<boolean>(false);

  selectedBranchId: string | null = null;
  branchOptions = signal<BranchOption[]>([]);
  fromDate: Date | null = null;
  toDate: Date | null = null;
  selectedStatus: string | null = null;

  sortBy: 'businessDate' | 'netRevenue' | 'netProfit' = 'businessDate';
  sortDir: 'asc' | 'desc' = 'desc';

  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = signal<number>(0);

  // ── KPI (trang hiện tại) ──────────────────────────────────────────
  kpiNetRevenue = computed(() => this.summaries().reduce((acc, s) => acc + s.netRevenue, 0));
  kpiTotalCogs = computed(() => this.summaries().reduce((acc, s) => acc + s.totalCogs, 0));
  kpiTotalExpense = computed(() => this.summaries().reduce((acc, s) => acc + s.totalExpense, 0));
  kpiNetProfit = computed(() => this.summaries().reduce((acc, s) => acc + s.netProfit, 0));

  // ── Detail Modal + Sources Tabs ───────────────────────────────────
  isDetailVisible = signal<boolean>(false);
  detailSummary = signal<FinancialSummaryRecord | null>(null);
  activeSource: FinancialSummarySourceType = 'ORDERS';
  isSourcesLoading = signal<boolean>(false);

  orderSources = signal<FinancialSummaryOrderSource[]>([]);
  refundSources = signal<FinancialSummaryRefundSource[]>([]);
  expenseSources = signal<FinancialSummaryExpenseSource[]>([]);
  sourceTotal = signal<number>(0);
  sourcePageIndex = 1;
  sourcePageSize = 10;

  // ── Recalculate Confirm ───────────────────────────────────────────
  isRecalcVisible = signal<boolean>(false);
  isRecalcSubmitting = signal<boolean>(false);
  recalcTarget = signal<FinancialSummaryRecord | null>(null);

  // ── Finalize Confirm ──────────────────────────────────────────────
  isFinalizeVisible = signal<boolean>(false);
  isFinalizeSubmitting = signal<boolean>(false);
  finalizeTarget = signal<FinancialSummaryRecord | null>(null);

  ngOnInit(): void {
    this.loadBranchOptions();
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.financialSummaryService
      .getSummaries({
        branchId: this.selectedBranchId ?? undefined,
        fromDate: this.fromDate ? this.toDateString(this.fromDate) : null,
        toDate: this.toDate ? this.toDateString(this.toDate) : null,
        status: this.selectedStatus,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: res => {
          this.summaries.set(res.items);
          this.total.set(res.total);
          this.isLoading.set(false);
        },
        error: err => {
          this.toast.error('Lỗi', err.message || 'Không thể tải danh sách báo cáo tài chính');
          this.isLoading.set(false);
        },
      });
  }

  loadBranchOptions(): void {
    this.financialSummaryService.getBranchOptions().subscribe({
      next: list => this.branchOptions.set(list),
      error: () => this.branchOptions.set([]),
    });
  }

  onSearch(): void {
    if (!this.isPeriodValid()) {
      this.toast.error('Lỗi', 'Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    this.pageIndex = 1;
    this.loadData();
  }

  onResetFilters(): void {
    this.selectedBranchId = null;
    this.fromDate = null;
    this.toDate = null;
    this.selectedStatus = null;
    this.sortBy = 'businessDate';
    this.sortDir = 'desc';
    this.pageIndex = 1;
    this.loadData();
  }

  onSortChange(column: 'businessDate' | 'netRevenue' | 'netProfit', order: string | null): void {
    if (!order) {
      this.sortBy = 'businessDate';
      this.sortDir = 'desc';
    } else {
      this.sortBy = column;
      this.sortDir = order === 'ascend' ? 'asc' : 'desc';
    }
    this.pageIndex = 1;
    this.loadData();
  }

  sortOrderFor(column: string): 'ascend' | 'descend' | null {
    if (this.sortBy !== column) return null;
    return this.sortDir === 'asc' ? 'ascend' : 'descend';
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadData();
  }

  getStatusMeta(status: string) {
    return getFinancialSummaryStatusMeta(status);
  }

  isDraft(s: FinancialSummaryRecord): boolean {
    return s.status === 'DRAFT';
  }

  // ── Detail Modal / Sources ────────────────────────────────────────

  onViewSummary(s: FinancialSummaryRecord): void {
    this.detailSummary.set(s);
    this.isDetailVisible.set(true);
    this.switchSource('ORDERS');
  }

  onCloseDetail(): void {
    this.isDetailVisible.set(false);
    this.detailSummary.set(null);
    this.orderSources.set([]);
    this.refundSources.set([]);
    this.expenseSources.set([]);
    this.sourceTotal.set(0);
  }

  onTabChange(index: number): void {
    const source: FinancialSummarySourceType = index === 0 ? 'ORDERS' : index === 1 ? 'REFUNDS' : 'EXPENSES';
    this.switchSource(source);
  }

  activeTabIndex(): number {
    if (this.activeSource === 'ORDERS') return 0;
    if (this.activeSource === 'REFUNDS') return 1;
    return 2;
  }

  private switchSource(source: FinancialSummarySourceType): void {
    this.activeSource = source;
    this.sourcePageIndex = 1;
    this.loadSources();
  }

  loadSources(pageIndex: number = this.sourcePageIndex, pageSize: number = this.sourcePageSize): void {
    const summary = this.detailSummary();
    if (!summary) return;

    this.isSourcesLoading.set(true);
    this.financialSummaryService.getSources(summary.id, this.activeSource, pageIndex, pageSize).subscribe({
      next: res => {
        this.sourceTotal.set(res.total);
        this.sourcePageIndex = res.pageIndex;
        this.sourcePageSize = res.pageSize;
        if (this.activeSource === 'ORDERS') {
          this.orderSources.set(res.items as FinancialSummaryOrderSource[]);
        } else if (this.activeSource === 'REFUNDS') {
          this.refundSources.set(res.items as FinancialSummaryRefundSource[]);
        } else {
          this.expenseSources.set(res.items as FinancialSummaryExpenseSource[]);
        }
        this.isSourcesLoading.set(false);
      },
      error: err => {
        this.toast.error('Lỗi', err.message || 'Không thể tải dữ liệu đối soát');
        this.isSourcesLoading.set(false);
      },
    });
  }

  onSourcePageIndexChange(index: number): void {
    this.loadSources(index, this.sourcePageSize);
  }

  onSourcePageSizeChange(size: number): void {
    this.loadSources(1, size);
  }

  sourcesCount(): number {
    if (this.activeSource === 'ORDERS') return this.orderSources().length;
    if (this.activeSource === 'REFUNDS') return this.refundSources().length;
    return this.expenseSources().length;
  }

  // ── Recalculate ───────────────────────────────────────────────────

  onOpenRecalcModal(s: FinancialSummaryRecord): void {
    this.recalcTarget.set(s);
    this.isRecalcVisible.set(true);
  }

  onCloseRecalcModal(): void {
    this.isRecalcVisible.set(false);
    this.recalcTarget.set(null);
  }

  onConfirmRecalculate(): void {
    const target = this.recalcTarget();
    if (!target) return;

    this.isRecalcSubmitting.set(true);
    this.financialSummaryService.recalculate(target.branchId, target.businessDate).subscribe({
      next: res => {
        this.toast.success('Thành công', 'Đã tính lại báo cáo tài chính');
        this.isRecalcVisible.set(false);
        this.recalcTarget.set(null);
        this.isRecalcSubmitting.set(false);
        if (this.detailSummary()?.id === res.id) {
          this.detailSummary.set(res);
        }
        this.pageIndex = res.id === target.id ? this.pageIndex : 1;
        this.loadData();
      },
      error: err => {
        this.toast.error('Lỗi', err.message || 'Không thể tính lại báo cáo tài chính');
        this.isRecalcSubmitting.set(false);
      },
    });
  }

  // ── Finalize ──────────────────────────────────────────────────────

  onOpenFinalizeModal(s: FinancialSummaryRecord): void {
    this.finalizeTarget.set(s);
    this.isFinalizeVisible.set(true);
  }

  onCloseFinalizeModal(): void {
    this.isFinalizeVisible.set(false);
    this.finalizeTarget.set(null);
  }

  onConfirmFinalize(): void {
    const target = this.finalizeTarget();
    if (!target) return;

    this.isFinalizeSubmitting.set(true);
    this.financialSummaryService.finalize(target.id).subscribe({
      next: res => {
        this.toast.success('Thành công', 'Đã chốt kỳ báo cáo tài chính');
        this.isFinalizeVisible.set(false);
        this.finalizeTarget.set(null);
        this.isFinalizeSubmitting.set(false);
        if (this.detailSummary()?.id === res.id) {
          this.detailSummary.set(res);
        }
        this.loadData();
      },
      error: err => {
        this.toast.error('Lỗi', err.message || 'Không thể chốt kỳ báo cáo tài chính');
        this.isFinalizeSubmitting.set(false);
      },
    });
  }

  private isPeriodValid(): boolean {
    if (!this.fromDate || !this.toDate) return true;
    return this.fromDate <= this.toDate;
  }

  private toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
