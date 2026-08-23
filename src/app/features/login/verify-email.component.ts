import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { FormsModule } from '@angular/forms';

import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { LoginService } from '../login/login.service';
import { LoginException } from '../login/login.model';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-verify-email',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, NzButtonModule, NzInputModule, NzCardModule, NzIconDirective, NzFormModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
  standalone: true,
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly toast = inject(AppNotificationService);
  private readonly theme = inject(ThemeService);

  readonly otp = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  readonly email = signal('');
  readonly verifying = signal(false);
  readonly resending = signal(false);

  private verifyToken = '';

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.verifyToken = token;
    this.email.set(email);
    if (!this.verifyToken) {
      this.router.navigate(['/register']);
    }
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
  }

  verify(): void {
    if (this.otp.invalid || !this.verifyToken) {
      this.otp.markAsTouched();
      return;
    }
    this.verifying.set(true);
    this.loginService.verifyEmail(this.verifyToken, this.otp.value).subscribe({
      next: () => this.router.navigate(['/store']),
      error: err => {
        this.verifying.set(false);
        const msg = err instanceof LoginException ? err.message : 'Mã xác thực không đúng hoặc đã hết hạn.';
        this.toast.error(msg);
        this.otp.setValue('');
      },
    });
  }

  resend(): void {
    if (!this.verifyToken || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.loginService.resendOtp(this.verifyToken).subscribe({
      next: auth => {
        this.resending.set(false);
        if (auth.verifyToken) {
          this.verifyToken = auth.verifyToken;
          this.router.navigate([], {
            queryParams: { token: auth.verifyToken, email: this.email() },
            replaceUrl: true,
          });
        }
        this.toast.success('Mã xác thực mới đã được gửi đến email của bạn.');
      },
      error: err => {
        this.resending.set(false);
        const msg = err instanceof LoginException ? err.message : 'Gửi lại mã thất bại, vui lòng thử lại.';
        this.toast.error(msg);
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}

export default VerifyEmailComponent;
