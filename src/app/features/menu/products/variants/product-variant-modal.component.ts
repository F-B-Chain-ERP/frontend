import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { BaseComponent } from '../../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../../shared/app-button/app-button.component';
import { AppModalComponent } from '../../../../shared/app-modal/app-modal.component';
import { Product, ProductDetail, getProductStatusMeta } from '../product.model';
import {
  CreateProductVariantRequest,
  ProductVariant,
  STANDARD_BEVERAGE_SIZE_PRESETS,
  SyncProductVariantItem,
  UpdateProductVariantRequest,
  VariantPreset,
} from './variant.model';
import { ProductVariantService } from './variant.service';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-product-variant-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSpinModule,
    NzTooltipModule,
    AppButtonComponent,
    AppModalComponent,
  ],
  templateUrl: './product-variant-modal.component.html',
  styleUrls: ['./product-variant-modal.component.scss'],
})
export class ProductVariantModalComponent extends BaseComponent implements OnChanges {
  @Input() visible = false;
  @Input() product: Product | ProductDetail | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() variantsUpdated = new EventEmitter<void>();

  readonly variantList = signal<ProductVariant[]>([]);
  readonly loadingVariants = signal(false);
  readonly isSavingVariant = signal(false);
  readonly editingVariantId = signal<string | null>(null);

  readonly standardSizePresets = STANDARD_BEVERAGE_SIZE_PRESETS;
  readonly getStatusMeta = getProductStatusMeta;

  private readonly variantService = inject(ProductVariantService);

  readonly currencyFormatter = (value: number | string): string =>
    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

  readonly variantForm = this.fb.group({
    variantCode: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    variantName: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    sizeLabel: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    priceDelta: this.fb.control<number>(0, [
      Validators.required,
    ]),
    displayOrder: this.fb.control<number>(1, [
      Validators.min(0),
    ]),
    status: this.fb.control<string>('ACTIVE'),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.product) {
      this.cancelEditVariantQuick();
      this.loadVariants();
    } else if (changes['product'] && this.visible && this.product) {
      this.cancelEditVariantQuick();
      this.loadVariants();
    }
  }

  loadVariants(): void {
    if (!this.product) return;
    this.loadingVariants.set(true);
    this.variantService
      .getVariants(this.product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list: ProductVariant[]) => {
          this.variantList.set(list || []);
          this.loadingVariants.set(false);
          const nextOrder = (list ? list.length : 0) + 1;
          this.variantForm.patchValue({ displayOrder: nextOrder });
        },
        error: (err: { message?: string }) => {
          this.loadingVariants.set(false);
          this.toastService.error(err.message || 'Không thể tải danh sách biến thể');
        },
      });
  }

  editVariantQuick(v: ProductVariant): void {
    this.editingVariantId.set(v.id);
    this.variantForm.patchValue({
      variantCode: v.variantCode,
      variantName: v.variantName,
      sizeLabel: v.sizeLabel,
      priceDelta: v.priceDelta,
      displayOrder: v.displayOrder,
      status: v.status || 'ACTIVE',
    });
  }

  cancelEditVariantQuick(): void {
    this.editingVariantId.set(null);
    const nextOrder = (this.variantList().length || 0) + 1;
    this.variantForm.reset({
      variantCode: '',
      variantName: '',
      sizeLabel: '',
      priceDelta: 0,
      displayOrder: nextOrder,
      status: 'ACTIVE',
    });
  }

  submitVariantQuick(): void {
    if (!this.validateAndFocusFirstInvalid(this.variantForm)) {
      return;
    }
    if (!this.product) return;

    const raw = this.variantForm.getRawValue();
    this.isSavingVariant.set(true);

    if (this.editingVariantId()) {
      const updateData: UpdateProductVariantRequest = {
        variantCode: (raw.variantCode || '').trim().toUpperCase(),
        variantName: (raw.variantName || '').trim(),
        sizeLabel: (raw.sizeLabel || '').trim(),
        priceDelta: Number(raw.priceDelta) || 0,
        displayOrder: Number(raw.displayOrder) || 0,
        status: raw.status || 'ACTIVE',
      };
      this.variantService
        .updateVariant(this.product.id, this.editingVariantId()!, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated: ProductVariant) => {
            this.isSavingVariant.set(false);
            this.toastService.success(`Cập nhật biến thể "${updated.variantName}" thành công!`);
            this.cancelEditVariantQuick();
            this.loadVariants();
            this.variantsUpdated.emit();
          },
          error: (err: { message?: string }) => {
            this.isSavingVariant.set(false);
            this.toastService.error(err.message || 'Không thể cập nhật biến thể');
          },
        });
    } else {
      const createData: CreateProductVariantRequest = {
        variantCode: (raw.variantCode || '').trim().toUpperCase(),
        variantName: (raw.variantName || '').trim(),
        sizeLabel: (raw.sizeLabel || '').trim(),
        priceDelta: Number(raw.priceDelta) || 0,
        displayOrder: Number(raw.displayOrder) || 0,
      };
      this.variantService
        .createVariant(this.product.id, createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created: ProductVariant) => {
            this.isSavingVariant.set(false);
            this.toastService.success(`Tạo biến thể "${created.variantName}" thành công!`);
            this.cancelEditVariantQuick();
            this.loadVariants();
            this.variantsUpdated.emit();
          },
          error: (err: { message?: string }) => {
            this.isSavingVariant.set(false);
            this.toastService.error(err.message || 'Không thể tạo biến thể');
          },
        });
    }
  }

  deleteVariantQuick(v: ProductVariant): void {
    if (!this.product) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa biến thể',
      nzContent: `Bạn có chắc muốn xóa biến thể <strong>${v.variantName} (${v.variantCode})</strong> của sản phẩm này?`,
      nzOkText: 'Xóa biến thể',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.variantService
          .deleteVariant(this.product!.id, v.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa biến thể "${v.variantName}"!`);
              this.loadVariants();
              this.variantsUpdated.emit();
            },
            error: (err: { message?: string }) => {
              this.toastService.error(err.message || 'Không thể xóa biến thể');
            },
          });
      },
    });
  }

  applyPresetQuick(preset: VariantPreset): void {
    if (!this.product) return;

    this.modalService.confirm({
      nzTitle: 'Áp dụng mẫu kích cỡ chuẩn',
      nzContent: `Hệ thống sẽ đồng bộ biến thể sản phẩm <strong>${this.product.name}</strong> theo ${preset.label}. Tiếp tục?`,
      nzOkText: 'Đồng ý',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        const payload: SyncProductVariantItem[] = preset.items.map(item => ({
          variantCode: item.variantCode,
          variantName: item.variantName,
          sizeLabel: item.sizeLabel,
          priceDelta: item.priceDelta,
          displayOrder: item.displayOrder,
          status: 'ACTIVE',
        }));

        this.loadingVariants.set(true);
        this.variantService
          .syncVariants(this.product!.id, payload)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res: ProductVariant[]) => {
              this.loadingVariants.set(false);
              this.variantList.set(res || []);
              this.toastService.success(`Đã áp dụng thành công ${preset.label}!`);
              this.variantsUpdated.emit();
            },
            error: (err: { message?: string }) => {
              this.loadingVariants.set(false);
              this.toastService.error(err.message || 'Không thể áp dụng mẫu');
            },
          });
      },
    });
  }

  onVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  closeModal(): void {
    this.onVisibleChange(false);
  }
}
