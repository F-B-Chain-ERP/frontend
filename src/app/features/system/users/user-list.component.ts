import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppOverflowTagsComponent } from '../../../shared/app-overflow-tags/app-overflow-tags.component';
import { AppSelectionBarComponent } from '../../../shared/app-selection-bar/app-selection-bar.component';
import { AppTableSearchInputComponent } from '../../../shared/app-table-search-input/app-table-search-input.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { ColumnTextFilter } from '../../../shared/utils/column-text-filter';
import { EnterAsTabContainerDirective } from '../../../shared/directives/enter-as-tab-container.directive';
import { UserService } from './user.service';
import { BranchManagementService } from '../branches/branch-management.service';
import { BranchService } from '../../../core/auth/branch.service';
import { AccountService } from '../../../core/auth/account.service';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  User,
  UserFilter,
  UserFormDTO,
  UserStatus,
  USER_STATUS_OPTIONS,
  getUserStatusMeta,
} from './user.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { createSortFn } from '../../../shared/helpers/table.helper';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-list',
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
    NzSwitchModule,
    NzTooltipModule,
    NzAvatarModule,
    NzBadgeModule,
    NzPopconfirmModule,
    NzDividerModule,
    NzGridModule,
    NzDescriptionsModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppOverflowTagsComponent,
    AppSelectionBarComponent,
    AppTableSearchInputComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent extends BaseComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly branchManagementService = inject(BranchManagementService);
  private readonly branchService = inject(BranchService);
  private readonly accountService = inject(AccountService);
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  readonly ROLE = ROLE;
  readonly UserStatus = UserStatus;
  readonly statusOptions = USER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Branch & Role state
  readonly branchOptions = signal<{ label: string; value: string }[]>([]);
  readonly branchMap = new Map<string, string>();
  readonly roleOptions = signal<{ label: string; value: string }[]>([]);
  readonly roleMap = new Map<string, string>();

  // State signals
  readonly allLoadedUsers = signal<User[]>([]);
  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  // Column-based In-Memory Filter
  columnFilter = new ColumnTextFilter<User>(
    () => this.allLoadedUsers(),
    {
      status: 'equals',
      primaryBranchName: 'contains',
      roles: 'contains',
      createdAt: 'contains',
    }
  );

  readonly statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: '' },
    { label: 'Đang hoạt động', value: UserStatus.ACTIVE },
    { label: 'Ngừng hoạt động', value: UserStatus.INACTIVE },
  ];

  searchByField(field: keyof User, value: unknown): void {
    const filtered = this.columnFilter.setField(field, value);
    this.users.set(filtered);
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    const resetList = this.columnFilter.reset();
    this.users.set(resetList);
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  // Filter params
  searchQuery = '';
  selectedStatus: UserStatus | null = null;
  selectedBranchId: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;

  // Selection state
  readonly setOfCheckedKeys = new Set<string | number>();
  allChecked = false;
  indeterminate = false;

  // Modals state
  isFormModalVisible = signal(false);
  isDetailModalVisible = signal(false);
  selectedUserForEdit: User | null = null;
  selectedUserForDetail: User | null = null;

  // Form Reactive
  userForm = this.fb.group({
    fullName: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    username: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(50)]],
    phoneNumber: ['', [Validators.pattern(/^[0-9+() -]*$/), Validators.maxLength(15)]],
    password: ['', [Validators.minLength(8), Validators.maxLength(128)]],
    status: [UserStatus.ACTIVE, [Validators.required]],
    primaryBranchId: ['', [Validators.required]],
    roleIds: [[] as string[]],
    note: ['', [Validators.maxLength(500)]],
  });

  // Sorting helpers
  sortNameFn = createSortFn<User>('fullName');
  sortEmailFn = createSortFn<User>('email');
  sortBranchFn = createSortFn<User>('primaryBranchName');
  sortStatusFn = createSortFn<User>('status');
  sortCreatedFn = createSortFn<User>('createdAt');

  get isEditMode(): boolean {
    return !!this.selectedUserForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode
      ? `Cập nhật người dùng: ${this.selectedUserForEdit?.fullName || ''}`
      : 'Thêm mới người dùng';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/accounts/list' },
      { label: 'Quản lý người dùng', url: '/admin/system/accounts/list' },
    ]);

    // Gợi ý username tự động từ email khi thêm mới
    this.userForm.get('email')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(email => {
      if (!this.isEditMode && email) {
        const usernameControl = this.userForm.get('username');
        if (!usernameControl?.dirty && email.includes('@')) {
          const suggested = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
          usernameControl?.setValue(suggested, { emitEvent: false });
        }
      }
    });

    this.loadBranches();
    this.loadRoles();
    this.loadData();
  }

  /**
   * Tải danh sách chi nhánh (Admin xem full, Manager xem chi nhánh được phân công)
   */
  private loadBranches(): void {
    const isGlobalAdmin = this.accountService.hasAnyAuthority(['FULL_PERMISSION', 'sys:branch:view', 'ROLE_ADMIN']);
    const branchSource$ = isGlobalAdmin
      ? this.branchManagementService.getAll()
      : this.branchService.getMine();

    branchSource$.pipe(takeUntil(this.destroy$)).subscribe({
      next: branches => {
        const opts = (branches || []).map(b => ({
          label: `${b.name} (${b.code})`,
          value: b.id,
        }));
        this.branchOptions.set(opts);
        this.branchMap.clear();
        (branches || []).forEach(b => this.branchMap.set(b.id, b.name));

        // Re-map primaryBranchName on loaded users
        if (this.allLoadedUsers().length > 0) {
          const updated = this.allLoadedUsers().map(u => ({
            ...u,
            primaryBranchName: (u.primaryBranchId ? this.branchMap.get(u.primaryBranchId) : undefined) || u.primaryBranchName || '—',
          }));
          this.allLoadedUsers.set(updated);
          this.users.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : updated);
        }
      },
      error: () => {
        // Fallback options
        this.branchOptions.set([]);
      },
    });
  }

  /**
   * Tải danh sách vai trò từ API backend
   */
  private loadRoles(): void {
    const roleApi = this.applicationConfigService.getEndpointFor('api/v1/roles');
    this.http.get<{ data?: { content?: Array<{ id: string; name: string; code: string }> } }>(roleApi, {
      params: { page: '0', size: '100' }
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        const roles = res.data?.content || [];
        if (roles.length > 0) {
          const opts = roles.map(r => ({ label: `${r.name} (${r.code})`, value: r.id }));
          this.roleOptions.set(opts);
          this.roleMap.clear();
          roles.forEach(r => this.roleMap.set(r.id, r.name));
        } else {
          this.setFallbackRoles();
        }
      },
      error: () => {
        this.setFallbackRoles();
      }
    });
  }

  private setFallbackRoles(): void {
    const fallback = [
      { label: 'Quản trị hệ thống (ADMIN)', value: 'ADMIN' },
      { label: 'Quản lý chi nhánh (BRANCH_MGR)', value: 'BRANCH_MGR' },
      { label: 'Quản lý kho (WAREHOUSE_MGR)', value: 'WAREHOUSE_MGR' },
      { label: 'Nhân viên bán hàng (POS_STAFF)', value: 'POS_STAFF' },
      { label: 'Nhân viên kho (WAREHOUSE_STAFF)', value: 'WAREHOUSE_STAFF' },
      { label: 'Nhân viên pha chế (BARISTA)', value: 'BARISTA' },
      { label: 'Kế toán viên (ACCOUNTANT)', value: 'ACCOUNTANT' },
    ];
    this.roleOptions.set(fallback);
    fallback.forEach(r => this.roleMap.set(r.value, r.label));
  }

  getBranchName(branchId: string | null | undefined): string {
    if (!branchId) return '—';
    return this.branchMap.get(branchId) || branchId;
  }

  /**
   * Load danh sách người dùng từ service
   */
  loadData(): void {
    this.loading.set(true);
    const filter: UserFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      branchId: this.selectedBranchId,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };

    this.userService
      .getUsers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const mappedItems = res.items.map(u => ({
            ...u,
            primaryBranchName: (u.primaryBranchId ? this.branchMap.get(u.primaryBranchId) : undefined) || u.primaryBranchName || '—',
          }));
          this.allLoadedUsers.set(mappedItems);
          this.users.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : mappedItems);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách người dùng.');
        },
      });
  }

  /**
   * Tìm kiếm dữ liệu theo từ khóa và trạng thái
   */
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  /**
   * Làm mới bộ lọc tìm kiếm
   */
  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  /**
   * Thay đổi trang
   */
  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  /**
   * Thay đổi kích thước trang
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  /**
   * Xử lý chọn / bỏ chọn checkbox hàng loạt (UI-Kit Custom Checkbox .cb)
   */
  onCheckAll(checked: boolean): void {
    this.users().forEach(row => {
      if (checked) {
        this.setOfCheckedKeys.add(row.id);
      } else {
        this.setOfCheckedKeys.delete(row.id);
      }
    });
    this.refreshCheckState();
  }

  /**
   * Xử lý chọn / bỏ chọn 1 dòng (UI-Kit Custom Checkbox .cb)
   */
  onCheckRow(id: string | number, checked: boolean): void {
    if (checked) {
      this.setOfCheckedKeys.add(id);
    } else {
      this.setOfCheckedKeys.delete(id);
    }
    this.refreshCheckState();
  }

  private refreshCheckState(): void {
    const list = this.users();
    const checkedCount = list.filter(r => this.setOfCheckedKeys.has(r.id)).length;
    const totalCurrent = list.length;
    this.allChecked = totalCurrent > 0 && checkedCount === totalCurrent;
    this.indeterminate = checkedCount > 0 && checkedCount < totalCurrent;
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckState();
  }

  /**
   * Mở modal thêm mới người dùng
   */
  openCreateModal(): void {
    this.selectedUserForEdit = null;
    const branches = this.branchOptions();
    const defaultBranchId = branches.length === 1 ? branches[0].value : (branches.length > 0 ? branches[0].value : '');
    this.userForm.reset({
      fullName: '',
      email: '',
      username: '',
      phoneNumber: '',
      password: '',
      status: UserStatus.ACTIVE,
      primaryBranchId: defaultBranchId,
      roleIds: [],
      note: '',
    });
    this.userForm.get('username')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.userForm.get('password')?.enable();
    this.isFormModalVisible.set(true);
  }

  /**
   * Mở modal chỉnh sửa người dùng
   */
  openEditModal(user: User): void {
    this.selectedUserForEdit = { ...user };
    this.userForm.reset({
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber || '',
      password: '',
      status: user.status,
      primaryBranchId: user.primaryBranchId || '',
      roleIds: user.roleIds || [],
      note: user.note || '',
    });
    this.userForm.get('username')?.disable();
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.setValue('');
    this.userForm.get('password')?.disable();
    this.isFormModalVisible.set(true);
  }

  /**
   * Mở modal xem chi tiết người dùng
   */
  openDetailModal(user: User): void {
    this.selectedUserForDetail = user;
    this.isDetailModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  closeDetailModal(): void {
    this.isDetailModalVisible.set(false);
  }

  switchToEditFromDetail(): void {
    if (this.selectedUserForDetail) {
      const user = this.selectedUserForDetail;
      this.closeDetailModal();
      this.openEditModal(user);
    }
  }

  /**
   * Lưu biểu mẫu người dùng
   */
  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.userForm)) {
      return;
    }

    const formRaw = this.userForm.getRawValue();
    const payload: UserFormDTO = {
      fullName: formRaw.fullName || '',
      email: formRaw.email || '',
      username: formRaw.username || '',
      phoneNumber: formRaw.phoneNumber || '',
      password: formRaw.password || '',
      status: Number(formRaw.status) as UserStatus,
      primaryBranchId: formRaw.primaryBranchId || null,
      roleIds: formRaw.roleIds || [],
      note: formRaw.note || '',
    };

    this.isSaving.set(true);

    if (this.isEditMode && this.selectedUserForEdit) {
      this.userService
        .updateUser(this.selectedUserForEdit.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updatedUser => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã cập nhật thông tin người dùng "${updatedUser.fullName}"`);
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật người dùng.');
          },
        });
    } else {
      this.userService
        .createUser(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: createdUser => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã thêm mới người dùng "${createdUser.fullName}"`);
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm người dùng.');
          },
        });
    }
  }

  /**
   * Xóa 1 người dùng
   */
  onDeleteUser(user: User): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa người dùng',
      nzContent: `Hành động này sẽ xóa người dùng <strong>${user.fullName}</strong> (${user.username}). Hành động không thể hoàn tác!`,
      nzOkText: 'Xóa vĩnh viễn',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .deleteUser(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Đã xóa người dùng thành công');
              this.setOfCheckedKeys.delete(user.id);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể xóa người dùng này.');
            },
          });
      },
    });
  }

  /**
   * Xóa hàng loạt các dòng đã chọn (Xóa nhanh)
   */
  onDeleteSelected(): void {
    const selectedIds = Array.from(this.setOfCheckedKeys);
    if (!selectedIds.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa nhanh người dùng',
      nzContent: `Bạn có chắc chắn muốn xóa nhanh <strong>${selectedIds.length}</strong> người dùng đã chọn? Dữ liệu bị xóa sẽ không thể phục hồi.`,
      nzOkText: 'Xóa nhanh tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .deleteBatch(selectedIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa nhanh ${selectedIds.length} người dùng đã chọn.`);
              this.clearSelection();
              this.loadData();
            },
            error: () => {
              this.toastService.error('Lỗi', 'Không thể xóa các người dùng đã chọn.');
            },
          });
      },
    });
  }

  /**
   * Đổi trạng thái hàng loạt (Khôi phục nhanh / Khóa tài khoản)
   */
  onChangeStatusSelected(status: UserStatus): void {
    const selectedIds = Array.from(this.setOfCheckedKeys);
    if (!selectedIds.length) return;

    const isRestore = status === UserStatus.ACTIVE;
    const actionTitle = isRestore ? 'Khôi phục nhanh' : 'Khóa tài khoản';
    const actionDesc = isRestore ? 'khôi phục và kích hoạt lại' : 'khóa tài khoản';

    this.modalService.confirm({
      nzTitle: `Xác nhận ${actionTitle} hàng loạt`,
      nzContent: `Bạn có chắc chắn muốn ${actionDesc} cho <strong>${selectedIds.length}</strong> người dùng đã chọn?`,
      nzOkText: isRestore ? 'Khôi phục ngay' : 'Khóa ngay',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .changeBatchStatus(selectedIds, status)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã ${actionDesc} cho ${selectedIds.length} người dùng.`);
              this.clearSelection();
              this.loadData();
            },
            error: () => {
              this.toastService.error('Lỗi', 'Không thể cập nhật trạng thái hàng loạt.');
            },
          });
      },
    });
  }

  /**
   * Giả lập Xuất file Excel
   */
  onExportExcel(): void {
    this.toastService.info('Đang xử lý', 'Hệ thống đang chuẩn bị tệp Excel danh sách người dùng...');
    setTimeout(() => {
      this.toastService.success('Xuất file thành công', 'Danh_sach_nguoi_dung.xlsx đã sẵn sàng tải về.');
    }, 800);
  }

  getStatusMeta(status: UserStatus | number) {
    return getUserStatusMeta(status);
  }
}
