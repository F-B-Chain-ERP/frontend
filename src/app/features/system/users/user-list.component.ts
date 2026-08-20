import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { UserFormModalComponent } from './components/user-form-modal/user-form-modal.component';
import { UserDetailModalComponent } from './components/user-detail-modal/user-detail-modal.component';
import { UserService } from './services/user.service';
import {
  User,
  UserFilter,
  UserStatus,
  USER_STATUS_OPTIONS,
  getUserStatusMeta,
} from './models/user.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { createSortFn } from '../../../shared/helpers/table.helper';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    AppButtonComponent,
    AppPaginationComponent,
    UserFormModalComponent,
    UserDetailModalComponent,
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent extends BaseComponent implements OnInit {
  private readonly userService = inject(UserService);

  readonly UserStatus = UserStatus;
  readonly statusOptions = USER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: UserStatus | null = null;
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

  // Sorting helpers
  sortNameFn = createSortFn<User>('fullName');
  sortEmailFn = createSortFn<User>('email');
  sortStatusFn = createSortFn<User>('status');
  sortCreatedFn = createSortFn<User>('createdAt');

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/home', icon: 'home' },
      { label: 'Hệ thống', url: '/system' },
      { label: 'Quản lý người dùng', url: '/system/accounts/list' },
    ]);

    this.loadData();
  }

  /**
   * Load danh sách người dùng từ service
   */
  loadData(): void {
    this.loading.set(true);
    const filter: UserFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
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
          this.users.set(res.items);
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
   * Xử lý chọn / bỏ chọn checkbox hàng loạt
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
   * Xử lý chọn / bỏ chọn 1 dòng
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
    this.isFormModalVisible.set(true);
  }

  /**
   * Mở modal chỉnh sửa người dùng
   */
  openEditModal(user: User): void {
    this.selectedUserForEdit = { ...user };
    this.isFormModalVisible.set(true);
  }

  /**
   * Mở modal xem chi tiết người dùng
   */
  openDetailModal(user: User): void {
    this.selectedUserForDetail = user;
    this.isDetailModalVisible.set(true);
  }

  /**
   * Callback khi form modal lưu thành công
   */
  onFormModalSaved(): void {
    this.loadData();
  }

  /**
   * Bật / tắt trạng thái hoạt động trực tiếp
   */
  onToggleStatus(user: User): void {
    const nextStatus = user.status === UserStatus.ACTIVE ? 'Khóa/Ngừng hoạt động' : 'Kích hoạt hoạt động';
    this.modalService.confirm({
      nzTitle: 'Xác nhận thay đổi trạng thái',
      nzContent: `Bạn có chắc chắn muốn ${nextStatus} cho người dùng "${user.fullName}"?`,
      nzOkText: 'Xác nhận',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .toggleStatus(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: updated => {
              this.toastService.success(
                'Thành công',
                `Đã cập nhật trạng thái người dùng "${updated.fullName}" thành ${this.getStatusMeta(updated.status).label}`,
              );
              this.loadData();
            },
            error: () => {
              this.toastService.error('Có lỗi xảy ra khi cập nhật trạng thái.');
            },
          });
      },
    });
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
   * Xóa hàng loạt các dòng đã chọn
   */
  onDeleteSelected(): void {
    const selectedIds = Array.from(this.setOfCheckedKeys);
    if (!selectedIds.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${selectedIds.length}</strong> người dùng đã chọn? Dữ liệu bị xóa sẽ không thể phục hồi.`,
      nzOkText: 'Xóa tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .deleteBatch(selectedIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa ${selectedIds.length} người dùng đã chọn.`);
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
   * Đổi trạng thái hàng loạt
   */
  onChangeStatusSelected(status: UserStatus): void {
    const selectedIds = Array.from(this.setOfCheckedKeys);
    if (!selectedIds.length) return;

    const statusText = status === UserStatus.ACTIVE ? 'Kích hoạt' : 'Ngừng hoạt động';

    this.modalService.confirm({
      nzTitle: `Xác nhận ${statusText} hàng loạt`,
      nzContent: `Bạn có chắc chắn muốn chuyển trạng thái <strong>${selectedIds.length}</strong> người dùng thành <strong>${statusText}</strong>?`,
      nzOkText: 'Đồng ý',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService
          .changeBatchStatus(selectedIds, status)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã cập nhật trạng thái cho ${selectedIds.length} người dùng.`);
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
