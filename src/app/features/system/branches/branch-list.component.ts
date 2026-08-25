import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppTableSearchInputComponent } from '../../../shared/app-table-search-input/app-table-search-input.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { ColumnTextFilter } from '../../../shared/utils/column-text-filter';
import { EnterAsTabContainerDirective } from '../../../shared/directives/enter-as-tab-container.directive';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { createSortFn } from '../../../shared/helpers/table.helper';
import { BranchManagementService } from './branch-management.service';
import { Branch, BranchPayload, BRANCH_STATUS_ACTIVE, BRANCH_STATUS_OPTIONS, getBranchStatusMeta } from './branch.model';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    NzSwitchModule,
    NzGridModule,
    NzInputNumberModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './branch-list.component.html',
  styleUrls: ['./branch-list.component.scss'],
})
export class BranchListComponent extends BaseComponent implements OnInit {
  // ── Public state ────────────────────────────────────────────────
  readonly ROLE = ROLE;
  readonly statusOptions = BRANCH_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  readonly allLoadedBranches = signal<Branch[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  readonly isFormModalVisible = signal(false);

  /** Chi nhánh đang sửa (null = thêm mới). */
  selectedBranchForEdit: Branch | null = null;

  // Filter params (BE trả về toàn bộ danh sách nên lọc/phân trang ở FE)
  searchQuery = '';
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  readonly statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: '' },
    ...BRANCH_STATUS_OPTIONS.map(opt => ({ label: opt.label, value: opt.value })),
  ];

  // Column-based In-Memory Filter
  columnFilter = new ColumnTextFilter<Branch>(() => this.allLoadedBranches(), {
    code: 'contains',
    name: 'contains',
    parentName: 'contains',
    address: 'contains',
    phone: 'contains',
    status: 'equals',
  });

  // Form Reactive
  branchForm = this.fb.group({
    code: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(50)]],
    name: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(150)]],
    address: ['', [Validators.maxLength(255)]],
    phone: ['', [Validators.pattern(/^[0-9+() -]*$/), Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    timezone: ['Asia/Ho_Chi_Minh', [Validators.maxLength(50)]],
    supportsPickup: [false],
    supportsDelivery: [false],
    averagePreparationMinutes: [15, [Validators.min(0), Validators.max(1440)]],
    parentId: [null as string | null],
    status: ['ACTIVE' as string, [Validators.required]],
  });

  // Sorting helpers
  sortCodeFn = createSortFn<Branch>('code');
  sortNameFn = createSortFn<Branch>('name');
  sortAddressFn = createSortFn<Branch>('address');
  sortPhoneFn = createSortFn<Branch>('phone');
  sortStatusFn = createSortFn<Branch>('status');

  readonly pagedBranches = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.branches().slice(start, start + this.pageSize);
  });

  /** Danh sách chi nhánh cha khả dụng (loại trừ chính chi nhánh đang sửa). */
  readonly parentOptions = computed(() => this.allLoadedBranches().filter(b => b.id !== this.selectedBranchForEdit?.id));

  // ── Private dependencies ────────────────────────────────────────
  private readonly branchManagementService = inject(BranchManagementService);

  get isEditMode(): boolean {
    return !!this.selectedBranchForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode ? `Cập nhật chi nhánh: ${this.selectedBranchForEdit?.name || ''}` : 'Thêm mới chi nhánh';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/accounts/list' },
      { label: 'Quản lý chi nhánh', url: '/admin/system/branches/list' },
    ]);

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.branchManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.allLoadedBranches.set(list ?? []);
          this.applyView();
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách chi nhánh.');
        },
      });
  }

  searchByField(field: keyof Branch, value: unknown): void {
    this.columnFilter.setField(field, value);
    this.applyView();
  }

  resetAllFieldFilter(): void {
    this.columnFilter.reset();
    this.applyView();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.applyView();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.applyView();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
  }

  openCreateModal(): void {
    this.selectedBranchForEdit = null;
    this.branchForm.reset({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      timezone: 'Asia/Ho_Chi_Minh',
      supportsPickup: false,
      supportsDelivery: false,
      averagePreparationMinutes: 15,
      parentId: null,
      status: BRANCH_STATUS_ACTIVE,
    });
    this.isFormModalVisible.set(true);
  }

  openEditModal(branch: Branch): void {
    this.selectedBranchForEdit = { ...branch };
    this.branchForm.reset({
      code: branch.code,
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      timezone: branch.timezone ?? 'Asia/Ho_Chi_Minh',
      supportsPickup: !!branch.supportsPickup,
      supportsDelivery: !!branch.supportsDelivery,
      averagePreparationMinutes: branch.averagePreparationMinutes ?? 15,
      parentId: branch.parentId ?? null,
      status: branch.status || BRANCH_STATUS_ACTIVE,
    });
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.branchForm)) {
      return;
    }

    const formRaw = this.branchForm.getRawValue();
    const payload: BranchPayload = {
      code: (formRaw.code || '').trim(),
      name: (formRaw.name || '').trim(),
      address: formRaw.address || null,
      phone: formRaw.phone || null,
      email: formRaw.email || null,
      timezone: formRaw.timezone || null,
      supportsPickup: !!formRaw.supportsPickup,
      supportsDelivery: !!formRaw.supportsDelivery,
      averagePreparationMinutes: formRaw.averagePreparationMinutes ?? 15,
      parentId: formRaw.parentId ?? null,
      status: formRaw.status || BRANCH_STATUS_ACTIVE,
    };

    this.isSaving.set(true);

    if (this.isEditMode && this.selectedBranchForEdit) {
      this.branchManagementService
        .update(this.selectedBranchForEdit.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã cập nhật chi nhánh "${updated.name}"`);
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật chi nhánh.');
          },
        });
    } else {
      this.branchManagementService
        .create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: created => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã thêm mới chi nhánh "${created.name}"`);
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm chi nhánh.');
          },
        });
    }
  }

  onDeleteBranch(branch: Branch): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa chi nhánh',
      nzContent: `Hành động này sẽ xóa vĩnh viễn chi nhánh <strong>${branch.name}</strong> (${branch.code}). Hành động không thể hoàn tác!`,
      nzOkText: 'Xóa vĩnh viễn',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.branchManagementService
          .delete(branch.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Đã xóa chi nhánh thành công');
              this.loadData();
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Chi nhánh đang được tham chiếu bởi dữ liệu khác (phạm vi, giờ hoạt động...).');
            },
          });
      },
    });
  }

  getStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
    return getBranchStatusMeta(status);
  }

  /** Tổng hợp toàn bộ lớp lọc (cột + thanh tìm kiếm) rồi cập nhật view + phân trang. */
  private applyView(): void {
    let list = [...this.columnFilter.apply()];

    const keyword = this.searchQuery.trim().toLowerCase();
    if (keyword) {
      list = list.filter(
        b =>
          b.code.toLowerCase().includes(keyword) ||
          b.name.toLowerCase().includes(keyword) ||
          (b.address ?? '').toLowerCase().includes(keyword) ||
          (b.phone ?? '').toLowerCase().includes(keyword),
      );
    }
    if (this.selectedStatus) {
      list = list.filter(b => b.status === this.selectedStatus);
    }

    this.branches.set(list);
    this.total.set(list.length);
    const maxPage = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.pageIndex > maxPage) {
      this.pageIndex = maxPage;
    }
  }
}
