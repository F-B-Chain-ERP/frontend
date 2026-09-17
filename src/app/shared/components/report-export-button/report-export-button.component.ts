import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ReportService, ExportResult } from '../../services/report.service';
import { AppNotificationService } from '../../app-notification/app-notification.service';

@Component({
  selector: 'app-report-export-button',
  standalone: true,
  imports: [CommonModule, NzDropDownModule, NzButtonModule, NzIconModule, NzSpinModule],
  templateUrl: './report-export-button.component.html',
  styleUrls: ['./report-export-button.component.scss'],
})
export class ReportExportButtonComponent {
  private readonly reportService = inject(ReportService);
  private readonly toast = inject(AppNotificationService);

  @Input({ required: true }) endpoint!: string;
  @Input() payload: any = {};
  @Input() label = 'Xuất báo cáo';
  @Input() btnType: 'primary' | 'default' | 'dashed' = 'default';
  @Input() disabled = false;

  @Output() exportStarted = new EventEmitter<void>();
  @Output() exportCompleted = new EventEmitter<ExportResult>();

  readonly loading = signal(false);

  triggerExport(format: 'EXCEL' | 'PDF'): void {
    if (this.loading() || this.disabled) return;

    this.loading.set(true);
    this.exportStarted.emit();

    const requestBody = {
      ...this.payload,
      format,
    };

    this.reportService.exportReport(this.endpoint, requestBody).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.exportCompleted.emit(result);

        if (result.isAsync) {
          this.toast.info(
            `Báo cáo khối lượng lớn đã được đưa vào hàng đợi xử lý ngầm (Mã tác vụ: ${result.job?.id?.slice(0, 8)}...). Bạn có thể theo dõi trong danh sách tác vụ.`
          );
        } else if (result.blob && result.filename) {
          this.reportService.downloadBlob(result.blob, result.filename);
          this.toast.success(`Đã xuất và tải xuống tệp ${result.filename} thành công!`);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Có lỗi xảy ra khi xuất báo cáo. Vui lòng thử lại.');
      },
    });
  }
}
