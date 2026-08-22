import {Injectable, signal} from '@angular/core';

export type SeparatorChar = ',' | '.' | ' ';

const SEPARATOR_MAP: Record<string, SeparatorChar> = {
  '0': ',',
  '1': '.',
  '2': ' ',
};
const THOUSAND_GROUP_SIZE = 3;

@Injectable({providedIn: 'root'})
export class NumberFormatSettingsService {
  readonly thousandSeparator = signal<SeparatorChar>(',');
  readonly decimalSeparator = signal<SeparatorChar>('.');

  readonly useForeignCurrency = signal<boolean>(false);
  readonly decimalPlaces = signal<Record<string, number>>({});

  setFromConfig(nchn: string | null | undefined, nchdv: string | null | undefined): void {
    if (nchn != null && SEPARATOR_MAP[nchn]) {
      this.thousandSeparator.set(SEPARATOR_MAP[nchn]);
    }
    if (nchdv != null && SEPARATOR_MAP[nchdv]) {
      this.decimalSeparator.set(SEPARATOR_MAP[nchdv]);
    }
  }

  setDecimalConfig(useForeignCurrency: boolean, decimalPlaces: Record<string, number | string | null | undefined>): void {
    this.useForeignCurrency.set(!!useForeignCurrency);
    const normalized: Record<string, number> = {};
    for (const [key, raw] of Object.entries(decimalPlaces)) {
      const parsed = Number(raw);
      normalized[key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    this.decimalPlaces.set(normalized);
  }

  formatDigits(digitsOnly: string): string {
    const sep = this.thousandSeparator();
    const groups: string[] = [];
    for (let i = 0; i < digitsOnly.length; i++) {
      const remaining = digitsOnly.length - i;
      if (i > 0 && remaining % THOUSAND_GROUP_SIZE === 0) {
        groups.push(sep);
      }
      groups.push(digitsOnly[i]);
    }
    return groups.join('');
  }

  parseDigits(value: string): string {
    const sep = this.thousandSeparator().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return value.replace(new RegExp(sep, 'g'), '').replace(/[^\d]/g, '');
  }

  decimalsFor(configKey: string): number {
    return this.useForeignCurrency() ? (this.decimalPlaces()[configKey] ?? 0) : 0;
  }

  formatAmount(value: number | null | undefined, configKey: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const decimals = this.decimalsFor(configKey);
    const fixed = value.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const sign = intPart.startsWith('-') ? '-' : '';
    const groupedInt = this.formatDigits(intPart.replace('-', ''));
    return decPart ? `${sign}${groupedInt}${this.decimalSeparator()}${decPart}` : `${sign}${groupedInt}`;
  }

  parseAmount(text: string, configKey: string): number {
    const thousandSep = this.thousandSeparator().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const decimalSep = this.decimalSeparator().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withoutThousand = text.replace(new RegExp(thousandSep, 'g'), '');
    const normalized = withoutThousand.replace(new RegExp(decimalSep), '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    if (this.decimalsFor(configKey) === 0) {
      const digitsOnly = cleaned.replace(/\./g, '');
      return digitsOnly === '' ? 0 : Number(digitsOnly);
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
