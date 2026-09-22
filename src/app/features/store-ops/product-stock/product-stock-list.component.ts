import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntil} from 'rxjs/operators';

import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzInputNumberModule} from 'ng-zorro-antd/input-number';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzTabsModule, NzTabsComponent, NzTabComponent} from 'ng-zorro-antd/tabs';

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {BranchService} from '../../../core/auth/branch.service';
import {StoreShiftService, ShiftServiceError} from '../shift/shift.service';
import {MaterialShortage, PosDailyStock, PosStockHistory} from '../shift/shift.model';
import {SalesService} from '../../store/services/sales.service';
import {ProductVariantService} from '../../menu/products/variants/variant.service';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';

function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function changeTypeMeta(changeType: string | null | undefined): { label: string; badgeClass: string } {
  const s = (changeType ?? '').toUpperCase();
  if (s === 'SALE') return { label: 'Bán (trừ kho)', badgeClass: 'tbl-badge tbl-badge--info' };
  if (s === 'RESTOCK') return { label: 'Chốt mở bán', badgeClass: 'tbl-badge tbl-badge--primary' };
  if (s === 'ADJUSTMENT') return { label: 'Hoàn huỷ', badgeClass: 'tbl-badge tbl-badge--warning' };
  if (s === 'EXPIRED') return { label: 'Hết hạn', badgeClass: 'tbl-badge tbl-badge--danger' };
  return { label: s || '—', badgeClass: 'tbl-badge tbl-badge--neutral' };
}

@Component({
  selector: 'app-store-product-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzGridModule,
    NzDividerModule,
    NzModalModule,
    NzTooltipModule,
    NzIconModule,
    NzTagModule,
    NzTabsModule,
    NzTabsComponent,
    NzTabComponent,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './product-stock-list.component.html',
  styleUrls: ['./product-stock-list.component.scss'],
})
export class StoreProductStockListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  readonly branchService = inject(BranchService);

  changeTypeMeta = changeTypeMeta;

  // Tab NVL & Cấp hàng
  selectedTabIndex = 0;
  readonly shortage = signal<MaterialShortage | null>(null);
  readonly shortageLoading = signal(false);
  readonly isRequesting = signal(false);

  // Modal Chốt tồn mở bán / Restock
  readonly isRestockModalVisible = signal<boolean>(false);
  readonly isSavingRestock = signal<boolean>(false);
  restockForm!: FormGroup;

  // Dropdown Món → Biến thể trong modal restock (thay nhập UUID tay)
  readonly restockProducts = signal<{ value: string; label: string }[]>([]);
  readonly restockVariants = signal<{ value: string; label: string }[]>([]);
  readonly loadingRestockProducts = signal(false);
  readonly loadingRestockVariants = signal(false);

  // Modal Lịch sử biến động tồn (theo biến thể)
  readonly isHistoryVisible = signal<boolean>(false);
  readonly historyLoading = signal<boolean>(false);
  readonly historyItems = signal<PosStockHistory[]>([]);
  readonly historyTotal = signal(0);
  readonly historyPageIndex = signal(DEFAULT_PAGE_INDEX);
  readonly historyPageSize = signal(DEFAULT_PAGE_SIZE);
  historyTarget: PosDailyStock | null = null;

  private readonly shiftService = inject(StoreShiftService);
  private readonly salesService = inject(SalesService);
  private readonly variantService = inject(ProductVariantService);

  readonly stocks = signal<PosDailyStock[]>([]);
  readonly loading = signal<boolean>(false);
  readonly total = signal<number>(0);

  // Filter params
  selectedBranchId: string | null = null;
  selectedBusinessDate: Date = new Date();
  searchQuery = '';
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  ngOnInit(): void {
    this.initForms();
    this.branchService.loadMine().subscribe(() => {
      const current = this.branchService.currentBranch();
      if (current) {
        this.selectedBranchId = current.id;
      }
      this.loadData();
    });
  }

  loadData(): void {
    if (!this.selectedBranchId) {
      this.toastService.warning('Chưa chọn chi nhánh', 'Vui lòng chọn chi nhánh trước khi xem tồn.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.shiftService
      .listStocks({
        branchId: this.selectedBranchId,
        date: toISODate(this.selectedBusinessDate),
        search: this.searchQuery?.trim() || null,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.stocks.set(res.items);
          this.total.set(res.total);
          this.pageIndex = res.pageIndex;
          this.pageSize = res.pageSize;
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.toastService.error(err.message || 'Không tải được tồn mở bán.');
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
    if (this.selectedTabIndex === 1) {
      this.shortage.set(null);
      this.loadShortage();
    }
  }

  onReset(): void {
    this.selectedBusinessDate = new Date();
    this.searchQuery = '';
    this.pageIndex = 1;
    this.loadData();
    if (this.selectedTabIndex === 1) {
      this.shortage.set(null);
      this.loadShortage();
    }
  }

  onPageIndexChange(idx: number): void {
    this.pageIndex = idx;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadData();
  }

  openRestockModal(): void {
    const branchId = this.selectedBranchId || this.branchService.branches()[0]?.id || '';
    this.restockForm.reset({
      branchId,
      productId: null,
      variantId: '',
      openingQuantity: 100,
      note: '',
    });
    this.restockVariants.set([]);
    this.loadRestockProducts();
    this.isRestockModalVisible.set(true);
  }

  closeRestockModal(): void {
    this.isRestockModalVisible.set(false);
  }

  /** Có gợi ý NVL (không null/undefined) thì mới chốt theo. */
  hasCapability(s: PosDailyStock): boolean {
    return s.capabilityQuantity !== null && s.capabilityQuantity !== undefined;
  }

  /** Các dòng có gợi ý NVL (trang hiện tại). */
  bulkCandidates(): PosDailyStock[] {
    return this.stocks().filter(s => this.hasCapability(s) && (s.capabilityQuantity ?? 0) >= 0);
  }

  openBulkRestock(): void {
    const rows = this.bulkCandidates();
    if (!this.selectedBranchId) {
      this.toastService.warning('Chưa chọn chi nhánh', 'Vui lòng chọn chi nhánh trước khi chốt.');
      return;
    }
    if (rows.length === 0) {
      this.toastService.info('Không có gợi ý', 'Trang hiện tại không có biến thể nào tính được năng lực NVL.');
      return;
    }
    this.modalService.confirm({
      nzTitle: 'Chốt tồn theo gợi ý NVL',
      nzContent: `Đặt mở bán = NVL đủ cho <strong>${rows.length}</strong> biến thể (trang hiện tại)? Dòng chưa có công thức được bỏ qua.`,
      nzOkText: 'Chốt',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.doBulkRestock(rows),
    });
  }

  /** Mở modal chốt tồn với chi nhánh + biến thể của dòng đang xem. */
  openRestockForRow(row: PosDailyStock): void {
    this.restockForm.reset({
      branchId: this.selectedBranchId || this.branchService.branches()[0]?.id || '',
      productId: row.productId || null,
      variantId: row.variantId,
      openingQuantity: row.openingQuantity ?? 100,
      note: '',
    });
    this.restockVariants.set([]);
    this.loadRestockProducts();
    if (row.productId) {
      this.loadRestockVariants(row.productId, row.variantId);
    }
    this.isRestockModalVisible.set(true);
  }

  /** Nạp món đang bán cho dropdown (100 món đầu, search thêm ở màn Thực đơn). */
  loadRestockProducts(): void {
    if (this.restockProducts().length > 0) return;
    this.loadingRestockProducts.set(true);
    this.salesService
      .getProducts({ pageIndex: 1, pageSize: 100 })
      .subscribe({
        next: res => {
          this.restockProducts.set(
            (res.items ?? []).map(p => ({ value: p.id, label: `${p.code} — ${p.name}` })),
          );
          this.loadingRestockProducts.set(false);
        },
        error: () => {
          this.restockProducts.set([]);
          this.loadingRestockProducts.set(false);
        },
      });
  }

  /** Đổi món → nạp biến thể của món đó. */
  onRestockProductChange(productId: string | null): void {
    this.restockForm.get('variantId')?.setValue('');
    this.restockVariants.set([]);
    if (!productId) return;
    this.loadRestockVariants(productId);
  }

  /** Badge 4 nấc: chưa chốt / hết hàng / sắp hết (≤20% mở bán) / đang bán. */
  stockMeta(s: PosDailyStock): { label: string; badgeClass: string; tooltip: string } {
    if (s.openingQuantity == null || s.remainingQuantity == null) {
      return {
        label: 'Chưa chốt',
        badgeClass: 'tbl-badge tbl-badge--neutral',
        tooltip: 'Biến thể đang bán nhưng chưa chốt tồn hôm nay — bấm Chốt tồn để mở bán',
      };
    }
    if (s.remainingQuantity <= 0) {
      return {
        label: 'Tạm hết hàng',
        badgeClass: 'tbl-badge tbl-badge--danger',
        tooltip: 'Mặt hàng đã hết hạn mức bán trong ngày',
      };
    }
    if (s.openingQuantity > 0 && s.remainingQuantity / s.openingQuantity <= 0.2) {
      return {
        label: 'Sắp hết',
        badgeClass: 'tbl-badge tbl-badge--warning',
        tooltip: `Chỉ còn ${s.remainingQuantity}/${s.openingQuantity} — kiểm tra quầy và chốt bổ sung`,
      };
    }
    return {
      label: 'Đang mở bán',
      badgeClass: 'tbl-badge tbl-badge--success',
      tooltip: 'Mặt hàng đang mở bán bình thường trên POS',
    };
  }

  lowCount(): number {
    return this.stocks().filter(
      s =>
        s.openingQuantity != null &&
        s.remainingQuantity != null &&
        s.remainingQuantity > 0 &&
        s.openingQuantity > 0 &&
        s.remainingQuantity / s.openingQuantity <= 0.2,
    ).length;
  }

  outCount(): number {
    return this.stocks().filter(s => s.remainingQuantity != null && s.remainingQuantity <= 0).length;
  }

  unstockedCount(): number {
    return this.stocks().filter(s => s.openingQuantity == null).length;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /** Mở modal lịch sử biến động tồn của 1 biến thể. */
  openHistory(row: PosDailyStock): void {
    this.historyTarget = row;
    this.historyPageIndex.set(DEFAULT_PAGE_INDEX);
    this.isHistoryVisible.set(true);
    this.loadHistory();
  }

  closeHistory(): void {
    this.isHistoryVisible.set(false);
  }

  onHistoryPageChange(index: number): void {
    this.historyPageIndex.set(index);
    this.loadHistory();
  }

  // ── Tab NVL & Cấp hàng ─────────────────────────────────────────────
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    if (index === 1 && !this.shortage()) {
      this.loadShortage();
    }
  }

  loadShortage(): void {
    if (!this.selectedBranchId) {
      this.toastService.warning('Chưa chọn chi nhánh', 'Vui lòng chọn chi nhánh trước khi xem đối soát NVL.');
      return;
    }
    this.shortageLoading.set(true);
    this.shiftService
      .getMaterialShortage(this.selectedBranchId, toISODate(this.selectedBusinessDate))
      .subscribe({
        next: res => {
          this.shortage.set(res);
          this.shortageLoading.set(false);
        },
        error: (err: Error) => {
          this.shortageLoading.set(false);
          this.toastService.error(err.message || 'Không tải được bảng đối soát NVL.');
        },
      });
  }

  shortageCount(): number {
    return (this.shortage()?.lines ?? []).filter(l => l.shortageQuantity > 0).length;
  }

  openRequestReplenishment(): void {
    const count = this.shortageCount();
    if (count === 0) {
      this.toastService.info('Kho quán đủ NVL cho kế hoạch, không cần xin cấp.');
      return;
    }
    const s = this.shortage();
    this.modalService.confirm({
      nzTitle: 'Xác nhận xin cấp hàng',
      nzContent: `Tạo yêu cầu xin cấp <strong>${count} NVL thiếu</strong> từ kho tổng (<strong>${s?.centralWarehouseCode || ''}</strong>) về kho quán (<strong>${s?.warehouseCode || ''}</strong>)? Kho tổng sẽ duyệt rồi mới xuất.`,
      nzOkText: 'Tạo yêu cầu',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.doRequestReplenishment(),
    });
  }

  loadHistory(): void {
    const target = this.historyTarget;
    if (!target || !this.selectedBranchId) return;
    this.historyLoading.set(true);
    this.shiftService
      .stockHistory({
        branchId: this.selectedBranchId,
        variantId: target.variantId,
        pageIndex: this.historyPageIndex(),
        pageSize: this.historyPageSize(),
      })
      .subscribe({
        next: res => {
          this.historyItems.set(res.items);
          this.historyTotal.set(res.total);
          this.historyLoading.set(false);
        },
        error: (err: Error) => {
          this.historyLoading.set(false);
          this.toastService.error(err.message || 'Không tải được lịch sử biến động tồn.');
        },
      });
  }

  submitRestockForm(): void {
    if (this.restockForm.invalid) {
      this.restockForm.markAllAsTouched();
      return;
    }
    this.isSavingRestock.set(true);
    const val = this.restockForm.value;

    // Chỉ gửi đúng RestockDailyStockPayload BE (bỏ productId chỉ dùng chọn biến thể trên UI).
    this.shiftService
      .restock({
        branchId: val.branchId,
        variantId: val.variantId,
        openingQuantity: val.openingQuantity,
        note: val.note || null,
      }).subscribe({
      next: res => {
        this.isSavingRestock.set(false);
        this.isRestockModalVisible.set(false);
        this.toastService.success(
          'Chốt tồn mở bán thành công',
          `Đã chốt tồn mở bán: ${res.openingQuantity} sản phẩm cho ngày ${res.businessDate}`,
        );
        this.loadData();
      },
      error: (err: ShiftServiceError) => {
        this.isSavingRestock.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.restockForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Lỗi chốt tồn', err.message);
      },
    });
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private initForms(): void {
    this.restockForm = this.fb.group({
      branchId: ['', [Validators.required]],
      productId: [null as string | null, [Validators.required]],
      variantId: ['', [Validators.required]],
      openingQuantity: [100, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  private doBulkRestock(rows: PosDailyStock[]): void {
    const branchId = this.selectedBranchId;
    if (!branchId) return;
    this.isSavingRestock.set(true);
    this.shiftService
      .restockBatch(
        branchId,
        rows.map(r => ({ variantId: r.variantId, openingQuantity: r.capabilityQuantity ?? 0 })),
        'Chốt theo gợi ý NVL',
      )
      .subscribe({
        next: res => {
          this.isSavingRestock.set(false);
          if (res.failed > 0) {
            this.toastService.warning(
              'Chốt xong một phần',
              `Đã chốt ${res.succeeded}/${rows.length} dòng, ${res.failed} dòng lỗi.`,
            );
          } else {
            this.toastService.success('Chốt theo gợi ý thành công', `Đã chốt ${res.succeeded} dòng.`);
          }
          this.loadData();
        },
        error: (err: Error) => {
          this.isSavingRestock.set(false);
          this.toastService.error(err.message || 'Không chốt được tồn hàng loạt.');
        },
      });
  }

  private loadRestockVariants(productId: string, preselectVariantId?: string | null): void {
    this.loadingRestockVariants.set(true);
    this.variantService.getVariants(productId).subscribe({
      next: list => {
        this.restockVariants.set(
          (list ?? [])
            .filter(v => v.status !== 'INACTIVE')
            .map(v => ({ value: v.id, label: `${v.variantCode} — ${v.variantName}` })),
        );
        this.loadingRestockVariants.set(false);
        if (preselectVariantId) {
          this.restockForm.get('variantId')?.setValue(preselectVariantId);
        }
      },
      error: () => {
        this.restockVariants.set([]);
        this.loadingRestockVariants.set(false);
      },
    });
  }

  private doRequestReplenishment(): void {
    if (!this.selectedBranchId) return;
    this.isRequesting.set(true);
    this.shiftService
      .requestReplenishment(this.selectedBranchId, toISODate(this.selectedBusinessDate))
      .subscribe({
        next: res => {
          this.isRequesting.set(false);
          this.toastService.success(
            'Tạo yêu cầu thành công',
            `Phiếu ${res.code} đang chờ kho tổng duyệt (màn Điều chuyển).`,
          );
          this.loadShortage();
        },
        error: (err: Error) => {
          this.isRequesting.set(false);
          this.toastService.error(err.message || 'Không tạo được yêu cầu cấp hàng.');
        },
      });
  }
}
