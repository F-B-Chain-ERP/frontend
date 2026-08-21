import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { AppButtonComponent } from '../../shared/app-button/app-button.component';

export type ErrorType = '404' | '403' | '500';

@Component({
  selector: 'app-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss'],
  imports: [NzIconDirective, AppButtonComponent],
  standalone: true,
})
export class ErrorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Input() code?: ErrorType;
  @Input() title?: string;
  @Input() description?: string;
  @Input() isCardOnly = false;

  readonly errorCode = signal<ErrorType>('404');
  readonly errorTitle = signal<string>('Không tìm thấy trang');
  readonly errorDescription = signal<string>(
    'Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.',
  );

  ngOnInit(): void {
    if (this.code) {
      this.applyErrorMeta(this.code, this.title, this.description);
      return;
    }

    this.route.data.subscribe(data => {
      const code = (data['errorCode'] as ErrorType) || '404';
      const title = data['title'] as string;
      const desc = (data['description'] || data['errorMessage']) as string;
      this.applyErrorMeta(code, title, desc);
    });
  }

  applyErrorMeta(code: ErrorType, customTitle?: string, customDesc?: string): void {
    this.errorCode.set(code);
    if (code === '403') {
      this.errorTitle.set(customTitle || 'Truy cập bị từ chối');
      this.errorDescription.set(
        customDesc || 'Bạn không có quyền hạn truy cập vào tài nguyên này. Vui lòng liên hệ quản trị viên.',
      );
    } else if (code === '500') {
      this.errorTitle.set(customTitle || 'Hệ thống gặp sự cố');
      this.errorDescription.set(
        customDesc || 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. Vui lòng thử lại sau ít phút.',
      );
    } else {
      this.errorTitle.set(customTitle || 'Không tìm thấy trang');
      this.errorDescription.set(
        customDesc || 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.',
      );
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/admin/home']);
    }
  }

  goHome(): void {
    this.router.navigate(['/admin/home']);
  }
}
export default ErrorComponent;
