import {CommonModule} from '@angular/common';
import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {NzAlertModule} from 'ng-zorro-antd/alert';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzInputNumberModule} from 'ng-zorro-antd/input-number';
import {NzProgressModule} from 'ng-zorro-antd/progress';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzTimePickerModule} from 'ng-zorro-antd/time-picker';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {forkJoin} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {BranchService} from '../../../core/auth/branch.service';
import {ROLE} from '../../../core/config/functions.constants';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppSelectionBarComponent} from '../../../shared/app-selection-bar/app-selection-bar.component';
import {BaseComponent} from '../../../shared/base-component/base.component';
import {EnterAsTabContainerDirective} from '../../../shared/directives/enter-as-tab-container.directive';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';
import {BranchManagementService} from '../branches/branch-management.service';
import {PickupSlotService} from './pickup-slot.service';
import {
  CreatePickupTimeSlotPayload,
  GeneratePickupSlotsPayload,
  PICKUP_SLOT_STATUS_OPTIONS,
  PickupTimeSlot,
  UpdatePickupTimeSlotPayload,
  calculateOccupancyPercent,
  calculateSlotDurationMinutes,
  getPickupSlotAvailabilityMeta,
  getPickupSlotStatusMeta,
} from './pickup-slot.model';
import {dateToTimeString, timeStringToDate} from '../branch-hours/branch-hours.model';

@Component({
  selector: 'app-pickup-slot-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzGridModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTimePickerModule,
    NzTableModule,
    NzIconModule,
    NzTooltipModule,
    NzProgressModule,
    NzAlertModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppModalComponent,
    AppPaginationComponent,
    AppSelectionBarComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './pickup-slot-list.component.html',
  styleUrls: ['./pickup-slot-list.component.scss'],
})
export class PickupSlotListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly statusOptions = PICKUP_SLOT_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  private readonly route = inject(ActivatedRoute);
  private readonly pickupSlotService = inject(PickupSlotService);
  private readonly branchService = inject(BranchService);
  private readonly branchManagementService = inject(BranchManagementService);

  // Danh sách chi nhánh & chi nhánh đang chọn
  readonly branches = signal<Array<{ id: string; name: string; code: string; address?: string | null }>>([]);
  readonly selectedBranchId = signal<string>('');

  // Lọc dữ liệu
  selectedDate: Date | null = new Date(); // Mặc định hôm nay
  searchQuery = '';
  selectedAvailability: 'all' | 'available' | 'full' = 'all';
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // Dữ liệu bảng
  readonly rawSlots = signal<PickupTimeSlot[]>([]);
  readonly loading = signal<boolean>(false);

  // Chọn hàng loạt (Selection)
  readonly setOfCheckedKeys = new Set<string>();
  checked = false;
  indeterminate = false;

  // ── KPI Thống kê ──────────────────────────────────────────────────
  readonly totalSlotsCount = computed(() => this.rawSlots().length);
  readonly availableSlotsCount = computed(() => this.rawSlots().filter(s => s.isAvailable).length);
  readonly totalBookedOrders = computed(() =>
    this.rawSlots().reduce((acc, s) => acc + (s.currentOrders || 0), 0),
  );
  readonly peakSlot = computed(() => {
    const sorted = [...this.rawSlots()].sort((a, b) => (b.currentOrders || 0) - (a.currentOrders || 0));
    return sorted.length > 0 && (sorted[0].currentOrders || 0) > 0 ? sorted[0] : null;
  });

  // ── Danh sách sau lọc & Phân trang client ──────────────────────────
  readonly filteredSlots = computed(() => {
    let list = this.rawSlots();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        s =>
          s.slotCode.toLowerCase().includes(q) ||
          s.startTime.includes(q) ||
          s.endTime.includes(q),
      );
    }

    if (this.selectedStatus) {
      list = list.filter(s => s.status === this.selectedStatus);
    }

    if (this.selectedAvailability === 'available') {
      list = list.filter(s => s.isAvailable);
    } else if (this.selectedAvailability === 'full') {
      list = list.filter(s => !s.isAvailable && s.maxOrders && s.currentOrders >= s.maxOrders);
    }

    return list;
  });

  readonly pagedSlots = computed(() => {
    const list = this.filteredSlots();
    const start = (this.pageIndex - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly total = computed(() => this.filteredSlots().length);

  // ── Modal 1: Tạo / Sửa khung giờ ─────────────────────────────────
  readonly isModalVisible = signal<boolean>(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly isSaving = signal<boolean>(false);
  editingSlotId: string | null = null;

  slotForm = this.fb.group({
    slotCode: ['', [Validators.required, Validators.maxLength(50)]],
    startTime: [null as Date | null, [Validators.required]],
    endTime: [null as Date | null, [Validators.required]],
    maxOrders: [15, [Validators.required, Validators.min(1)]],
    status: ['ACTIVE', [Validators.required]],
  });

  // ── Modal 2: Tự động sinh khung giờ liên tiếp ────────────────────
  readonly isGenerateModalVisible = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);

  generateForm = this.fb.group({
    startTime: [timeStringToDate('07:00:00') as Date | null, [Validators.required]],
    endTime: [timeStringToDate('22:00:00') as Date | null, [Validators.required]],
    stepMinutes: [30, [Validators.required, Validators.min(15), Validators.max(120)]],
    maxOrders: [15, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.breadcrumbsService.set([
      {label: 'Trang chủ', url: '/admin/home', icon: 'home'},
      {label: 'Hệ thống', url: '/admin/system/branches/list'},
      {label: 'Quản lý khung giờ Pickup', url: '/admin/system/pickup-slots/list'},
    ]);
    this.loadBranches();
  }

  /**
   * Tải danh sách chi nhánh.
   */
  private loadBranches(): void {
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

          // Đọc query param ?branchId=... hoặc lấy active branch
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
          this.toastService.error('Không thể tải danh sách chi nhánh: ' + err.message);
        },
      });
  }

  /**
   * Đổi chi nhánh đang xem.
   */
  selectBranch(branchId: string): void {
    if (!branchId) return;
    this.selectedBranchId.set(branchId);
    this.clearSelection();
    this.loadSlots();
  }

  /**
   * Tải danh sách khung giờ từ Backend theo Chi nhánh + Ngày.
   */
  loadSlots(): void {
    const branchId = this.selectedBranchId();
    if (!branchId) return;

    let dateStr: string | null = null;
    if (this.selectedDate) {
      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    this.loading.set(true);
    this.pickupSlotService
      .getSlots(branchId, dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.rawSlots.set(data);
          this.loading.set(false);
          this.refreshCheckedStatus();
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error(err.message || 'Không thể tải danh sách khung giờ pickup.');
        },
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadSlots();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedAvailability = 'all';
    this.selectedStatus = null;
    this.selectedDate = new Date();
    this.pageIndex = 1;
    this.loadSlots();
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.refreshCheckedStatus();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.refreshCheckedStatus();
  }

  // ── Checkbox Selection ───────────────────────────────────────────
  updateCheckedSet(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedKeys.add(id);
    } else {
      this.setOfCheckedKeys.delete(id);
    }
  }

  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }

  onAllChecked(value: boolean): void {
    this.pagedSlots().forEach(item => this.updateCheckedSet(item.id, value));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    const pageItems = this.pagedSlots();
    if (pageItems.length === 0) {
      this.checked = false;
      this.indeterminate = false;
      return;
    }
    this.checked = pageItems.every(item => this.setOfCheckedKeys.has(item.id));
    this.indeterminate = pageItems.some(item => this.setOfCheckedKeys.has(item.id)) && !this.checked;
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckedStatus();
  }

  // ── CRUD Modals ──────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingSlotId = null;

    // Gợi ý mã khung giờ theo giờ hiện tại
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    const startStr = `${String(nextHour).padStart(2, '0')}:00:00`;
    const endStr = `${String(nextHour).padStart(2, '0')}:30:00`;

    this.slotForm.reset({
      slotCode: `SLOT-${String(nextHour).padStart(2, '0')}00-${String(nextHour).padStart(2, '0')}30`,
      startTime: timeStringToDate(startStr),
      endTime: timeStringToDate(endStr),
      maxOrders: 15,
      status: 'ACTIVE',
    });

    this.isModalVisible.set(true);
  }

  openEditModal(slot: PickupTimeSlot): void {
    this.modalMode.set('edit');
    this.editingSlotId = slot.id;

    this.slotForm.reset({
      slotCode: slot.slotCode,
      startTime: timeStringToDate(slot.startTime),
      endTime: timeStringToDate(slot.endTime),
      maxOrders: slot.maxOrders || 15,
      status: slot.status || 'ACTIVE',
    });

    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.slotForm.reset();
  }

  /**
   * Tự động gợi ý lại mã slotCode khi đổi startTime / endTime.
   */
  onSlotTimesChanged(): void {
    const start = this.slotForm.value.startTime;
    const end = this.slotForm.value.endTime;
    if (this.modalMode() === 'create' && start && end) {
      const sH = String(start.getHours()).padStart(2, '0');
      const sM = String(start.getMinutes()).padStart(2, '0');
      const eH = String(end.getHours()).padStart(2, '0');
      const eM = String(end.getMinutes()).padStart(2, '0');
      this.slotForm.patchValue({slotCode: `SLOT-${sH}${sM}-${eH}${eM}`});
    }
  }

  submitSlotForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.slotForm)) {
      return;
    }

    const branchId = this.selectedBranchId();
    if (!branchId) return;

    const val = this.slotForm.value;
    const startStr = dateToTimeString(val.startTime);
    const endStr = dateToTimeString(val.endTime);

    if (!startStr || !endStr) {
      this.toastService.error('Vui lòng chọn đầy đủ giờ bắt đầu và kết thúc.');
      return;
    }

    const duration = calculateSlotDurationMinutes(startStr, endStr);
    if (duration <= 0) {
      this.toastService.error('Giờ bắt đầu phải trước giờ kết thúc (không áp dụng ca qua đêm cho khung giờ pickup).');
      return;
    }
    if (duration < 15 || duration > 120) {
      this.toastService.error('Độ dài mỗi khung giờ pickup phải từ 15 đến 120 phút.');
      return;
    }

    const payload: CreatePickupTimeSlotPayload = {
      slotCode: val.slotCode!.trim(),
      startTime: startStr,
      endTime: endStr,
      maxOrders: val.maxOrders || 15,
      status: val.status || 'ACTIVE',
    };

    this.isSaving.set(true);

    if (this.modalMode() === 'create') {
      this.pickupSlotService
        .createSlot(branchId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Tạo mới khung giờ pickup thành công!');
            this.closeModal();
            this.loadSlots();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error(err.message || 'Không thể tạo khung giờ.');
          },
        });
    } else if (this.editingSlotId) {
      this.pickupSlotService
        .updateSlot(branchId, this.editingSlotId, payload as UpdatePickupTimeSlotPayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Cập nhật khung giờ pickup thành công!');
            this.closeModal();
            this.loadSlots();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error(err.message || 'Không thể cập nhật khung giờ.');
          },
        });
    }
  }

  // ── Xóa một khung giờ ───────────────────────────────────────────
  onDeleteSlot(slot: PickupTimeSlot): void {
    const branchId = this.selectedBranchId();
    if (!branchId) return;

    this.modalService.confirm({
      nzTitle: `Xác nhận xóa khung giờ ${slot.slotCode}?`,
      nzContent:
        'Lưu ý: Nếu khung giờ đã từng có đơn hàng liên kết, hệ thống sẽ tự động chuyển sang trạng thái "Tạm ngừng" (INACTIVE) để bảo toàn lịch sử đơn hàng.',
      nzOkText: 'Xác nhận xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.pickupSlotService
          .deleteSlot(branchId, slot.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xử lý khung giờ ${slot.slotCode}`);
              this.setOfCheckedKeys.delete(slot.id);
              this.loadSlots();
            },
            error: err => {
              this.toastService.error(err.message || 'Lỗi khi xóa khung giờ.');
            },
          });
      },
    });
  }

  // ── Xóa hàng loạt ────────────────────────────────────────────────
  onBatchDelete(): void {
    const branchId = this.selectedBranchId();
    if (!branchId || this.setOfCheckedKeys.size === 0) return;

    const ids = Array.from(this.setOfCheckedKeys);

    this.modalService.confirm({
      nzTitle: `Xác nhận xóa ${ids.length} khung giờ đã chọn?`,
      nzContent: 'Các khung giờ đã chọn sẽ được xóa hoặc chuyển sang Tạm ngừng nếu đã có đơn hàng.',
      nzOkText: 'Xác nhận xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.loading.set(true);
        const deleteTasks = ids.map(id => this.pickupSlotService.deleteSlot(branchId, id));
        forkJoin(deleteTasks)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa/ngừng ${ids.length} khung giờ thành công!`);
              this.clearSelection();
              this.loadSlots();
            },
            error: err => {
              this.loading.set(false);
              this.toastService.error(err.message || 'Có lỗi xảy ra khi xóa hàng loạt.');
              this.loadSlots();
            },
          });
      },
    });
  }

  // ── Tự động sinh khung giờ (Generate Modal) ──────────────────────
  openGenerateModal(): void {
    this.generateForm.reset({
      startTime: timeStringToDate('07:00:00'),
      endTime: timeStringToDate('22:00:00'),
      stepMinutes: 30,
      maxOrders: 15,
    });
    this.isGenerateModalVisible.set(true);
  }

  closeGenerateModal(): void {
    this.isGenerateModalVisible.set(false);
  }

  /**
   * Tính nhẩm trước số lượng slot sẽ được sinh ra (Live Preview).
   */
  get generatePreviewCount(): number {
    const start = this.generateForm.value.startTime;
    const end = this.generateForm.value.endTime;
    const step = this.generateForm.value.stepMinutes || 30;
    if (!start || !end) return 0;
    const sMin = start.getHours() * 60 + start.getMinutes();
    const eMin = end.getHours() * 60 + end.getMinutes();
    if (eMin <= sMin) return 0;
    return Math.floor((eMin - sMin) / step);
  }

  submitGenerateSlots(): void {
    if (!this.validateAndFocusFirstInvalid(this.generateForm)) {
      return;
    }

    const branchId = this.selectedBranchId();
    if (!branchId) return;

    const val = this.generateForm.value;
    const startStr = dateToTimeString(val.startTime);
    const endStr = dateToTimeString(val.endTime);

    if (!startStr || !endStr) {
      this.toastService.error('Vui lòng chọn đầy đủ giờ bắt đầu và kết thúc.');
      return;
    }

    const payload: GeneratePickupSlotsPayload = {
      startTime: startStr,
      endTime: endStr,
      stepMinutes: val.stepMinutes || 30,
      maxOrders: val.maxOrders || 15,
    };

    this.isGenerating.set(true);
    this.pickupSlotService
      .generateSlots(branchId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: slots => {
          this.isGenerating.set(false);
          this.toastService.success(`Tự động sinh khung giờ thành công! Tổng hiện có: ${slots.length} khung giờ.`);
          this.closeGenerateModal();
          this.rawSlots.set(slots);
        },
        error: err => {
          this.isGenerating.set(false);
          this.toastService.error(err.message || 'Không thể tự động sinh khung giờ.');
        },
      });
  }

  // ── Helpers hiển thị ─────────────────────────────────────────────
  getStatusMeta(status: string) {
    return getPickupSlotStatusMeta(status);
  }

  getAvailabilityMeta(slot: PickupTimeSlot) {
    return getPickupSlotAvailabilityMeta(slot);
  }

  getOccupancyPercent(slot: PickupTimeSlot): number {
    return calculateOccupancyPercent(slot.currentOrders || 0, slot.maxOrders);
  }

  getSlotDurationLabel(slot: PickupTimeSlot): string {
    const minutes = calculateSlotDurationMinutes(slot.startTime, slot.endTime);
    return `${minutes} phút`;
  }

  navigateToBranchHours(): void {
    const branchId = this.selectedBranchId();
    if (branchId) {
      this.router.navigate(['/admin/system/branch-hours/list'], {
        queryParams: {branchId},
      });
    }
  }
}
