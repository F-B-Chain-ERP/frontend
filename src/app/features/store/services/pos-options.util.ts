import { ProductVariant } from '../../menu/products/variants/variant.model';

export interface SizeOption {
  id: string;
  variantCode: string;
  name: string;
  sizeLabel: string;
  volume: string;
  extraPrice: number;
  finalPrice: number;
}

export interface LevelOption {
  code: string;
  label: string;
}

export interface ToppingOption {
  id: string;
  label: string;
  price: number;
  maxQuantity: number;
}

/**
 * Parse option dùng chung cho store + product-detail (trước đây mỗi màn 1 bản + label lung tung).
 * BE lưu raw string nên FE gửi MÃ mức (0/30/50/70/100), hiển thị label tiếng Việt.
 */
export function parseSizeOption(
  v: { id: string; variantCode?: string | null; variantName?: string | null; sizeLabel?: string | null; priceDelta?: number | null },
  basePrice: number,
): SizeOption {
  const label = (v.sizeLabel || '').trim().toUpperCase();
  const code = (v.variantCode || '').trim().toUpperCase();
  let volume = 'Tiêu chuẩn';
  let name = v.variantName || `Size ${label || 'Chuẩn'}`;

  if (label === 'S' || code.includes('-S') || code.endsWith('S')) {
    volume = '355ml';
    if (!v.variantName) name = 'Size Nhỏ (S)';
  } else if (label === 'M' || code.includes('-M') || code.endsWith('M')) {
    volume = '500ml';
    if (!v.variantName) name = 'Size Vừa (M)';
  } else if (label === 'L' || code.includes('-L') || code.endsWith('L')) {
    volume = '700ml';
    if (!v.variantName) name = 'Size Lớn (L)';
  } else if (label === 'XL' || code.includes('-XL') || code.endsWith('XL')) {
    volume = '850ml';
    if (!v.variantName) name = 'Size Khổng Lồ (XL)';
  }

  const extra = Number(v.priceDelta) || 0;
  return {
    id: v.id,
    variantCode: v.variantCode || '',
    name,
    sizeLabel: label || 'STD',
    volume,
    extraPrice: extra,
    finalPrice: basePrice + extra,
  };
}

const SUGAR_LABELS: Record<string, string> = {
  '0': 'Không đường (0%)',
  '30': '30%',
  '50': '50%',
  '70': '70%',
  '100': '100% (Chuẩn)',
};

export function parseSugarOptions(csvStr?: string | null): LevelOption[] {
  const codes = csvStr?.trim()
    ? csvStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : ['0', '30', '50', '70', '100'];
  return codes.map(code => ({ code, label: SUGAR_LABELS[code] ?? `${code}%` }));
}

const ICE_LABELS: Record<string, string> = {
  '0': 'Không đá (0%)',
  '30': '30% đá',
  '50': '50% đá',
  '70': '70% đá',
  '100': '100% đá (Chuẩn)',
};

export function parseIceOptions(csvStr?: string | null): LevelOption[] {
  const codes = csvStr?.trim()
    ? csvStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : ['0', '30', '50', '70', '100'];
  const options = codes.map(code => ({ code, label: ICE_LABELS[code] ?? `${code}% đá` }));
  if (!options.some(o => o.code === 'HOT')) {
    options.push({ code: 'HOT', label: 'Uống nóng' });
  }
  return options;
}

export function defaultSugarCode(options: LevelOption[]): string {
  return options.find(o => o.code === '100')?.code ?? options[0]?.code ?? '100';
}

export function defaultIceCode(options: LevelOption[]): string {
  return options.find(o => o.code === '100')?.code ?? options[0]?.code ?? '100';
}

export function toToppingOptions(
  items: { toppingId: string; toppingName: string; toppingPrice: number | string; maxQuantity: number }[],
): ToppingOption[] {
  return items.map(t => ({
    id: t.toppingId,
    label: t.toppingName,
    price: Number(t.toppingPrice) || 0,
    maxQuantity: t.maxQuantity ?? 1,
  }));
}

export type { ProductVariant };
