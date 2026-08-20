import { Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotificationService } from '../app-notification/app-notification.service';
import { Subject } from 'rxjs';
import { AppModalService } from '../app-modal/app-modal.service';
import { BreadcrumbsService } from '../app-breadcrumbs/breadcrumbs.service';
import { AbstractControl, FormBuilder, ValidatorFn } from '@angular/forms';
import { safeTextValidator, maxDigitsValidator } from '../validators/safe-text.validator';

const INVALID_FIELD_SELECTOR = 'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, nz-select.ng-invalid, nz-input-number';
const DEFAULT_INVALID_FORM_MESSAGE = 'Vui lòng nhập đầy đủ thông tin bắt buộc.';

@Directive()
export abstract class BaseComponent implements OnDestroy {
  protected readonly toastService = inject(AppNotificationService);
  protected readonly modalService = inject(AppModalService);
  protected readonly router = inject(Router);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);
  protected readonly fb = inject(FormBuilder);
  protected readonly elementRef = inject(ElementRef);

  protected safeTextValidator(): ValidatorFn {
    return safeTextValidator();
  }
  protected maxDigitsValidator(maxDigits: number): ValidatorFn {
    return maxDigitsValidator(maxDigits);
  }

  protected destroy$ = new Subject<void>();

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected validateAndFocusFirstInvalid(
    form: AbstractControl,
    options?: { hostElement?: HTMLElement; message?: string },
  ): boolean {
    form.markAllAsTouched();
    if (form.valid) {
      return true;
    }
    const hostElement = (options?.hostElement ?? this.elementRef.nativeElement) as HTMLElement;
    setTimeout(() => {
      const invalidField = hostElement.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR);
      const fieldMessage = invalidField ? this.findAdjacentErrorMessage(invalidField) : null;
      this.toastService.error(options?.message ?? fieldMessage ?? DEFAULT_INVALID_FORM_MESSAGE);
      invalidField?.focus();
    });

    return false;
  }

  private findAdjacentErrorMessage(field: HTMLElement): string | null {
    const errorEl = field.parentElement?.querySelector<HTMLElement>('.form-error');
    const text = errorEl?.textContent?.trim();
    return text || null;
  }

  blockSpace(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  onPasteTrim(event: ClipboardEvent, control: AbstractControl | null): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') ?? '';
    const trimmedText = pastedText.trim();

    control?.setValue(trimmedText);
    control?.markAsTouched();
  }
}
