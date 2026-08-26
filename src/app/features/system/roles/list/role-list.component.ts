import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { BaseComponent } from '../../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../../shared/app-modal/app-modal.component';
import { AppSelectionBarComponent } from '../../../../shared/app-selection-bar/app-selection-bar.component';
import { AppTableSearchInputComponent } from '../../../../shared/app-table-search-input/app-table-search-input.component';
import { ColumnTextFilter } from '../../../../shared/utils/column-text-filter';
import { RoleService } from '../services/role.service';
import {
  Role,
  RoleAssignedUser,
  RoleFilter,
  RoleFormDTO,
  RoleStatus,
  ROLE_STATUS_OPTIONS,
  getRoleStatusMeta,
} from '../models/role.model';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from '../../../../shared/constants/constant';
import { createSortFn } from '../../../../shared/helpers/table.helper';
import { AppBreadcrumbsComponent } from '../../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { HasSomeAuthorityDirective } from '../../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../../core/config/functions.constants';
import { RoleUserModalComponent } from '../components/role-user-modal.component';
import { forkJoin, map, takeUntil } from 'rxjs';

@Component({
  selector: 'app-role-list',
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
    NzTagModule,
    NzTooltipModule,
    NzAvatarModule,
    NzBadgeModule,
    NzPopconfirmModule,
    NzDividerModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppSelectionBarComponent,
    AppTableSearchInputComponent,
    RoleUserModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.scss'],
})
export class RoleListComponent extends BaseComponent implements OnInit {
  private readonly roleService = inject(RoleService);

  readonly ROLE = ROLE;
  readonly RoleStatus = RoleStatus;
  readonly statusOptions = ROLE_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly getRoleStatusMeta = getRoleStatusMeta;

  // ── State signals ───────────────────────────────────────────────────
  readonly allLoadedRoles = signal<Role[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  // ── Column-based in-memory filter ───────────────────────────────────
  columnFilter = new ColumnTextFilter<Role>(
    () => this.allLoadedRoles(),
    {
      name: 'contains',
      code: 'contains',
      description: 'contains',
      active: 'equals',
      createdAt: 'contains',
    }
  );

  readonly statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: '' },
    { label: 'Đang hoạt động', value: true },
    { label: 'Ngừng hoạt động', value: false },
  ];

  // ── Search & Filter Params ──────────────────────────────────────────
  searchQuery = '';
  selectedStatus: 'active' | 'inactive' | 'deleted' | 'all' = 'all';
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Selection State ─────────────────────────────────────────────────
  readonly setOfCheckedKeys = new Set<string>();
  allChecked = false;
  indeterminate = false;

  // ── Modals State ────────────────────────────────────────────────────
  isAddModalVisible = false;
  isEditModalVisible = false;
  isCloneModalVisible = false;
  isUserModalVisible = false;

  selectedRoleForAction: Role | null = null;
  readonly selectedRoleUsers = signal<RoleAssignedUser[]>([]);
  readonly userModalLoading = signal(false);

  // ── Forms ───────────────────────────────────────────────────────────
  addRoleForm = this.fb.group({
    name: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(255)]],
    active: [true, [Validators.required]],
    copyFromRoleId: [''],
  });

  editRoleForm = this.fb.group({
    name: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    code: [{ value: '', disabled: true }],
    description: ['', [Validators.maxLength(255)]],
    active: [true, [Validators.required]],
  });

  cloneRoleForm = this.fb.group({
    name: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
  });

  // ── Sorting Helpers ─────────────────────────────────────────────────
  sortNameFn = createSortFn<Role>('name');
  sortCodeFn = createSortFn<Role>('code');
  sortAccountCountFn = createSortFn<Role>('accountCount');
  sortCreatedFn = createSortFn<Role>('createdAt');

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/roles/list' },
      { label: 'Quản lý vai trò', url: '/admin/system/roles/list' },
    ]);

    // Tự sinh mã vai trò từ tên vai trò khi thêm mới
    this.addRoleForm.get('name')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(name => {
      const codeCtrl = this.addRoleForm.get('code');
      if (!codeCtrl?.dirty && name) {
        const codeGen = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toUpperCase()
          .replace(/_+/g, '_')
          .slice(0, 30);
        codeCtrl?.setValue(codeGen, { emitEvent: false });
      }
    });

    this.loadData();
  }

  // ── Data Loading ────────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: RoleFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.roleService
      .getRoles(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedRoles.set(res.items);
          this.roles.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
          this.enrichAccountCounts(res.items);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Lỗi', 'Không thể tải danh sách vai trò.');
        },
      });
  }

  // ── Enrich số lượng tài khoản thực tế từ API users-by-role ───────────
  private enrichAccountCounts(roles: Role[]): void {
    if (!roles.length) {
      return;
    }
    forkJoin(
      roles.map(r =>
        this.roleService.getAssignedUsers(r.id).pipe(map(users => ({ id: r.id, count: users.length })))
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        const counts = new Map(updates.map(u => [u.id, u.count]));
        const enriched = this.allLoadedRoles().map(r => ({ ...r, accountCount: counts.get(r.id) ?? 0 }));
        this.allLoadedRoles.set(enriched);
        this.roles.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : enriched);
      });
  }

  // ── Filter Methods ──────────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  searchByField(field: keyof Role, value: unknown): void {
    const filtered = this.columnFilter.setField(field, value);
    this.roles.set(filtered);
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    const resetList = this.columnFilter.reset();
    this.roles.set(resetList);
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  // ── Selection Methods ───────────────────────────────────────────────
  onCheckAll(checked: boolean): void {
    this.roles().forEach(row => {
      if (!row.isDefault) {
        if (checked) {
          this.setOfCheckedKeys.add(row.id);
        } else {
          this.setOfCheckedKeys.delete(row.id);
        }
      }
    });
    this.refreshCheckState();
  }

  onCheckRow(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedKeys.add(id);
    } else {
      this.setOfCheckedKeys.delete(id);
    }
    this.refreshCheckState();
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckState();
  }

  refreshCheckState(): void {
    const nonDefaultRoles = this.roles().filter(r => !r.isDefault);
    const count = nonDefaultRoles.length;
    const checkedCount = nonDefaultRoles.filter(r => this.setOfCheckedKeys.has(r.id)).length;

    this.allChecked = count > 0 && checkedCount === count;
    this.indeterminate = checkedCount > 0 && checkedCount < count;
  }

  // ── Navigation to Permission ────────────────────────────────────────
  navigateToPermission(role: Role): void {
    this.router.navigate(['/admin/system/roles/edit'], {
      queryParams: { id: role.id },
      state: { role },
    });
  }

  // ── Modal Actions ───────────────────────────────────────────────────
  openAddModal(): void {
    this.addRoleForm.reset({
      name: '',
      code: '',
      description: '',
      active: true,
      copyFromRoleId: '',
    });
    this.isAddModalVisible = true;
  }

  submitAddRole(): void {
    if (!this.validateAndFocusFirstInvalid(this.addRoleForm)) return;

    this.isSaving.set(true);
    const formVal = this.addRoleForm.value;
    const dto: RoleFormDTO = {
      name: formVal.name?.trim() || '',
      code: formVal.code?.trim(),
      description: formVal.description?.trim(),
      active: !!formVal.active,
      copyFromRoleId: formVal.copyFromRoleId || undefined,
    };

    this.roleService.saveRole(dto).subscribe({
      next: createdRole => {
        this.isSaving.set(false);
        this.isAddModalVisible = false;
        this.toastService.success('Thành công', `Đã tạo vai trò "${createdRole.name}".`);
        this.loadData();
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', 'Không thể tạo mới vai trò.');
      },
    });
  }

  openEditModal(role: Role): void {
    this.selectedRoleForAction = role;
    this.editRoleForm.reset({
      name: role.name,
      code: role.code,
      description: role.description || '',
      active: role.active,
    });
    this.isEditModalVisible = true;
  }

  submitEditRole(): void {
    if (!this.selectedRoleForAction) return;
    if (!this.validateAndFocusFirstInvalid(this.editRoleForm)) return;

    this.isSaving.set(true);
    const formVal = this.editRoleForm.value;
    const dto: RoleFormDTO = {
      id: this.selectedRoleForAction.id,
      name: formVal.name?.trim() || '',
      description: formVal.description?.trim(),
      active: !!formVal.active,
    };

    this.roleService.saveRole(dto).subscribe({
      next: updated => {
        this.isSaving.set(false);
        this.isEditModalVisible = false;
        this.toastService.success('Thành công', `Đã cập nhật vai trò "${updated.name}".`);
        this.loadData();
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', 'Không thể cập nhật vai trò.');
      },
    });
  }

  openCloneModal(role: Role): void {
    this.selectedRoleForAction = role;
    this.cloneRoleForm.reset({
      name: `${role.name} (Bản sao)`,
      description: role.description || '',
    });
    this.isCloneModalVisible = true;
  }

  submitCloneRole(): void {
    if (!this.selectedRoleForAction) return;
    if (!this.validateAndFocusFirstInvalid(this.cloneRoleForm)) return;

    this.isSaving.set(true);
    const formVal = this.cloneRoleForm.value;

    this.roleService
      .cloneRole(this.selectedRoleForAction.id, formVal.name?.trim() || '', formVal.description?.trim())
      .subscribe({
        next: cloned => {
          this.isSaving.set(false);
          this.isCloneModalVisible = false;
          this.toastService.success('Thành công', `Đã nhân bản vai trò "${cloned.name}".`);
          this.loadData();
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', 'Không thể nhân bản vai trò.');
        },
      });
  }

  openUserModal(role: Role): void {
    this.selectedRoleForAction = role;
    this.userModalLoading.set(true);
    this.isUserModalVisible = true;

    this.roleService.getAssignedUsers(role.id).subscribe({
      next: users => {
        this.selectedRoleUsers.set(users);
        this.userModalLoading.set(false);
      },
      error: () => {
        this.selectedRoleUsers.set([]);
        this.userModalLoading.set(false);
      },
    });
  }

  onDeleteRole(role: Role): void {
    if (role.isDefault) {
      this.toastService.warning('Cảnh báo', 'Không thể xóa vai trò mặc định của hệ thống.');
      return;
    }

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa vai trò',
      nzContent: `Bạn có chắc chắn muốn xóa vai trò "<strong>${role.name}</strong>"? Các tài khoản đang gán vai trò này sẽ bị ảnh hưởng.`,
      nzOkText: 'Xóa vai trò',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.roleService.deleteRole(role.id).subscribe({
          next: () => {
            this.toastService.success('Thành công', `Đã xóa vai trò "${role.name}".`);
            this.loadData();
          },
          error: () => this.toastService.error('Lỗi', 'Không thể xóa vai trò.'),
        });
      },
    });
  }

  onRestoreRole(role: Role): void {
    this.roleService.restoreRole(role.id).subscribe({
      next: () => {
        this.toastService.success('Thành công', `Đã khôi phục vai trò "${role.name}".`);
        this.loadData();
      },
      error: () => this.toastService.error('Lỗi', 'Không thể khôi phục vai trò.'),
    });
  }

  onBatchStatus(active: boolean): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.roleService.batchUpdateStatus(ids, active).subscribe({
      next: count => {
        this.toastService.success('Thành công', `Đã ${active ? 'kích hoạt' : 'khóa'} ${count} vai trò.`);
        this.clearSelection();
        this.loadData();
      },
      error: () => this.toastService.error('Lỗi', 'Thao tác hàng loạt thất bại.'),
    });
  }

  onBatchDelete(): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${ids.length}</strong> vai trò đã chọn?`,
      nzOkText: 'Xóa tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.roleService.batchDelete(ids).subscribe({
          next: count => {
            this.toastService.success('Thành công', `Đã xóa ${count} vai trò.`);
            this.clearSelection();
            this.loadData();
          },
          error: () => this.toastService.error('Lỗi', 'Xóa hàng loạt thất bại.'),
        });
      },
    });
  }

  onExportExcel(): void {
    this.toastService.info('Tính năng xuất file Excel đang được xử lý...');
  }
}
