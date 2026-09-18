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
import { NzSpinModule } from 'ng-zorro-antd/spin';
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
import { WarehouseMaterialService } from '../../warehouses/materials/material.service';
import { normalizeImageUrl } from '../../../core/util/image.util';
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
    NzSpinModule,
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
  readonly normalizeImageUrl = normalizeImageUrl;

  readonly toppings = signal<Topping[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);
  readonly materials = signal<any[]>([]);

  searchQuery = '';
  searchGroupName = '';
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // Modal State (Create / View / Edit) — same pattern as Material
  readonly isModalVisible = signal(false);
  readonly modalMode = signal<'create' | 'view' | 'edit'>('create');
  selectedRecord: Topping | null = null;

  get modalTitle(): string {
    const mode = this.modalMode();
    if (mode === 'create') return 'Thêm mới topping';
    if (mode === 'view') return 'Chi tiết topping';
    return 'Cập nhật topping';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  readonly form = this.fb.group({
    code: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z0-9_-]+$/),
    ]),
    name: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(150)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    groupName: this.fb.control<string | null>(null, [Validators.maxLength(100)]),
    imageUrl: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    materialId: this.fb.control<string | null>(null),
    materialQuantity: this.fb.control<number | null>(null, [Validators.min(0.001)]),
    status: this.fb.control<string | null>(null),
  });

  private readonly toppingService = inject(ToppingService);
  private readonly materialService = inject(WarehouseMaterialService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Topping', url: '/admin/menu/toppings/list' },
    ]);
    this.loadData();
    this.loadMaterials();
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

  // ── Modal: Create ────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.selectedRecord = null;
    this.form.reset({
      code: null, name: null, price: null, groupName: null,
      imageUrl: null, materialId: null, materialQuantity: null, status: 'ACTIVE',
    });
    this.form.enable();
    this.isModalVisible.set(true);
  }

  // ── Modal: View (detail) ─────────────────────────────────────────
  openViewModal(item: Topping): void {
    this.modalMode.set('view');
    this.selectedRecord = { ...item };
    this.form.reset();
    this.form.disable();
    this.isModalVisible.set(true);
    this.toppingService
      .getTopping(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          const d = detail || item;
          this.selectedRecord = d;
          this.form.reset({
            code: d.code,
            name: d.name,
            price: d.price,
            groupName: d.groupName,
            imageUrl: d.imageUrl,
            materialId: d.materialId,
            materialQuantity: d.materialQuantity,
            status: d.status,
          });
          this.form.disable();
        },
        error: err => {
          this.toastService.error(err.message || 'Không thể tải chi tiết topping');
        },
      });
  }

  // ── Modal: Edit ──────────────────────────────────────────────────
  openEditModal(item: Topping): void {
    this.modalMode.set('edit');
    this.selectedRecord = { ...item };
    this.form.reset();
    this.form.enable();
    this.isModalVisible.set(true);
    this.toppingService
      .getTopping(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          const d = detail || item;
          this.selectedRecord = d;
          this.form.reset({
            code: d.code,
            name: d.name,
            price: d.price,
            groupName: d.groupName,
            imageUrl: d.imageUrl,
            materialId: d.materialId,
            materialQuantity: d.materialQuantity,
            status: d.status,
          });
          this.form.enable();
          this.form.get('code')?.disable();
        },
        error: err => {
          this.toastService.error(err.message || 'Không thể tải chi tiết topping');
        },
      });
  }

  // ── Modal: Close ─────────────────────────────────────────────────
  closeModal(): void {
    this.isModalVisible.set(false);
    this.form.reset();
    this.form.enable();
    this.selectedRecord = null;
  }

  // ── Switch from View to Edit ─────────────────────────────────────
  editFromView(): void {
    if (this.selectedRecord) {
      this.openEditModal(this.selectedRecord);
    }
  }

  // ── Submit (Create / Edit only) ──────────────────────────────────
  onSubmitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

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
      const req: UpdateToppingRequest = {
        code, name, price, groupName, status,
        imageUrl: raw.imageUrl?.trim() || null,
        materialId: raw.materialId || null,
        materialQuantity: raw.materialQuantity || null,
      };
      this.toppingService
        .update(this.selectedRecord.id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật topping.');
            this.closeModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật topping.');
          },
        });
    } else {
      const req: CreateToppingRequest = {
        code, name, price, groupName,
        imageUrl: raw.imageUrl?.trim() || null,
        materialId: raw.materialId || null,
        materialQuantity: raw.materialQuantity || null,
      };
      this.toppingService
        .create(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã thêm topping.');
            this.closeModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm topping.');
          },
        });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
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

  private loadMaterials(): void {
    this.materialService
      .getMaterials({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.materials.set(res.items || []),
        error: (err) => {
          console.error('Lỗi tải danh mục nguyên vật liệu:', err);
          this.toastService.error('Không thể tải danh sách nguyên vật liệu. Vui lòng kiểm tra quyền truy cập.');
        },
      });
  }
}
