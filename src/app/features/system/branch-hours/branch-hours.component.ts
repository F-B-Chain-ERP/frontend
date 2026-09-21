import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { takeUntil } from 'rxjs/operators';

import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { BranchService } from '../../../core/auth/branch.service';
import { ROLE } from '../../../core/config/functions.constants';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { BranchManagementService } from '../branches/branch-management.service';
import { BranchHoursService } from './branch-hours.service';
import {
  DAYS_OF_WEEK,
  BatchUpdateBranchHoursRequest,
  BranchHours,
  calculateWorkingHours,
  dateToTimeString,
  formatTimeShort,
  timeStringToDate,
} from './branch-hours.model';

export interface ScheduleRowModel {
  dayOfWeek: number;
  dayName: string;
  shortLabel: string;
  isWeekend: boolean;
  isClosed: boolean;
  openDate: Date | null;
  closeDate: Date | null;
  status: string;
}

@Component({
  selector: 'app-branch-hours',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzGridModule,
    NzSelectModule,
    NzTableModule,
    NzSwitchModule,
    NzTimePickerModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    NzSpinModule,
    NzAlertModule,
    NzDividerModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './branch-hours.component.html',
  styleUrls: ['./branch-hours.component.scss'],
})
export class BranchHoursComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  private readonly route = inject(ActivatedRoute);
  private readonly branchHoursService = inject(BranchHoursService);
  private readonly branchService = inject(BranchService);
  private readonly branchManagementService = inject(BranchManagementService);
  private readonly toast = inject(AppNotificationService);

  // Signals
  readonly branches = signal<Array<{ id: string; name: string; code: string; address?: string | null }>>([]);
  readonly selectedBranchId = signal<string>('');
  readonly selectedBranchInfo = computed(() => {
    const id = this.selectedBranchId();
    return this.branches().find(b => b.id === id) ?? null;
  });

  readonly loading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDirty = signal<boolean>(false);
  readonly scheduleRows = signal<ScheduleRowModel[]>([]);

  // Lưu snapshot bản gốc để khôi phục (Reset)
  private originalData: BranchHours[] = [];

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Tổ chức', url: '/admin/system/branches/list' },
      { label: 'Giờ hoạt động', url: '/admin/system/branch-hours/list' },
    ]);

    this.loadBranchesList();
  }

  /**
   * Tải danh sách chi nhánh để hiển thị dropdown bộ chọn.
   */
  private loadBranchesList(): void {
    this.branchManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          const mapped = list.map(b => ({
            id: b.id,
            name: b.name,
            code: b.code,
            address: b.address,
          }));
          this.branches.set(mapped);

          // Kiểm tra query param ?branchId=... hoặc lấy chi nhánh hiện tại
          this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const queryBranchId = params['branchId'];
            if (queryBranchId && mapped.some(b => b.id === queryBranchId)) {
              this.selectBranch(queryBranchId);
            } else if (this.branchService.currentBranch()?.id && mapped.some(b => b.id === this.branchService.currentBranch()?.id)) {
              this.selectBranch(this.branchService.currentBranch()!.id);
            } else if (mapped.length > 0) {
              this.selectBranch(mapped[0].id);
            }
          });
        },
        error: err => {
          this.toast.error('Không thể tải danh sách chi nhánh: ' + err.message);
        },
      });
  }

  /**
   * Chọn chi nhánh và tải cấu hình lịch tuần tương ứng.
   */
  selectBranch(branchId: string): void {
    if (!branchId) return;
    this.selectedBranchId.set(branchId);
    this.loadBranchHours(branchId);
  }

  /**
   * Tải lịch hoạt động 7 ngày từ Backend.
   */
  loadBranchHours(branchId: string): void {
    this.loading.set(true);
    this.branchHoursService
      .getHours(branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.originalData = JSON.parse(JSON.stringify(list));
          this.initScheduleRows(list);
          this.loading.set(false);
          this.isDirty.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.error(err.message || 'Không thể tải lịch hoạt động chi nhánh.');
        },
      });
  }

  /**
   * Khởi tạo mảng 7 dòng (Thứ Hai đến Chủ Nhật).
   */
  private initScheduleRows(hoursList: BranchHours[]): void {
    const hoursMap = new Map<number, BranchHours>();
    for (const h of hoursList) {
      hoursMap.set(h.dayOfWeek, h);
    }

    const rows: ScheduleRowModel[] = DAYS_OF_WEEK.map(dayMeta => {
      const existing = hoursMap.get(dayMeta.dayOfWeek);
      const isClosed = existing ? existing.isClosed : false;
      const openTime = existing?.openTime || '07:00:00';
      const closeTime = existing?.closeTime || '22:00:00';

      return {
        dayOfWeek: dayMeta.dayOfWeek,
        dayName: dayMeta.label,
        shortLabel: dayMeta.shortLabel,
        isWeekend: dayMeta.isWeekend,
        isClosed,
        openDate: isClosed ? null : timeStringToDate(openTime),
        closeDate: isClosed ? null : timeStringToDate(closeTime),
        status: existing?.status || 'ACTIVE',
      };
    });

    this.scheduleRows.set(rows);
  }

  /**
   * Bật/tắt trạng thái đóng cửa của một ngày.
   */
  onToggleClosed(row: ScheduleRowModel, isClosed: boolean): void {
    row.isClosed = isClosed;
    if (isClosed) {
      row.openDate = null;
      row.closeDate = null;
    } else {
      // Gán lại mặc định 07:00 - 22:00 khi mở lại
      row.openDate = timeStringToDate('07:00:00');
      row.closeDate = timeStringToDate('22:00:00');
    }
    this.isDirty.set(true);
  }

  /**
   * Thay đổi giờ mở hoặc đóng cửa.
   */
  onTimeChange(): void {
    this.isDirty.set(true);
  }

  /**
   * Kiểm tra dòng có hợp lệ không.
   */
  isRowValid(row: ScheduleRowModel): boolean {
    if (row.isClosed) return true;
    if (!row.openDate || !row.closeDate) return false;
    const openStr = dateToTimeString(row.openDate);
    const closeStr = dateToTimeString(row.closeDate);
    return openStr !== closeStr;
  }

  /**
   * Kiểm tra xem ngày có phải ca qua đêm không.
   */
  isOvernight(row: ScheduleRowModel): boolean {
    if (row.isClosed || !row.openDate || !row.closeDate) return false;
    const openMinutes = row.openDate.getHours() * 60 + row.openDate.getMinutes();
    const closeMinutes = row.closeDate.getHours() * 60 + row.closeDate.getMinutes();
    return openMinutes > closeMinutes;
  }

  /**
   * Tính toán độ dài thời gian mở bán.
   */
  getDurationText(row: ScheduleRowModel): string {
    if (row.isClosed) return 'Nghỉ bán';
    if (!row.openDate || !row.closeDate) return '--';
    const openStr = dateToTimeString(row.openDate);
    const closeStr = dateToTimeString(row.closeDate);
    return calculateWorkingHours(openStr, closeStr, false);
  }

  /**
   * Thao tác nhanh 1: Sao chép Thứ Hai cho các ngày còn lại (Thứ 3 -> Chủ Nhật).
   */
  copyMondayToAll(): void {
    const rows = [...this.scheduleRows()];
    const monday = rows[0];
    if (!monday) return;

    for (let i = 1; i < rows.length; i++) {
      rows[i].isClosed = monday.isClosed;
      rows[i].openDate = monday.openDate ? new Date(monday.openDate.getTime()) : null;
      rows[i].closeDate = monday.closeDate ? new Date(monday.closeDate.getTime()) : null;
    }

    this.scheduleRows.set(rows);
    this.isDirty.set(true);
    this.toast.success('Đã sao chép lịch hoạt động của Thứ Hai cho cả tuần.');
  }

  /**
   * Thao tác nhanh 2: Đặt giờ chuẩn (07:00 - 22:00) cho toàn bộ 7 ngày.
   */
  setDefaultHours(): void {
    const rows = [...this.scheduleRows()];
    for (const r of rows) {
      r.isClosed = false;
      r.openDate = timeStringToDate('07:00:00');
      r.closeDate = timeStringToDate('22:00:00');
    }
    this.scheduleRows.set(rows);
    this.isDirty.set(true);
    this.toast.success('Đã áp dụng khung giờ tiêu chuẩn 07:00 - 22:00 cho cả tuần.');
  }

  /**
   * Thao tác nhanh 3: Nghỉ cuối tuần (Đóng Thứ 7 & Chủ Nhật).
   */
  setWeekendClosed(): void {
    const rows = [...this.scheduleRows()];
    for (const r of rows) {
      if (r.isWeekend) {
        r.isClosed = true;
        r.openDate = null;
        r.closeDate = null;
      }
    }
    this.scheduleRows.set(rows);
    this.isDirty.set(true);
    this.toast.success('Đã đặt Thứ 7 & Chủ Nhật là ngày nghỉ bán.');
  }

  /**
   * Khôi phục lại dữ liệu ban đầu từ Backend.
   */
  resetToLoaded(): void {
    this.initScheduleRows(this.originalData);
    this.isDirty.set(false);
    this.toast.info('Đã khôi phục cài đặt ban đầu.');
  }

  /**
   * Lưu toàn bộ lịch hoạt động 7 ngày xuống Backend.
   */
  saveHours(): void {
    const branchId = this.selectedBranchId();
    if (!branchId) {
      this.toast.warning('Vui lòng chọn chi nhánh trước khi lưu.');
      return;
    }

    const rows = this.scheduleRows();

    // Kiểm tra toàn bộ tính hợp lệ
    for (const row of rows) {
      if (!row.isClosed) {
        if (!row.openDate || !row.closeDate) {
          this.toast.error(`Vui lòng chọn đầy đủ giờ mở cửa và đóng cửa cho ${row.dayName}.`);
          return;
        }
        const openStr = dateToTimeString(row.openDate);
        const closeStr = dateToTimeString(row.closeDate);
        if (openStr === closeStr) {
          this.toast.error(`Giờ mở cửa và đóng cửa của ${row.dayName} không được trùng nhau.`);
          return;
        }
      }
    }

    const payload: BatchUpdateBranchHoursRequest = {
      hours: rows.map(r => ({
        dayOfWeek: r.dayOfWeek,
        openTime: r.isClosed ? '07:00:00' : (dateToTimeString(r.openDate) || '07:00:00'),
        closeTime: r.isClosed ? '22:00:00' : (dateToTimeString(r.closeDate) || '22:00:00'),
        isClosed: r.isClosed,
        status: r.status || 'ACTIVE',
      })),
    };

    this.isSaving.set(true);
    this.branchHoursService
      .updateHours(branchId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updatedList => {
          this.isSaving.set(false);
          this.originalData = JSON.parse(JSON.stringify(updatedList));
          this.initScheduleRows(updatedList);
          this.isDirty.set(false);
          this.toast.success('Cập nhật lịch hoạt động tuần thành công!');
        },
        error: err => {
          this.isSaving.set(false);
          this.toast.error(err.message || 'Lỗi khi lưu lịch hoạt động.');
        },
      });
  }

  /**
   * Điều hướng nhanh sang Quản lý Khung giờ Pickup của chi nhánh này.
   */
  navigateToPickupSlots(): void {
    const branchId = this.selectedBranchId();
    if (branchId) {
      this.router.navigate(['/admin/system/pickup-slots/list'], {
        queryParams: { branchId },
      });
    }
  }
}
