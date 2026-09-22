import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';

import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {NzAlertModule} from 'ng-zorro-antd/alert';

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {ReportExportButtonComponent} from '../../../shared/components/report-export-button/report-export-button.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {BranchService} from '../../../core/auth/branch.service';
import {StoreShiftService, ShiftServiceError} from '../shift/shift.service';
import {StoreDailyReport, ShiftReport, DAILY_REPORT_STATUS_OPTIONS, getDailyReportStatusMeta, getShiftReportStatusMeta} from '../shift/shift.model';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';

@Component({
  selector: 'app-store-daily-report-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzGridModule,
    NzTooltipModule,
    NzIconModule,
    NzSpinModule,
    NzAlertModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    ReportExportButtonComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './daily-report-list.component.html',
  styleUrls: ['./daily-report-list.component.scss'],
})
export class StoreDailyReportListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getDailyReportStatusMeta = getDailyReportStatusMeta;
  readonly getShiftReportStatusMeta = getShiftReportStatusMeta;
  readonly statusOptions = DAILY_REPORT_STATUS_OPTIONS;

  get exportPayload(): Record<string, any> {
    return {
      branchId: this.selectedBranchId || undefined,
      startDate: this.selectedStartDate ? this.formatDate(this.selectedStartDate) : undefined,
      endDate: this.selectedEndDate ? this.formatDate(this.selectedEndDate) : undefined,
    };
  }

  readonly branchService = inject(BranchService);
  private readonly shiftService = inject(StoreShiftService);

  readonly reports = signal<StoreDailyReport[]>([]);
  readonly loading = signal<boolean>(false);
  readonly total = signal<number>(0);

  // Filter params
  selectedBranchId: string | null = null;
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Generate Report Modal
  readonly isGenerateModalVisible = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly prevDayClosing = signal<number | null>(null);
  generateForm!: FormGroup;

  // Modal Pop-up Chi tiết báo cáo ngày
  readonly isDrawerVisible = signal<boolean>(false);
  readonly selectedReport = signal<StoreDailyReport | null>(null);
  readonly isReportLoading = signal<boolean>(false);
  readonly isApproving = signal<boolean>(false);
  readonly dayShiftReports = signal<ShiftReport[]>([]);
  readonly isDayShiftsLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.initForms();
    this.branchService.loadMine().subscribe(() => {
      const current = this.branchService.currentBranch();
      if (current) {
        this.selectedBranchId = current.id;
      }
      this.loadData();
    });
  }

  private initForms(): void {
    this.generateForm = this.fb.group({
      branchId: ['', [Validators.required]],
      businessDate: [this.formatDate(new Date()), [Validators.required]],
    });
    this.generateForm.get('branchId')?.valueChanges.subscribe(() => this.loadPrevDayClosing());
    this.generateForm.get('businessDate')?.valueChanges.subscribe(() => this.loadPrevDayClosing());
  }

  private loadPrevDayClosing(): void {
    const val = this.generateForm?.value;
    if (!val?.branchId || !val?.businessDate) {
      this.prevDayClosing.set(null);
      return;
    }
    const d = new Date(val.businessDate);
    if (isNaN(d.getTime())) {
      this.prevDayClosing.set(null);
      return;
    }
    d.setDate(d.getDate() - 1);
    this.shiftService.getDailyReportByDate(val.branchId, this.formatDate(d)).subscribe({
      next: prev => this.prevDayClosing.set(prev?.closingCash ?? 0),
      error: () => this.prevDayClosing.set(null),
    });
  }

  loadData(): void {
    if (this.selectedStartDate && this.selectedEndDate && this.selectedStartDate > this.selectedEndDate) {
      this.toastService.error('Khoảng ngày không hợp lệ', 'Từ ngày phải <= Đến ngày');
      return;
    }
    this.loading.set(true);
    const start = this.selectedStartDate ? this.formatDate(this.selectedStartDate) : undefined;
    const end = this.selectedEndDate ? this.formatDate(this.selectedEndDate) : undefined;
    const branchId = this.selectedBranchId || undefined;
    const status = this.selectedStatus || undefined;

    this.shiftService
      .searchDailyReports(branchId, start, end, this.pageIndex - 1, this.pageSize, status)
      .subscribe({
        next: page => {
          this.reports.set(page?.content ?? []);
          this.total.set(page?.totalElements ?? 0);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi tải danh sách báo cáo ngày', err.message);
        },
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onReset(): void {
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.selectedStatus = null;
    this.pageIndex = 1;
    this.loadData();
  }

  onPageIndexChange(idx: number): void {
    this.pageIndex = idx;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadData();
  }

  // ── Tổng hợp báo cáo ngày ──────────────────────────────────────────
  openGenerateModal(): void {
    const branchId = this.selectedBranchId || this.branchService.branches()[0]?.id || '';
    this.generateForm.reset({
      branchId,
      businessDate: this.formatDate(new Date()),
    });
    this.prevDayClosing.set(null);
    this.loadPrevDayClosing();
    this.isGenerateModalVisible.set(true);
  }

  closeGenerateModal(): void {
    this.isGenerateModalVisible.set(false);
  }

  submitGenerate(): void {
    if (this.generateForm.invalid) {
      this.generateForm.markAllAsTouched();
      return;
    }
    this.isGenerating.set(true);
    const val = this.generateForm.value;

    this.shiftService.generateDailyReport(val).subscribe({
      next: report => {
        this.isGenerating.set(false);
        this.isGenerateModalVisible.set(false);
        this.toastService.success(
          'Tổng hợp thành công',
          `Đã tổng hợp báo cáo ngày ${report.businessDate} với ${report.totalOrders} đơn hàng hoàn thành`,
        );
        this.loadData();
      },
      error: (err: ShiftServiceError) => {
        this.isGenerating.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.generateForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Lỗi tổng hợp báo cáo ngày', err.message);
      },
    });
  }

  // ── Modal Xem chi tiết & Phê duyệt khóa sổ ───────────────────────
  onViewReport(r: StoreDailyReport): void {
    this.selectedReport.set(r);
    this.isDrawerVisible.set(true);
    this.isReportLoading.set(true);
    this.dayShiftReports.set([]);
    this.isDayShiftsLoading.set(true);

    this.shiftService.getDailyReportById(r.id).subscribe({
      next: report => {
        if (report) {
          this.selectedReport.set(report);
        }
        this.isReportLoading.set(false);
      },
      error: () => {
        this.isReportLoading.set(false);
      },
    });

    this.shiftService.searchShiftReports(r.branchId, r.businessDate, 0, 100).subscribe({
      next: page => {
        this.dayShiftReports.set(page?.content ?? []);
        this.isDayShiftsLoading.set(false);
      },
      error: () => {
        this.isDayShiftsLoading.set(false);
      },
    });
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedReport.set(null);
    this.dayShiftReports.set([]);
  }

  getBranchName(branchId?: string): string {
    if (!branchId) return 'Tất cả chi nhánh';
    const b = this.branchService.branches().find(x => x.id === branchId);
    return b ? b.name : branchId;
  }

  onApproveDailyReport(): void {
    const r = this.selectedReport();
    if (!r) return;

    this.isApproving.set(true);
    this.shiftService.approveDailyReport(r.id, 'Quản lý phê duyệt khóa sổ ngày').subscribe({
      next: updated => {
        this.isApproving.set(false);
        this.toastService.success('Khóa sổ thành công', `Đã khóa sổ báo cáo ngày ${updated.businessDate}`);
        this.selectedReport.set(updated);
        this.loadData();
      },
      error: err => {
        this.isApproving.set(false);
        this.toastService.error('Không thể phê duyệt', err.message);
      },
    });
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
