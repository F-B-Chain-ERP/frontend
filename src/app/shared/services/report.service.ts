import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map, switchMap, from } from 'rxjs';
import { ApplicationConfigService } from '../../core/config/application-config.service';

export interface ReportJobResponse {
  id: string;
  module: string;
  reportType: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  format: 'EXCEL' | 'PDF';
  requestedBy: string;
  branchId?: string;
  estimatedRows?: number;
  fileUrl?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReportJobSummaryResponse {
  id: string;
  module: string;
  reportType: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  format: 'EXCEL' | 'PDF';
  fileUrl?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExportResult {
  isAsync: boolean;
  blob?: Blob;
  filename?: string;
  job?: ReportJobResponse;
}

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  /**
   * Gọi API xuất báo cáo hỗ trợ cả hai chế độ Đồng bộ (nhận file ngay) và Bất đồng bộ (nhận Job ID).
   */
  exportReport(endpointPath: string, payload: any): Observable<ExportResult> {
    const url = this.config.getEndpointFor(endpointPath);

    return this.http
      .post(url, payload, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        switchMap((res: HttpResponse<Blob>) => {
          const mode = res.headers.get('X-Report-Mode') || (res.status === 202 ? 'ASYNC' : 'SYNC');

          if (mode === 'ASYNC' || res.status === 202) {
            // Đọc blob dưới dạng JSON để lấy thông tin ReportJob
            return from(res.body!.text()).pipe(
              map(text => {
                const envelope: ApiEnvelope<ReportJobResponse> = JSON.parse(text);
                return {
                  isAsync: true,
                  job: envelope.data,
                };
              }),
            );
          } else {
            // Nhận file trực tiếp
            const contentDisposition = res.headers.get('Content-Disposition') || '';
            let filename = 'BaoCao_Xuat';

            if (contentDisposition.includes("filename*=UTF-8''")) {
              filename = decodeURIComponent(contentDisposition.split("filename*=UTF-8''")[1]);
            } else if (contentDisposition.includes('filename=')) {
              filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
            }

            return from(
              Promise.resolve({
                isAsync: false,
                blob: res.body!,
                filename,
              } as ExportResult),
            );
          }
        }),
      );
  }

  /**
   * Tải file báo cáo hoàn thành của tác vụ bất đồng bộ từ MinIO proxy.
   * Stream nhị phân về client, tự suy ra tên file từ Content-Disposition.
   */
  downloadJobFile(jobId: string): Observable<{ blob: Blob; filename: string }> {
    const url = this.config.getEndpointFor(`api/v1/reports/jobs/${jobId}/download`);
    return this.http.get(url, { observe: 'response', responseType: 'blob' }).pipe(
      map((res: HttpResponse<Blob>) => {
        const contentDisposition = res.headers.get('Content-Disposition') || '';
        let filename = `BaoCao_TacVu_${jobId.slice(0, 8)}.xlsx`;

        if (contentDisposition.includes("filename*=UTF-8''")) {
          filename = decodeURIComponent(contentDisposition.split("filename*=UTF-8''")[1].replace(/"/g, ''));
        } else if (contentDisposition.includes('filename=')) {
          filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
        }
        return { blob: new Blob([res.body!]), filename };
      }),
    );
  }

  /**
   * Kích hoạt tải tệp nhị phân về máy client.
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Lấy trạng thái tiến độ của tác vụ báo cáo theo Job ID.
   */
  getJobStatus(jobId: string): Observable<ReportJobResponse> {
    const url = this.config.getEndpointFor(`api/v1/reports/jobs/${jobId}`);
    return this.http.get<ApiEnvelope<ReportJobResponse>>(url).pipe(map(res => res.data));
  }

  /**
   * Lấy danh sách các tác vụ xuất báo cáo của người dùng hiện tại.
   */
  listMyJobs(page = 0, size = 20): Observable<PageEnvelope<ReportJobSummaryResponse>> {
    const url = this.config.getEndpointFor(`api/v1/reports/jobs?page=${page}&size=${size}`);
    return this.http.get<ApiEnvelope<PageEnvelope<ReportJobSummaryResponse>>>(url).pipe(map(res => res.data));
  }

  /**
   * Hủy tác vụ báo cáo đang chờ.
   */
  cancelJob(jobId: string): Observable<void> {
    const url = this.config.getEndpointFor(`api/v1/reports/jobs/${jobId}`);
    return this.http.delete<ApiEnvelope<void>>(url).pipe(map(() => void 0));
  }
}
