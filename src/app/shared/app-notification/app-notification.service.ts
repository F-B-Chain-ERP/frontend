import { inject, Injectable } from '@angular/core';
import { NzNotificationPlacement, NzNotificationService } from 'ng-zorro-antd/notification';

@Injectable({
  providedIn: 'root',
})
export class AppNotificationService {
  private readonly nzNotificationService = inject(NzNotificationService);
  public placement: NzNotificationPlacement = 'topRight';
  public duration = 3000;

  success(message: string): void;
  success(title: string, message: string): void;
  success(titleOrMessage: string, message?: string): void {
    if (message === undefined) {
      this.nzNotificationService.success('Thành công', titleOrMessage, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'success-notification',
      });
    } else {
      this.nzNotificationService.success(titleOrMessage, message, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'success-notification',
      });
    }
  }

  error(message: string): void;
  error(title: string, message: string): void;
  error(titleOrMessage: string, message?: string): void {
    if (message === undefined) {
      this.nzNotificationService.error('Lỗi', titleOrMessage, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'error-notification',
      });
    } else {
      this.nzNotificationService.error(titleOrMessage, message, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'error-notification',
      });
    }
  }

  warning(message: string): void;
  warning(title: string, message: string): void;
  warning(titleOrMessage: string, message?: string): void {
    if (message === undefined) {
      this.nzNotificationService.warning('Cảnh báo', titleOrMessage, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'warning-notification',
      });
    } else {
      this.nzNotificationService.warning(titleOrMessage, message, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'warning-notification',
      });
    }
  }

  info(message: string): void;
  info(title: string, message: string): void;
  info(titleOrMessage: string, message?: string): void {
    if (message === undefined) {
      this.nzNotificationService.info('Thông tin', titleOrMessage, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'info-notification',
      });
    } else {
      this.nzNotificationService.info(titleOrMessage, message, {
        nzPlacement: this.placement,
        nzDuration: this.duration,
        nzClass: 'info-notification',
      });
    }
  }
}
