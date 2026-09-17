import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';

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

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {BranchService} from '../../../core/auth/branch.service';
import {StoreShiftService} from '../shift/shift.service';
import {PosDailyStock} from '../shift/shift.model';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';

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
  private readonly shiftService = inject(StoreShiftService);

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

  // Modal Chốt tồn mở bán / Restock
  readonly isRestockModalVisible = signal<boolean>(false);
  readonly isSavingRestock = signal<boolean>(false);
  restockForm!: FormGroup;

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

  private initForms(): void {
    this.restockForm = this.fb.group({
      branchId: ['', [Validators.required]],
      variantId: ['', [Validators.required]],
      openingQuantity: [100, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  loadData(): void {
    this.loading.set(true);
    // Dữ liệu tồn mở bán ngày (POS daily stock)
    setTimeout(() => {
      this.loading.set(false);
    }, 200);
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onReset(): void {
    this.selectedBusinessDate = new Date();
    this.searchQuery = '';
    this.pageIndex = 1;
    this.loadData();
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
      variantId: '',
      openingQuantity: 100,
      note: '',
    });
    this.isRestockModalVisible.set(true);
  }

  closeRestockModal(): void {
    this.isRestockModalVisible.set(false);
  }

  submitRestockForm(): void {
    if (this.restockForm.invalid) {
      this.restockForm.markAllAsTouched();
      return;
    }
    this.isSavingRestock.set(true);
    const val = this.restockForm.value;

    this.shiftService.restock(val).subscribe({
      next: res => {
        this.isSavingRestock.set(false);
        this.isRestockModalVisible.set(false);
        this.toastService.success(
          'Chốt tồn mở bán thành công',
          `Đã chốt tồn mở bán: ${res.openingQuantity} sản phẩm cho ngày ${res.businessDate}`,
        );
        this.loadData();
      },
      error: err => {
        this.isSavingRestock.set(false);
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
}
