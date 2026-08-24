import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators, FormArray, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, tap } from 'rxjs/operators';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { EnterAsTabContainerDirective } from '../../../shared/directives/enter-as-tab-container.directive';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { PurchaseOrderService } from './po.service';
import {
  CreatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
  UpdatePurchaseOrderPayload,
  calcGrandTotal,
  calcLineTotal,
} from './po.model';
import { MaterialOption, PoMasterDataService, SupplierOption, UnitOption, WarehouseOption } from './po-master-data.service';

interface ItemControls {
  materialId: FormControl<string | null>;
  unitId: FormControl<string | null>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
}

interface ItemForm {
  materialId: string | null;
  unitId: string | null;
  quantity: number | null;
  unitPrice: number | null;
}

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzTableModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzIconModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './po-form.component.html',
  styleUrls: ['./po-form.component.scss'],
})
export class PurchaseOrderFormComponent extends BaseComponent implements OnInit {
  readonly Role = ROLE;

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly isEditMode = signal(false);
  readonly poCodeDisplay = signal<string>('');

  // Master data
  readonly suppliers = signal<SupplierOption[]>([]);
  readonly warehouses = signal<WarehouseOption[]>([]);
  readonly materials = signal<MaterialOption[]>([]);
  readonly units = signal<UnitOption[]>([]);

  readonly poForm = this.fb.nonNullable.group({
    poCode: ['', [Validators.maxLength(50)]],
    supplierId: [null as string | null, Validators.required],
    warehouseId: [null as string | null, Validators.required],
    orderDate: [new Date() as Date | null, Validators.required],
    expectedDate: [null as Date | null],
    note: ['', [Validators.maxLength(500)]],
    items: this.fb.array<FormGroup<ItemControls>>([]),
  });

  // Reactive grand total theo valueChanges của FormArray
  readonly grandTotal = computed(() =>
    calcGrandTotal((this.itemsValue() ?? []).map(row => ({ quantity: row.quantity ?? 0, unitPrice: row.unitPrice ?? 0 }))),
  );

  private readonly route = inject(ActivatedRoute);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly masterDataService = inject(PoMasterDataService);
  private readonly itemsValue = toSignal(this.poForm.controls.items.valueChanges, { initialValue: null });

  get items(): FormArray<FormGroup<ItemControls>> {
    return this.poForm.controls.items;
  }

  /** Định dạng đơn giá kiểu tiền tệ: 1,250,000 (ngăn cách nghìn bằng dấu phẩy) */
  formatPrice(value: number): string {
    return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  parsePrice(value: string): number {
    return parseFloat(value.replace(/,/g, ''));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!id);

    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/purchase-orders/list' },
      { label: 'Đơn mua hàng', url: '/admin/procurement/purchase-orders/list' },
      { label: this.isEditMode() ? 'Cập nhật' : 'Tạo mới', url: this.router.url },
    ]);

    if (this.items.length === 0) {
      this.addRow();
    }
    this.loadMasterData();
    if (id) {
      this.loadPurchaseOrder(id);
    }
  }

  loadMasterData(): void {
    this.masterDataService
      .getSuppliers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.suppliers.set(list));
    this.masterDataService
      .getWarehouses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.warehouses.set(list));
    this.masterDataService
      .getMaterials()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.materials.set(list));
    this.masterDataService
      .getUnits()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.units.set(list));
  }

  loadPurchaseOrder(id: string): void {
    this.loading.set(true);
    this.purchaseOrderService
      .getPurchaseOrderById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: po => {
          this.poCodeDisplay.set(po.poCode);
          this.poForm.patchValue({
            poCode: po.poCode,
            supplierId: po.supplierId,
            warehouseId: po.warehouseId,
            orderDate: this.parseDate(po.orderDate),
            expectedDate: this.parseDate(po.expectedDate),
            note: po.note ?? '',
          });
          this.items.clear();
          for (const item of po.items ?? []) {
            const row = this.createItemGroup();
            row.patchValue({
              materialId: item.materialId,
              unitId: item.unitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            });
            row.markAsPristine();
            row.markAsUntouched();
            this.items.push(row);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Không thể tải thông tin đơn mua hàng.');
          this.backToList();
        },
      });
  }

  createItemGroup(): FormGroup<ItemControls> {
    const row: FormGroup<ItemControls> = new FormGroup<ItemControls>({
      materialId: new FormControl<string | null>(null, Validators.required),
      unitId: new FormControl<string | null>(null, Validators.required),
      quantity: new FormControl<number | null>(null, [Validators.required, Validators.min(0.0001)]),
      unitPrice: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
    });

    // Chọn nguyên liệu xong tự điền đơn vị tính chuẩn nếu chưa chọn
    row.controls.materialId.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(materialId => {
          const material = this.materials().find(m => m.id === materialId);
          if (material && !row.controls.unitId.value) {
            row.controls.unitId.setValue(material.baseUnitId);
          }
        }),
      )
      .subscribe();

    return row;
  }

  addRow(): void {
    this.items.push(this.createItemGroup());
  }

  removeRow(index: number): void {
    if (this.items.length <= 1) {
      this.toastService.warning('Đơn mua hàng phải có ít nhất một dòng chi tiết.');
      return;
    }
    this.items.removeAt(index);
  }

  lineTotal(index: number): number {
    const row = this.items.at(index);
    return calcLineTotal({ quantity: row?.value.quantity ?? 0, unitPrice: row?.value.unitPrice ?? 0 });
  }

  onSubmit(): void {
    if (!this.validateAndFocusFirstInvalid(this.poForm)) {
      return;
    }
    if (this.items.length === 0) {
      this.toastService.warning('Đơn mua hàng phải có ít nhất một dòng chi tiết.');
      return;
    }

    const payloadItems: PurchaseOrderItemPayload[] = this.items.value.map(row => ({
      materialId: row.materialId!,
      unitId: row.unitId!,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
    }));

    this.saving.set(true);

    if (this.isEditMode()) {
      const id = this.route.snapshot.paramMap.get('id')!;
      const payload: UpdatePurchaseOrderPayload = {
        supplierId: this.poForm.value.supplierId!,
        warehouseId: this.poForm.value.warehouseId!,
        orderDate: this.toDateString(this.poForm.value.orderDate),
        expectedDate: this.toDateString(this.poForm.value.expectedDate),
        note: this.poForm.value.note?.trim() || null,
        items: payloadItems,
      };
      this.purchaseOrderService
        .updatePurchaseOrder(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.onSaveSuccess(`Đã cập nhật đơn ${this.poCodeDisplay()}`),
          error: () => this.onSaveError(),
        });
      return;
    }

    const payload: CreatePurchaseOrderPayload = {
      poCode: this.poForm.value.poCode?.trim() || null,
      supplierId: this.poForm.value.supplierId!,
      warehouseId: this.poForm.value.warehouseId!,
      orderDate: this.toDateString(this.poForm.value.orderDate),
      expectedDate: this.toDateString(this.poForm.value.expectedDate),
      note: this.poForm.value.note?.trim() || null,
      items: payloadItems,
    };
    this.purchaseOrderService
      .createPurchaseOrder(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: po => this.onSaveSuccess(`Đã tạo đơn ${po.poCode} (nháp)`),
        error: () => this.onSaveError(),
      });
  }

  backToList(): void {
    this.router.navigate(['/admin/procurement/purchase-orders/list']);
  }

  private onSaveSuccess(message: string): void {
    this.saving.set(false);
    this.toastService.success(message);
    this.backToList();
  }

  private onSaveError(): void {
    this.saving.set(false);
    this.toastService.error('Không thể lưu đơn mua hàng.', 'Vui lòng kiểm tra lại dữ liệu hoặc thử lại sau.');
  }

  private toDateString(date: Date | null | undefined): string | null {
    if (!date) {
      return null;
    }
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(p => Number.isNaN(p))) {
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
}
