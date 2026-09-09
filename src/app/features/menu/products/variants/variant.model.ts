// ── Product Variants (Biến thể sản phẩm) ──────────────────────────

export interface ProductVariant {
  id: string;
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  priceDelta: number;
  displayOrder: number;
  status?: string;
}

export interface CreateProductVariantRequest {
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  priceDelta: number;
  displayOrder?: number;
}

export interface UpdateProductVariantRequest {
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  priceDelta: number;
  displayOrder?: number;
  status?: string;
}

export interface SyncProductVariantItem {
  id?: string | null;
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  priceDelta: number;
  displayOrder?: number;
  status?: string;
}

export interface SyncProductVariantsRequest {
  variants: SyncProductVariantItem[];
}

export interface VariantPreset {
  label: string;
  description: string;
  items: {
    variantCode: string;
    variantName: string;
    sizeLabel: string;
    priceDelta: number;
    displayOrder: number;
  }[];
}

export const STANDARD_BEVERAGE_SIZE_PRESETS: VariantPreset[] = [
  {
    label: 'Bộ 3 Size Tiêu chuẩn (S, M, L)',
    description: 'Size S (gốc), Size M (+5.000đ), Size L (+10.000đ)',
    items: [
      { variantCode: 'S', variantName: 'Size S (Nhỏ)', sizeLabel: 'S', priceDelta: 0, displayOrder: 1 },
      { variantCode: 'M', variantName: 'Size M (Vừa)', sizeLabel: 'M', priceDelta: 5000, displayOrder: 2 },
      { variantCode: 'L', variantName: 'Size L (Lớn)', sizeLabel: 'L', priceDelta: 10000, displayOrder: 3 },
    ],
  },
  {
    label: 'Bộ 2 Size Cà phê (M, L)',
    description: 'Size M (gốc), Size L (+6.000đ)',
    items: [
      { variantCode: 'M', variantName: 'Size Vừa', sizeLabel: 'M', priceDelta: 0, displayOrder: 1 },
      { variantCode: 'L', variantName: 'Size Lớn', sizeLabel: 'L', priceDelta: 6000, displayOrder: 2 },
    ],
  },
];

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/** Helper dựng một FormGroup dòng biến thể chuẩn hóa dùng chung cho cả FormTable và ProductList */
export function buildVariantFormGroup(
  fb: FormBuilder,
  v?: Partial<SyncProductVariantItem>,
  fallbackOrder: number = 1,
): FormGroup {
  return fb.group({
    id: fb.control<string | null>(v?.id ?? null),
    variantCode: fb.control<string>(v?.variantCode ?? '', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    variantName: fb.control<string>(v?.variantName ?? '', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    sizeLabel: fb.control<string>(v?.sizeLabel ?? '', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    priceDelta: fb.control<number>(v?.priceDelta ?? 0, [
      Validators.required,
    ]),
    displayOrder: fb.control<number>(v?.displayOrder ?? fallbackOrder, [
      Validators.min(0),
    ]),
    status: fb.control<string>(v?.status ?? 'ACTIVE'),
  });
}
