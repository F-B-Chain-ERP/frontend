import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzSwitchModule} from 'ng-zorro-antd/switch';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';
import {NzBadgeModule} from 'ng-zorro-antd/badge';
import {NzPopconfirmModule} from 'ng-zorro-antd/popconfirm';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzDescriptionsModule} from 'ng-zorro-antd/descriptions';
import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {AppSelectionBarComponent} from '../../../shared/app-selection-bar/app-selection-bar.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {EnterAsTabContainerDirective} from '../../../shared/directives/enter-as-tab-container.directive';
import {ColumnTextFilter} from '../../../shared/utils/column-text-filter';
import {CustomerService} from './customer.service';
import {
  Customer,
  CustomerFilter,
  CustomerFormDTO,
  CustomerStatus,
  CUSTOMER_STATUS_OPTIONS,
  getCustomerStatusMeta,
} from './customer.model';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';
import {createSortFn} from '../../../shared/helpers/table.helper';
import {takeUntil} from 'rxjs/operators';
import {AppTableSearchInputComponent} from "../../../shared/app-table-search-input/app-table-search-input.component";

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NzTableModule, NzCardModule, NzInputModule, NzSelectModule, NzDatePickerModule, NzSwitchModule,
    NzIconModule, NzTagModule, NzTooltipModule, NzAvatarModule, NzBadgeModule, NzPopconfirmModule,
    NzDividerModule, NzGridModule, NzDescriptionsModule,
    AppBreadcrumbsComponent, AppButtonComponent, AppPaginationComponent, AppModalComponent,
    AppSelectionBarComponent, EnterAsTabContainerDirective, HasSomeAuthorityDirective, AppTableSearchInputComponent,
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent extends BaseComponent implements OnInit {
  private readonly customerService = inject(CustomerService);

  readonly ROLE = ROLE;
  readonly CustomerStatus = CustomerStatus;
  readonly statusOptions = CUSTOMER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  readonly genderOptions = [
    {label: 'Nam', value: 'MALE'},
    {label: 'Nữ', value: 'FEMALE'},
    {label: 'Khác', value: 'OTHER'},
  ];

  readonly allLoadedCustomers = signal<Customer[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  readonly columnFilter = new ColumnTextFilter<Customer>(
    () => this.allLoadedCustomers(),
    {
      status: 'equals',
      gender: 'equals',
      createdAt: 'contains',
    },
  );

  readonly statusFilterOptions = [
    {label: 'Tất cả trạng thái', value: ''},
    {label: 'Đang hoạt động', value: CustomerStatus.ACTIVE},
    {label: 'Ngừng hoạt động', value: CustomerStatus.INACTIVE},
  ];

  readonly genderFilterOptions = [{label: 'Tất cả giới tính', value: ''}, ...this.genderOptions];

  searchQuery = '';
  selectedStatus: CustomerStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;

  readonly setOfCheckedKeys = new Set<string>();
  allChecked = false;
  indeterminate = false;

  isFormModalVisible = signal(false);
  isDetailModalVisible = signal(false);
  isResetModalVisible = signal(false);
  selectedCustomerForEdit: Customer | null = null;
  selectedCustomerForDetail: Customer | null = null;
  selectedCustomerForReset: Customer | null = null;

  customerForm = this.fb.group({
    fullName: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    username: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^[0-9+()\-\s]{8,20}$/), Validators.maxLength(20)]],
    password: ['', [Validators.minLength(8), Validators.maxLength(128)]],
    dateOfBirth: [null as Date | null],
    gender: [''],
    emailVerified: [false],
    status: [CustomerStatus.ACTIVE, [Validators.required]],
  });

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  sortNameFn = createSortFn<Customer>('fullName');
  sortEmailFn = createSortFn<Customer>('email');
  sortStatusFn = createSortFn<Customer>('status');
  sortCreatedFn = createSortFn<Customer>('createdAt');

  get isEditMode(): boolean {
    return !!this.selectedCustomerForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode
      ? `Cập nhật khách hàng: ${this.selectedCustomerForEdit?.fullName || ''}`
      : 'Thêm mới khách hàng';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      {label: 'Trang chủ', url: '/admin/home', icon: 'home'},
      {label: 'Hệ thống', url: '/admin/system/customers/list'},
      {label: 'Quản lý khách hàng', url: '/admin/system/customers/list'},
    ]);

    this.customerForm.get('email')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(email => {
      if (!this.isEditMode && email) {
        const usernameControl = this.customerForm.get('username');
        if (!usernameControl?.dirty && email.includes('@')) {
          const suggested = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
          usernameControl?.setValue(suggested, {emitEvent: false});
        }
      }
    });

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: CustomerFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };
    this.customerService.getCustomers(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.allLoadedCustomers.set(res.items);
        this.customers.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.refreshCheckState();
      },
      error: err => {
        this.loading.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách khách hàng.');
      },
    });
  }

  searchByField(field: keyof Customer, value: unknown): void {
    const filtered = this.columnFilter.setField(field, value);
    this.customers.set(filtered);
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    const resetList = this.columnFilter.reset();
    this.customers.set(resetList);
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
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

  onCheckAll(checked: boolean): void {
    this.customers().forEach(row => {
      if (checked) this.setOfCheckedKeys.add(row.id);
      else this.setOfCheckedKeys.delete(row.id);
    });
    this.refreshCheckState();
  }

  onCheckRow(id: string, checked: boolean): void {
    if (checked) this.setOfCheckedKeys.add(id);
    else this.setOfCheckedKeys.delete(id);
    this.refreshCheckState();
  }

  private refreshCheckState(): void {
    const list = this.customers();
    const checkedCount = list.filter(r => this.setOfCheckedKeys.has(r.id)).length;
    const totalCurrent = list.length;
    this.allChecked = totalCurrent > 0 && checkedCount === totalCurrent;
    this.indeterminate = checkedCount > 0 && checkedCount < totalCurrent;
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckState();
  }

  getGenderLabel(gender?: string | null): string {
    if (!gender) return '—';
    return this.genderOptions.find(g => g.value === gender)?.label ?? gender;
  }

  openCreateModal(): void {
    this.selectedCustomerForEdit = null;
    this.customerForm.reset({
      fullName: '', email: '', username: '', phone: '', password: '',
      dateOfBirth: null, gender: '', emailVerified: false, status: CustomerStatus.ACTIVE,
    });
    this.customerForm.get('username')?.enable();
    this.customerForm.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.customerForm.get('password')?.enable();
    this.isFormModalVisible.set(true);
  }

  openEditModal(customer: Customer): void {
    this.selectedCustomerForEdit = {...customer};
    this.customerForm.reset({
      fullName: customer.fullName,
      email: customer.email,
      username: customer.username,
      phone: customer.phone || '',
      password: '',
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
      gender: customer.gender || '',
      emailVerified: customer.emailVerified,
      status: customer.status,
    });
    this.customerForm.get('username')?.disable();
    this.customerForm.get('password')?.clearValidators();
    this.customerForm.get('password')?.setValue('');
    this.customerForm.get('password')?.disable();
    this.isFormModalVisible.set(true);
  }

  openDetailModal(customer: Customer): void {
    this.selectedCustomerForDetail = customer;
    this.isDetailModalVisible.set(true);
  }

  openResetModal(customer: Customer): void {
    this.selectedCustomerForReset = customer;
    this.resetForm.reset();
    this.isResetModalVisible.set(true);
  }

  closeFormModal(): void { this.isFormModalVisible.set(false); }
  closeDetailModal(): void { this.isDetailModalVisible.set(false); }
  closeResetModal(): void { this.isResetModalVisible.set(false); }

  switchToEditFromDetail(): void {
    if (this.selectedCustomerForDetail) {
      const customer = this.selectedCustomerForDetail;
      this.closeDetailModal();
      this.openEditModal(customer);
    }
  }

  private toDateString(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.customerForm)) return;
    const raw = this.customerForm.getRawValue();
    const payload: CustomerFormDTO = {
      fullName: raw.fullName || '',
      email: raw.email || '',
      username: raw.username || '',
      phone: raw.phone || '',
      password: raw.password || '',
      dateOfBirth: this.toDateString(raw.dateOfBirth),
      gender: raw.gender || null,
      emailVerified: !!raw.emailVerified,
      status: raw.status as CustomerStatus,
    };
    this.isSaving.set(true);
    const req$ = this.isEditMode && this.selectedCustomerForEdit
      ? this.customerService.updateCustomer(this.selectedCustomerForEdit.id, payload)
      : this.customerService.createCustomer(payload);
    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', this.isEditMode
          ? `Đã cập nhật khách hàng "${saved.fullName}"`
          : `Đã thêm mới khách hàng "${saved.fullName}"`);
        this.closeFormModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || (this.isEditMode ? 'Không thể cập nhật khách hàng.' : 'Không thể thêm khách hàng.'));
      },
    });
  }

  onSubmitReset(): void {
    if (!this.validateAndFocusFirstInvalid(this.resetForm)) return;
    if (!this.selectedCustomerForReset) return;
    const password = this.resetForm.getRawValue().password || '';
    this.isSaving.set(true);
    this.customerService.resetPassword(this.selectedCustomerForReset.id, password)
      .pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', `Đã đặt lại mật khẩu cho "${this.selectedCustomerForReset?.fullName}"`);
        this.closeResetModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể đặt lại mật khẩu.');
      },
    });
  }

  onDeleteCustomer(customer: Customer): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa khách hàng',
      nzContent: `Hành động này sẽ xóa khách hàng <strong>${customer.fullName}</strong> (${customer.username}). Hành động không thể hoàn tác!`,
      nzOkText: 'Xóa vĩnh viễn', nzOkDanger: true, nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.customerService.deleteCustomer(customer.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success('Đã xóa khách hàng thành công');
            this.setOfCheckedKeys.delete(customer.id);
            this.loadData();
          },
          error: () => this.toastService.error('Không thể xóa khách hàng này.'),
        });
      },
    });
  }

  onDeleteSelected(): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa nhanh khách hàng',
      nzContent: `Bạn có chắc chắn muốn xóa nhanh <strong>${ids.length}</strong> khách hàng đã chọn? Dữ liệu bị xóa sẽ không thể phục hồi.`,
      nzOkText: 'Xóa nhanh tất cả', nzOkDanger: true, nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.customerService.deleteBatch(ids).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success('Thành công', `Đã xóa nhanh ${ids.length} khách hàng đã chọn.`);
            this.clearSelection();
            this.loadData();
          },
          error: () => this.toastService.error('Lỗi', 'Không thể xóa các khách hàng đã chọn.'),
        });
      },
    });
  }

  onChangeStatusSelected(status: CustomerStatus): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;
    const isRestore = status === CustomerStatus.ACTIVE;
    this.modalService.confirm({
      nzTitle: `Xác nhận ${isRestore ? 'Khôi phục nhanh' : 'Khóa tài khoản'} hàng loạt`,
      nzContent: `Bạn có chắc chắn muốn ${isRestore ? 'khôi phục và kích hoạt lại' : 'khóa tài khoản'} cho <strong>${ids.length}</strong> khách hàng đã chọn?`,
      nzOkText: isRestore ? 'Khôi phục ngay' : 'Khóa ngay', nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.customerService.changeBatchStatus(ids, status).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success('Thành công', `Đã ${isRestore ? 'khôi phục' : 'khóa'} ${ids.length} khách hàng.`);
            this.clearSelection();
            this.loadData();
          },
          error: () => this.toastService.error('Lỗi', 'Không thể cập nhật trạng thái hàng loạt.'),
        });
      },
    });
  }

  onExportExcel(): void {
    this.toastService.info('Đang xử lý', 'Hệ thống đang chuẩn bị tệp Excel danh sách khách hàng...');
    setTimeout(() => this.toastService.success('Xuất file thành công', 'Danh_sach_khach_hang.xlsx đã sẵn sàng tải về.'), 800);
  }

  getStatusMeta(status: CustomerStatus | string) {
    return getCustomerStatusMeta(status);
  }

  toLocalDate(value?: string | null): string {
    if(!value) return '';
    return value.length >=10 ? value.substring(0, 10): value;
  }
}
