import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';

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
import { BranchManagementService } from '../branches/branch-management.service';
import { ScopeManagementService } from './scope-management.service';
import {
  Scope,
  ScopePayload,
  ScopeType,
  SCOPE_STATUS_ACTIVE,
  SCOPE_STATUS_OPTIONS,
  SCOPE_TYPE_OPTIONS,
  getScopeStatusMeta,
  getScopeTypeMeta,
} from './scope.model';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-scope-list',
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
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './scope-list.component.html',
  styleUrls: ['./scope-list.component.scss'],
})
export class ScopeListComponent extends BaseComponent implements OnInit {
  // ── Public state ────────────────────────────────────────────────
  readonly ROLE = ROLE;
  readonly scopeTypeOptions = SCOPE_TYPE_OPTIONS;
  readonly statusOptions = SCOPE_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  readonly allLoadedScopes = signal<Scope[]>([]);
  readonly scopes = signal<Scope[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  /** Danh sách chi nhánh cho dropdown khi chọn loại STORE / WAREHOUSE. */
  readonly branchOptions = signal<{ label: string; value: string }[]>([]);

  readonly isFormModalVisible = signal(false);

  /** Phạm vi đang sửa (null = thêm mới). */
  selectedScopeForEdit: Scope | null = null;

  // Filter params (BE trả về toàn bộ danh sách nên lọc/sort/phân trang ở FE)
  selectedType: ScopeType | null = null;
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  readonly typeFilterOptions = [{ label: 'Tất cả loại', value: '' }, ...SCOPE_TYPE_OPTIONS];

  // Column-based In-Memory Filter
  columnFilter = new ColumnTextFilter<Scope>(() => this.allLoadedScopes(), {
    branchName: 'contains',
    status: 'equals',
  });

  // Form Reactive
  scopeForm = this.fb.group({
    scopeType: [null as ScopeType | null, [Validators.required]],
    branchId: [null as string | null],
    status: ['ACTIVE' as string, [Validators.required]],
  });

  readonly pagedScopes = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.scopes().slice(start, start + this.pageSize);
  });

  // Sorting helpers
  sortTypeFn = createSortFn<Scope>('scopeType');
  sortStatusFn = createSortFn<Scope>('status');

  // ── Private dependencies ────────────────────────────────────────
  private readonly scopeManagementService = inject(ScopeManagementService);
  private readonly branchManagementService = inject(BranchManagementService);

  get isEditMode(): boolean {
    return !!this.selectedScopeForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode ? 'Cập nhật phạm vi truy cập' : 'Thêm mới phạm vi truy cập';
  }

  /** Loại phạm vi đang chọn trên form (để ẩn/hiện dropdown chi nhánh). */
  get formScopeType(): ScopeType | null {
    return this.scopeForm.getRawValue().scopeType ?? null;
  }

  /** STORE / WAREHOUSE bắt buộc gắn chi nhánh theo ràng buộc DB phía BE. */
  get isBranchRequired(): boolean {
    const type = this.formScopeType;
    return type === 'STORE' || type === 'WAREHOUSE';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/accounts/list' },
      { label: 'Quản lý phạm vi', url: '/admin/system/scopes/list' },
    ]);

    // Ràng buộc động: ALL_SYSTEM không cần chi nhánh, còn lại bắt buộc
    this.scopeForm
      .get('scopeType')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        const branchCtrl = this.scopeForm.get('branchId')!;
        if (type === 'ALL_SYSTEM') {
          branchCtrl.clearValidators();
          if (branchCtrl.value) {
            branchCtrl.setValue(null);
          }
        } else {
          branchCtrl.setValidators(Validators.required);
        }
        branchCtrl.updateValueAndValidity();
      });

    this.loadData();
    this.loadBranchOptions();
  }

  loadData(): void {
    this.loading.set(true);
    this.scopeManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.allLoadedScopes.set(list ?? []);
          this.applyView();
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách phạm vi.');
        },
      });
  }

  searchByField(field: keyof Scope, value: unknown): void {
    this.columnFilter.setField(field, value);
    this.applyView();
  }

  resetAllFieldFilter(): void {
    this.columnFilter.reset();
    this.applyView();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  onFilterChange(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.applyView();
  }

  onResetFilters(): void {
    this.selectedType = null;
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
    this.selectedScopeForEdit = null;
    this.scopeForm.reset({
      scopeType: null,
      branchId: null,
      status: SCOPE_STATUS_ACTIVE,
    });
    this.isFormModalVisible.set(true);
  }

  openEditModal(scope: Scope): void {
    this.selectedScopeForEdit = { ...scope };
    this.scopeForm.reset({
      scopeType: scope.scopeType,
      branchId: scope.branchId ?? null,
      status: scope.status || SCOPE_STATUS_ACTIVE,
    });
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.scopeForm)) {
      return;
    }
    if (this.isBranchRequired && !this.scopeForm.get('branchId')?.value) {
      this.toastService.error('Loại "Cửa hàng" hoặc "Kho" bắt buộc phải chọn chi nhánh.');
      return;
    }

    const formRaw = this.scopeForm.getRawValue();
    const type = formRaw.scopeType!;
    const payload: ScopePayload = {
      scopeType: type,
      branchId: type === 'ALL_SYSTEM' ? null : (formRaw.branchId ?? null),
      status: formRaw.status || SCOPE_STATUS_ACTIVE,
    };

    this.isSaving.set(true);

    if (this.isEditMode && this.selectedScopeForEdit) {
      this.scopeManagementService
        .update(this.selectedScopeForEdit.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật phạm vi truy cập');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật phạm vi.');
          },
        });
    } else {
      this.scopeManagementService
        .create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: created => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã thêm mới phạm vi "${getScopeTypeMeta(created.scopeType).label}"`);
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm phạm vi. Phạm vi có thể đã tồn tại.');
          },
        });
    }
  }

  onDeleteScope(scope: Scope): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa phạm vi',
      nzContent: `Hành động này sẽ xóa vĩnh viễn phạm vi <strong>${getScopeTypeMeta(scope.scopeType).label}${
        scope.branchName ? ' - ' + scope.branchName : ''
      }</strong>. Các phân quyền đang dùng phạm vi này có thể bị ảnh hưởng!`,
      nzOkText: 'Xóa vĩnh viễn',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.scopeManagementService
          .delete(scope.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Đã xóa phạm vi thành công');
              this.loadData();
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Không thể xóa phạm vi này.');
            },
          });
      },
    });
  }

  getTypeMeta(scopeType: string | null | undefined): { label: string; badgeClass: string } {
    return getScopeTypeMeta(scopeType);
  }

  getStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
    return getScopeStatusMeta(status);
  }

  private loadBranchOptions(): void {
    this.branchManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.branchOptions.set((list ?? []).map(b => ({ label: `${b.code} - ${b.name}`, value: b.id }))),
        error() {
          /* Dropdown chi nhánh trống vẫn không chặn màn hình danh sách */
        },
      });
  }

  /** Tổng hợp toàn bộ lớp lọc rồi cập nhật view + phân trang. */
  private applyView(): void {
    let list = [...this.columnFilter.apply()];

    if (this.selectedType) {
      list = list.filter(s => s.scopeType === this.selectedType);
    }
    if (this.selectedStatus) {
      list = list.filter(s => s.status === this.selectedStatus);
    }

    this.scopes.set(list);
    this.total.set(list.length);
    const maxPage = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.pageIndex > maxPage) {
      this.pageIndex = maxPage;
    }
  }
}
