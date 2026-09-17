import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  Shift,
  CreateShiftPayload,
  UpdateShiftPayload,
  ShiftAssignment,
  CreateShiftAssignmentPayload,
  BulkAssignShiftPayload,
  OpenShiftPayload,
  CloseShiftPayload,
  ClosingSummary,
  ShiftReport,
  ConfirmShiftReportPayload,
  StoreDailyReport,
  GenerateDailyReportPayload,
  UpdateDailyReportPayload,
  PosDailyStock,
  RestockDailyStockPayload,
} from './shift.model';

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

export interface ShiftServiceError extends Error {
  fieldErrors?: Record<string, string>;
  errorCode?: string;
  status?: number;
}

@Injectable({
  providedIn: 'root',
})
export class StoreShiftService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  private get shiftApi(): string {
    return this.config.getEndpointFor('api/v1/shifts');
  }

  private get assignmentApi(): string {
    return this.config.getEndpointFor('api/v1/shift-assignments');
  }

  private get operationApi(): string {
    return this.config.getEndpointFor('api/v1/shift-operations');
  }

  private get dailyReportApi(): string {
    return this.config.getEndpointFor('api/v1/store-daily-reports');
  }

  private get posStockApi(): string {
    return this.config.getEndpointFor('api/v1/pos/stocks');
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. KHUNG CA CHUẨN (SHIFT TEMPLATES)
  // ════════════════════════════════════════════════════════════════════

  searchShifts(branchId?: string, status?: string, page = 0, size = 20): Observable<PageEnvelope<Shift>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (branchId) params = params.set('branchId', branchId);
    if (status) params = params.set('status', status);

    return this.http.get<ApiEnvelope<PageEnvelope<Shift>>>(this.shiftApi, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getShiftById(id: string): Observable<Shift> {
    return this.http.get<ApiEnvelope<Shift>>(`${this.shiftApi}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getShiftsByBranch(branchId: string, status?: string): Observable<Shift[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.http.get<ApiEnvelope<Shift[]>>(`${this.shiftApi}/branch/${branchId}`, { params }).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  createShift(payload: CreateShiftPayload): Observable<Shift> {
    return this.http.post<ApiEnvelope<Shift>>(this.shiftApi, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  updateShift(id: string, payload: UpdateShiftPayload): Observable<Shift> {
    return this.http.put<ApiEnvelope<Shift>>(`${this.shiftApi}/${id}`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  deleteShift(id: string): Observable<void> {
    return this.http.delete<ApiEnvelope<void>>(`${this.shiftApi}/${id}`).pipe(
      map(() => void 0),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // 2. PHÂN CA NHÂN VIÊN (SHIFT ASSIGNMENTS)
  // ════════════════════════════════════════════════════════════════════

  searchAssignments(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    accountId?: string,
    status?: string,
    page = 0,
    size = 20,
  ): Observable<PageEnvelope<ShiftAssignment>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (branchId) params = params.set('branchId', branchId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (accountId) params = params.set('accountId', accountId);
    if (status) params = params.set('status', status);

    return this.http.get<ApiEnvelope<PageEnvelope<ShiftAssignment>>>(this.assignmentApi, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getAssignmentById(id: string): Observable<ShiftAssignment> {
    return this.http.get<ApiEnvelope<ShiftAssignment>>(`${this.assignmentApi}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  assignShift(payload: CreateShiftAssignmentPayload): Observable<ShiftAssignment> {
    return this.http.post<ApiEnvelope<ShiftAssignment>>(this.assignmentApi, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  bulkAssignShifts(payload: BulkAssignShiftPayload): Observable<ShiftAssignment[]> {
    return this.http.post<ApiEnvelope<ShiftAssignment[]>>(`${this.assignmentApi}/bulk`, payload).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  cancelAssignment(id: string, reason?: string): Observable<void> {
    return this.http
      .post<ApiEnvelope<void>>(`${this.assignmentApi}/${id}/cancel`, reason ? { reason } : {})
      .pipe(
        map(() => void 0),
        catchError(err => throwError(() => this.errorMessage(err))),
      );
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. VẬN HÀNH CA & CHỐT KÉT (SHIFT OPERATIONS)
  // ════════════════════════════════════════════════════════════════════

  getMyActiveShift(): Observable<ShiftAssignment | null> {
    return this.http.get<ApiEnvelope<ShiftAssignment>>(`${this.operationApi}/my-active`).pipe(
      map(res => res.data ?? null),
      catchError(() => [null]),
    );
  }

  openShift(assignmentId: string, payload: OpenShiftPayload): Observable<ShiftAssignment> {
    return this.http.post<ApiEnvelope<ShiftAssignment>>(`${this.operationApi}/${assignmentId}/open`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getClosingSummary(assignmentId: string): Observable<ClosingSummary> {
    return this.http.get<ApiEnvelope<ClosingSummary>>(`${this.operationApi}/${assignmentId}/closing-summary`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  closeShift(assignmentId: string, payload: CloseShiftPayload): Observable<ShiftReport> {
    return this.http.post<ApiEnvelope<ShiftReport>>(`${this.operationApi}/${assignmentId}/close`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getShiftReportByAssignment(assignmentId: string): Observable<ShiftReport> {
    return this.http.get<ApiEnvelope<ShiftReport>>(`${this.operationApi}/assignment/${assignmentId}/report`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  confirmShiftReport(reportId: string, payload?: ConfirmShiftReportPayload): Observable<ShiftReport> {
    return this.http
      .put<ApiEnvelope<ShiftReport>>(`${this.operationApi}/reports/${reportId}/confirm`, payload ?? {})
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => this.errorMessage(err))),
      );
  }

  searchShiftReports(branchId?: string, businessDate?: string, page = 0, size = 20): Observable<PageEnvelope<ShiftReport>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (branchId) params = params.set('branchId', branchId);
    if (businessDate) params = params.set('businessDate', businessDate);

    return this.http.get<ApiEnvelope<PageEnvelope<ShiftReport>>>(`${this.operationApi}/reports`, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. BÁO CÁO NGÀY CỬA HÀNG (STORE DAILY REPORTS)
  // ════════════════════════════════════════════════════════════════════

  generateDailyReport(payload: GenerateDailyReportPayload): Observable<StoreDailyReport> {
    return this.http.post<ApiEnvelope<StoreDailyReport>>(`${this.dailyReportApi}/generate`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getDailyReportById(id: string): Observable<StoreDailyReport> {
    return this.http.get<ApiEnvelope<StoreDailyReport>>(`${this.dailyReportApi}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  getDailyReportByDate(branchId: string, businessDate: string): Observable<StoreDailyReport> {
    const params = new HttpParams().set('branchId', branchId).set('businessDate', businessDate);
    return this.http.get<ApiEnvelope<StoreDailyReport>>(`${this.dailyReportApi}/by-date`, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  searchDailyReports(branchId?: string, startDate?: string, endDate?: string, page = 0, size = 20): Observable<PageEnvelope<StoreDailyReport>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (branchId) params = params.set('branchId', branchId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ApiEnvelope<PageEnvelope<StoreDailyReport>>>(this.dailyReportApi, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  updateDailyReport(id: string, payload: UpdateDailyReportPayload): Observable<StoreDailyReport> {
    return this.http.put<ApiEnvelope<StoreDailyReport>>(`${this.dailyReportApi}/${id}`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  approveDailyReport(id: string, note?: string): Observable<StoreDailyReport> {
    return this.http
      .put<ApiEnvelope<StoreDailyReport>>(`${this.dailyReportApi}/${id}/approve`, note ? { note } : {})
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => this.errorMessage(err))),
      );
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. TỒN MỞ BÁN POS (POS DAILY STOCK)
  // ════════════════════════════════════════════════════════════════════

  restock(payload: RestockDailyStockPayload): Observable<PosDailyStock> {
    return this.http.post<ApiEnvelope<PosDailyStock>>(`${this.posStockApi}/restock`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => this.errorMessage(err))),
    );
  }

  private errorMessage(err: unknown): ShiftServiceError {
    const e = err as {
      status?: number;
      error?: {
        message?: string;
        errorCode?: string;
        data?: Record<string, string> | string;
      };
      message?: string;
    };

    let message = e?.error?.message || e?.message || 'Đã xảy ra lỗi hệ thống khi thao tác.';
    let fieldErrors: Record<string, string> | undefined;

    if (e?.error?.data) {
      if (typeof e.error.data === 'object' && e.error.data !== null) {
        fieldErrors = e.error.data;
        const details = Object.values(e.error.data).filter(Boolean).join(', ');
        if (details) {
          message = details;
        }
      } else if (typeof e.error.data === 'string' && e.error.data.trim()) {
        message = e.error.data;
      }
    }

    const customError = new Error(message) as ShiftServiceError;
    if (fieldErrors) {
      customError.fieldErrors = fieldErrors;
    }
    customError.errorCode = e?.error?.errorCode;
    customError.status = e?.status;
    return customError;
  }
}
