import { Component, inject, signal } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { NzColDirective, NzRowDirective } from 'ng-zorro-antd/grid';
import { NzCardComponent } from 'ng-zorro-antd/card';
import { NzInputDirective, NzInputPrefixDirective, NzInputWrapperComponent } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzDatePickerComponent, NzRangePickerComponent } from 'ng-zorro-antd/date-picker';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { NzTableComponent, NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationComponent } from 'ng-zorro-antd/pagination';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AppModalComponent } from '../../shared/app-modal/app-modal.component';
import { LoginService } from '../login/login.service';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { createSortFn } from '../../shared/helpers/table.helper';

import { DrinkItem } from '../../shared/app-drink-card/app-drink-card.component';
import { AppOverflowTagsComponent } from '../../shared/app-overflow-tags/app-overflow-tags.component';
import { AppPaginationComponent } from '../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { BreadcrumbsService } from '../../shared/app-breadcrumbs/breadcrumbs.service';
import { AppTableSearchInputComponent } from '../../shared/app-table-search-input/app-table-search-input.component';
import { ColumnTextFilter } from '../../shared/utils/column-text-filter';
import { NzTabsModule, NzTabsComponent, NzTabComponent } from 'ng-zorro-antd/tabs';
import { NzSwitchComponent } from 'ng-zorro-antd/switch';
import { NzTagComponent } from 'ng-zorro-antd/tag';
import { NzAlertComponent } from 'ng-zorro-antd/alert';

function alphabet(): string[] {
  const children: string[] = [];
  for (let i = 10; i < 36; i++) {
    children.push(i.toString(36) + i);
  }
  return children;
}

@Component({
  selector: 'app-ui-kit',
  templateUrl: './ui-kit.component.html',
  styleUrls: ['./ui-kit.component.scss'],
  imports: [
    AppButtonComponent,
    NzRowDirective,
    NzColDirective,
    NzCardComponent,
    NzInputDirective,
    NzInputWrapperComponent,
    NzInputPrefixDirective,
    NzIconDirective,
    NzSelectComponent,
    FormsModule,
    NzOptionComponent,
    NzDatePickerComponent,
    NzRangePickerComponent,
    ReactiveFormsModule,
    NzTableComponent,
    NzTableModule,
    NzPaginationComponent,
    NzModalModule,
    AppModalComponent,
    NzTooltipDirective,
    AppOverflowTagsComponent,
    AppPaginationComponent,
    AppBreadcrumbsComponent,
    AppTableSearchInputComponent,
    NzTabsModule,
    NzTabsComponent,
    NzTabComponent,
    NzSwitchComponent,
    NzTagComponent,
    NzAlertComponent,
  ],
  standalone: true,
})
export class UiKitComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly toastService = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  readonly theme = inject(ThemeService);
  readonly sidebarCollapsed = signal(false);
  readonly activePage = signal('dashboard');

  onBrandColorChange(event: Event): void {
    this.theme.setBrandColor((event.target as HTMLInputElement).value);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.loginService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
    });
  }

  isLoading = signal(false);
  checkLoading() {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  selectedValue: string | null = null;
  readonly listOfOption: string[] = alphabet();
  listOfSelectedValue = ['a10', 'c12'];

  isAllOptionSelected(): boolean {
    return this.listOfOption.length > 0 && this.listOfOption.every(option => this.listOfSelectedValue.includes(option));
  }

  isOptionPartiallySelected(): boolean {
    return this.listOfSelectedValue.length > 0 && !this.isAllOptionSelected();
  }

  toggleSelectAllOption(): void {
    this.listOfSelectedValue = this.isAllOptionSelected() ? [] : [...this.listOfOption];
  }

  cbBasic = false;
  rbValue = 'b';

  showMessage(type: string) {
    switch (type) {
      case 'success':
        this.toastService.success('Thao tác thành công!');
        break;
      case 'info':
        this.toastService.info('Thông báo hệ thống');
        break;
      case 'warning':
        this.toastService.warning('Cảnh báo dữ liệu');
        break;
      case 'error':
        this.toastService.error('Có lỗi xảy ra!');
        break;
      default:
        this.toastService.info('Thông báo');
        break;
    }
  }

  employeeForm = this.formBuilder.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    employeeId: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    joiningDate: [null, Validators.required],
  });

  submit() {
    if (this.employeeForm.valid) {
      this.toastService.success('Đã gửi thông tin form thành công!');
    } else {
      this.toastService.error('Vui lòng điền đầy đủ các trường bắt buộc.');
    }
  }

  readonly originalListOfData: Array<{ key: string; name: string; age: number; department: string; address: string }> = [
    { key: 'NV001', name: 'Nguyễn Văn An', age: 32, department: 'Phòng Tài chính - Kế toán', address: 'Hà Nội' },
    { key: 'NV002', name: 'Trần Thị Bình', age: 42, department: 'Phòng Tổ chức Cán bộ', address: 'Hồ Chí Minh' },
    { key: 'NV003', name: 'Lê Hoàng Cường', age: 32, department: 'Phòng Công nghệ Thông tin', address: 'Đà Nẵng' },
    { key: 'NV004', name: 'Phạm Minh Đức', age: 27, department: 'Phòng Đào tạo', address: 'Hải Phòng' },
    { key: 'NV005', name: 'Vũ Thị Hoa', age: 35, department: 'Phòng Kế hoạch - Đầu tư', address: 'Cần Thơ' },
    { key: 'NV006', name: 'Đỗ Mạnh Thắng', age: 29, department: 'Ban Quản lý Dự án', address: 'Hà Nội' },
  ];

  filteredListOfData: Array<{ key: string; name: string; age: number; department: string; address: string }> = [...this.originalListOfData];

  columnFilter = new ColumnTextFilter<{ key: string; name: string; age: number; department: string; address: string }>(
    () => this.originalListOfData,
    {
      age: 'contains',
      department: 'equals',
    }
  );

  readonly departmentFilterOptions = [
    { label: 'Tất cả phòng ban', value: '' },
    { label: 'Phòng Tài chính - Kế toán', value: 'Phòng Tài chính - Kế toán' },
    { label: 'Phòng Tổ chức Cán bộ', value: 'Phòng Tổ chức Cán bộ' },
    { label: 'Phòng Công nghệ Thông tin', value: 'Phòng Công nghệ Thông tin' },
    { label: 'Phòng Đào tạo', value: 'Phòng Đào tạo' },
    { label: 'Phòng Kế hoạch - Đầu tư', value: 'Phòng Kế hoạch - Đầu tư' },
    { label: 'Ban Quản lý Dự án', value: 'Ban Quản lý Dự án' },
  ];

  searchByField(field: 'key' | 'name' | 'age' | 'department' | 'address', value: unknown): void {
    this.filteredListOfData = this.columnFilter.setField(field, value);
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.filteredListOfData = this.columnFilter.reset();
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại tất cả bộ lọc cột');
  }

  protected readonly setOfCheckedKeys = new Set<string>();
  protected allChecked = false;
  protected indeterminate = false;

  protected onCheckAll(checked: boolean): void {
    this.filteredListOfData.forEach(row => (checked ? this.setOfCheckedKeys.add(row.key) : this.setOfCheckedKeys.delete(row.key)));
    this.refreshCheckState();
  }

  protected onCheckRow(key: string, checked: boolean): void {
    checked ? this.setOfCheckedKeys.add(key) : this.setOfCheckedKeys.delete(key);
    this.refreshCheckState();
  }

  private refreshCheckState(): void {
    const checkedCount = this.filteredListOfData.filter(r => this.setOfCheckedKeys.has(r.key)).length;
    const total = this.filteredListOfData.length;
    this.allChecked = total > 0 && checkedCount === total;
    this.indeterminate = checkedCount > 0 && checkedCount < total;
  }

  protected pageIndex = 1;
  protected pageSize = 10;
  protected readonly pageTotal = 100;

  private readonly modal = inject(NzModalService);
  protected readonly today = new Date().toLocaleDateString('vi-VN');

  protected isBasicVisible = signal(false);
  protected isCustomVisible = signal(false);
  protected isOkLoading = signal(false);

  protected openBasic(): void {
    this.isBasicVisible.set(true);
  }
  protected openCustom(): void {
    this.isCustomVisible.set(true);
  }

  protected handleOk(): void {
    this.isOkLoading.set(true);
    setTimeout(() => {
      this.isOkLoading.set(false);
      this.isBasicVisible.set(false);
      this.isCustomVisible.set(false);
    }, 1200);
  }

  protected handleCancel(): void {
    this.isBasicVisible.set(false);
    this.isCustomVisible.set(false);
  }

  protected showConfirm(): void {
    this.modal.confirm({
      nzTitle: 'Xác nhận xóa bản ghi?',
      nzContent: 'Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.',
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.toastService.success('Đã xóa thành công'),
    });
  }

  protected showInfo(): void {
    this.modal.info({
      nzTitle: 'Thông tin hệ thống',
      nzContent: 'Phiên bản ERP UTT 1.0.0 — cập nhật 2026.',
      nzOkText: 'Đóng',
    });
  }

  protected showSuccess(): void {
    this.modal.success({
      nzTitle: 'Lưu thành công',
      nzContent: 'Dữ liệu đã được lưu và đồng bộ lên hệ thống.',
      nzOkText: 'Đóng',
    });
  }

  protected showWarning(): void {
    this.modal.warning({
      nzTitle: 'Cảnh báo',
      nzContent: 'Phiên làm việc sắp hết hạn. Vui lòng lưu dữ liệu.',
      nzOkText: 'Đồng ý',
    });
  }

  protected showError(): void {
    this.modal.error({
      nzTitle: 'Lỗi kết nối',
      nzContent: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      nzOkText: 'Thử lại',
    });
  }

  sortNameFn = createSortFn('name');
  sortKeyFn = createSortFn('key');
  sortAgeFn = createSortFn('age');
  sortDeptFn = createSortFn('department');
  sortAddressFn = createSortFn('address');

  // ── New Components Demo State ──────────────────────────
  switchValue = true;
  switchDisabled = true;

  customPageIndex = 1;
  customPageSize = 10;
  customTotal = 148;

  tableSearchText = '';
  tableSearchType = 'text';

  readonly overflowTagsDemo = [
    'Cà phê Phin Robusta',
    'Arabica Cầu Đất',
    'Matcha Uji Kyoto',
    'Trà Oolong Than Củi',
    'Kem Phô Mai Cheese',
    'Trân Châu Hoàng Kim',
    'Hạt Sen Huế',
    'Thạch Đào Giòn',
    'Sốt Caramel Nướng',
    'Sữa Tươi Thanh Trùng',
  ];

  readonly demoDrinkItem: DrinkItem = {
    id: 'demo-1',
    name: 'Cà Phê Muối Đặc Sản Xứ Huế',
    category: 'traditional-coffee',
    categoryName: 'Cà phê truyền thống',
    price: 38000,
    originalPrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    description: 'Lớp kem béo mằn mặn bồng bềnh hòa quyện cùng vị cà phê đắng êm dịu độc đáo.',
    badge: 'Signature',
    badgeType: 'signature',
  };

  onDrinkCardSelect(item: DrinkItem): void {
    this.toastService.info(`Đã click chọn món: "${item.name}"`);
  }

  onDrinkCardAddToCart(item: DrinkItem): void {
    this.toastService.success(`Đã thêm "${item.name}" vào giỏ hàng!`);
  }
}
export default UiKitComponent;
