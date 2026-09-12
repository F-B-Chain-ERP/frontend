import { Component, OnInit, inject, signal } from '@angular/core';
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
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { ToppingService } from './topping.service';
import {
  CreateToppingRequest,
  Topping,
  ToppingFilter,
  UpdateToppingRequest,
  TOPPING_STATUS_OPTIONS,
  getToppingStatusMeta,
} from './topping.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-topping-list',
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
    HasSomeAuthorityDirective,
  ],
  templateUrl: './topping-list.component.html',
  styleUrls: ['./topping-list.component.scss'],
})
export class ToppingListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getToppingStatusMeta = getToppingStatusMeta;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly statusOptions = TOPPING_STATUS_OPTIONS;

  readonly toppings = signal<Topping[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  searchQuery = '';
  searchGroupName = '';
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  selectedRecord: Topping | null = null;

  readonly form = this.fb.group({
    code: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z0-9_-]+$/),
    ]),
    name: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(150)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    groupName: this.fb.control<string | null>(null, [Validators.maxLength(100)]),
    status: this.fb.control<string | null>(null),
  });

  private readonly toppingService = inject(ToppingService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Topping', url: '/admin/menu/toppings/list' },
    ]);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: ToppingFilter = {
      search: this.searchQuery,
      groupName: this.searchGroupName,
      status: this.selectedStatus,
      page: this.pageIndex,
      size: this.pageSize,
    };
    this.toppingService
      .getToppings(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.toppings.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách topping.');
        },
      });
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.searchGroupName = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
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

  openCreateModal(): void {
    this.modalMode.set('add');
    this.selectedRecord = null;
    this.form.reset({ code: null, name: null, price: null, groupName: null, status: 'ACTIVE' });
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: Topping): void {
    this.modalMode.set('edit');
    this.selectedRecord = { ...record };
    this.form.reset({
      code: record.code,
      name: record.name,
      price: record.price,
      groupName: record.groupName,
      status: record.status,
    });
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.form)) {
      return;
    }
    const raw = this.form.getRawValue();
    const code = (raw.code || '').trim();
    const name = (raw.name || '').trim();
    const price = Number(raw.price);
    const groupName = raw.groupName ? raw.groupName.trim() : null;
    const status = raw.status as string;
    this.isSaving.set(true);

    if (this.modalMode() === 'edit' && this.selectedRecord) {
      if (!status) {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', 'Vui lòng chọn trạng thái.');
        return;
      }
      const req: UpdateToppingRequest = { code, name, price, groupName, status };
      this.toppingService
        .update(this.selectedRecord.id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật topping.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật topping.');
          },
        });
    } else {
      const req: CreateToppingRequest = { code, name, price, groupName };
      this.toppingService
        .create(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã thêm topping.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm topping.');
          },
        });
    }
  }

  onDelete(record: Topping): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa topping',
      nzContent: `Bạn có chắc muốn xóa topping <strong>${record.code} - ${record.name}</strong>? Topping đã được gắn cho sản phẩm sẽ không thể xóa.`,
      nzOkText: 'Xóa topping',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.toppingService
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã xóa topping.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa topping.'),
          });
      },
    });
  }
}
