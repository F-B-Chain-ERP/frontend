import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SAFE_TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\s\-_.]*$/u;

export const SAFE_TEXT_ERROR_MESSAGE =
  'Chỉ được nhập chữ, số, khoảng trắng, dấu gạch ngang (-), gạch dưới (_) và dấu chấm (.)';

export function safeTextValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || SAFE_TEXT_PATTERN.test(control.value) ? null : { invalidChars: true };
}

export function maxDigitsValidator(maxDigits: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const digitCount = Math.abs(Number(value)).toString().replace('.', '').length;

    return digitCount > maxDigits ? { maxDigits: { requiredDigits: maxDigits, actualDigits: digitCount } } : null;
  };
}
