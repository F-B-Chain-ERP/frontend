import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

const SAFE_TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\s\-_.]*$/u;

export const SAFE_TEXT_ERROR_MESSAGE =
  'Chỉ được nhập chữ, số, khoảng trắng, dấu gạch ngang (-), gạch dưới (_) và dấu chấm (.)';

export function safeTextValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || SAFE_TEXT_PATTERN.test(control.value) ? null : {invalidChars: true};
}

export function maxDigitsValidator(maxDigits: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const digitCount = Math.abs(Number(value)).toString().replace('.', '').length;

    return digitCount > maxDigits ? {maxDigits: {requiredDigits: maxDigits, actualDigits: digitCount}} : null;
  };
}

/**
 * Chặn chữ / NaN / Infinity / số không hữu hạn.
 * type="number" vẫn paste được "abc", "e", "1e5" -> Number() = NaN -> phải báo lỗi rõ.
 */
export function finiteNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    if (typeof value === 'boolean' || Number.isNaN(num) || !Number.isFinite(num)) {
      return { notANumber: true };
    }
    return null;
  };
}

/** Giới hạn số chữ số thập phân (VD quantity scale 3, unitPrice scale 2). */
export function maxFractionDigitsValidator(maxFraction: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const str = String(value);
    // chặn ký hiệu e/E (1e3), +/-, hex — chỉ cho dạng số thập phân thuần
    if (/[eE]/.test(str)) {
      return { notANumber: true };
    }
    if (!/^-?\d+(\.\d+)?$/.test(str.trim())) {
      return { notANumber: true };
    }
    const fraction = str.split('.')[1];
    if (fraction && fraction.length > maxFraction) {
      return { maxFraction: { required: maxFraction, actual: fraction.length } };
    }
    return null;
  };
}
