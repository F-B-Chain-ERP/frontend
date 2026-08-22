import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { ThemeService } from '../../core/theme/theme.service';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';

const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return /\s/.test(value) ? { whitespace: true } : null;
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, NzInputModule, NzIconDirective, NzButtonModule, AppButtonComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.scss'],
  standalone: true,
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(AppNotificationService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly currentYear = new Date().getFullYear();

  registerForm = new FormGroup(
    {
      fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]{9,11}$/)] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), noWhitespaceValidator] }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6), noWhitespaceValidator, Validators.pattern(PASSWORD_REGEX)],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pwd = (group.get('password')?.value as string) ?? '';
    const confirm = (group.get('confirmPassword')?.value as string) ?? '';
    if (!confirm) return null;
    return pwd === confirm ? null : { mismatch: true };
  }

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    // Simulate API — 900ms
    setTimeout(() => {
      this.loading.set(false);
      const { fullName } = this.registerForm.getRawValue();
      this.toast.success(
        `Chào mừng ${fullName}! Tài khoản đã được tạo.`,
        'Vui lòng đăng nhập để bắt đầu đặt món và tích điểm. Ưu đãi 20% đã được áp dụng cho đơn đầu tiên!',
      );
      this.router.navigate(['/login']);
    }, 900);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
export default RegisterComponent;
