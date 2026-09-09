import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AppButtonComponent } from '../../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../../shared/app-notification/app-notification.service';
import {
  STANDARD_BEVERAGE_SIZE_PRESETS,
  SyncProductVariantItem,
  VariantPreset,
  buildVariantFormGroup,
} from './variant.model';

@Component({
  selector: 'app-product-variant-form-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzInputModule,
    NzInputNumberModule,
    NzIconModule,
    NzTooltipModule,
    AppButtonComponent,
  ],
  templateUrl: './product-variant-form-table.component.html',
  styleUrls: ['./product-variant-form-table.component.scss'],
})
export class ProductVariantFormTableComponent {
  @Input({ required: true }) variantsArray!: FormArray<FormGroup>;
  @Input() basePrice: number | null | undefined = 0;

  readonly standardSizePresets = STANDARD_BEVERAGE_SIZE_PRESETS;
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(AppNotificationService);

  readonly currencyFormatter = (value: number | string): string =>
    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

  createVariantGroup(v?: Partial<SyncProductVariantItem>): FormGroup {
    return buildVariantFormGroup(this.fb, v, this.variantsArray ? this.variantsArray.length + 1 : 1);
  }

  addVariantLine(): void {
    const nextOrder = this.variantsArray.length + 1;
    this.variantsArray.push(this.createVariantGroup({ displayOrder: nextOrder }));
  }

  removeVariantLine(index: number): void {
    this.variantsArray.removeAt(index);
  }

  applyStandardSizePreset(preset: VariantPreset): void {
    this.variantsArray.clear();
    preset.items.forEach(item => {
      this.variantsArray.push(this.createVariantGroup(item));
    });
    this.toastService.success(`Đã áp dụng "${preset.label}" vào danh sách kích cỡ!`);
  }

  calculateVariantFinalPrice(priceDelta: number | null | undefined): number {
    const base = Number(this.basePrice) || 0;
    return base + (Number(priceDelta) || 0);
  }
}
