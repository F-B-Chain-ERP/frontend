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
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { UnitService } from './unit.service';
import {
  CreateUnitRequest,
  Unit,
  UnitFilter,
  UpdateUnitRequest,
  UNIT_STATUS_OPTIONS,
  UNIT_TYPE_OPTIONS,
  getUnitStatusMeta,
  getUnitTypeLabel,
} from './unit.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-unit-list',
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
    NzSwitchModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './unit-list.component.html',
  styleUrls: ['./unit-list.component.scss'],
})
export class UnitListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getUnitStatusMeta = getUnitStatusMeta;
  readonly getUnitTypeLabel = getUnitTypeLabel;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
  readonly statusOptions = UNIT_STATUS_OPTIONS;

  // ── State signals ───────────────────────────────────────────────────
  readonly units = signal<Unit[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  searchQuery = '';
  selectedUnitType: string | null = null;
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Modals ──────────────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  selectedRecord: Unit | null = null;

  // ── Form ────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    code: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(20),
      Validators.pattern(/^[A-Z0-9_-]+$/),
    ]),
    name: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(50)]),
    unitType: this.fb.control<string | null>(null, [Validators.required]),
  });

  private readonly unitService = inject(UnitService);

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Đơn vị tính', url: '/admin/menu/units/list' },
    ]);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: UnitFilter = {
      query: this.searchQuery,
      unitType: this.selectedUnitType,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.unitService
      .getUnits(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.units.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách đơn vị tính.');
        },
      });
  }

  // ── Filter / Pagination ─────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedUnitType = null;
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

  // ── Modal actions ───────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('add');
    this.selectedRecord = null;
    this.form.reset({ code: null, name: null, unitType: null });
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: Unit): void {
    this.modalMode.set('edit');
    this.selectedRecord = { ...record };
    this.form.reset({
      code: record.code,
      name: record.name,
      unitType: record.unitType,
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
    const code = (raw.code || '').trim().toUpperCase();
    const name = (raw.name || '').trim();
    const unitType = raw.unitType as string;
    this.isSaving.set(true);

    if (this.modalMode() === 'edit' && this.selectedRecord) {
      const req: UpdateUnitRequest = { code, name, unitType };
      this.unitService
        .update(this.selectedRecord.id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật đơn vị tính.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật đơn vị tính.');
          },
        });
    } else {
      const req: CreateUnitRequest = { code, name, unitType };
      this.unitService
        .create(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã thêm đơn vị tính.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm đơn vị tính.');
          },
        });
    }
  }

  onToggleStatus(record: Unit): void {
    const nextStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.unitService
      .updateStatus(record.id, nextStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Thành công',
            nextStatus === 'ACTIVE' ? 'Đã bật sử dụng đơn vị tính.' : 'Đã ngừng sử dụng đơn vị tính.',
          );
          this.loadData();
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể đổi trạng thái đơn vị tính.'),
      });
  }

  onDelete(record: Unit): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa đơn vị tính',
      nzContent: `Bạn có chắc muốn xóa đơn vị tính <strong>${record.code} - ${record.name}</strong>? Đơn vị đã phát sinh dữ liệu sẽ không thể xóa.`,
      nzOkText: 'Xóa đơn vị tính',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.unitService
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã xóa đơn vị tính.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa đơn vị tính.'),
          });
      },
    });
  }
}
