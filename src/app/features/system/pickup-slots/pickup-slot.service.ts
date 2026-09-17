import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, catchError, map, throwError} from 'rxjs';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
import {ApiResponse} from '../../login/login.model';
import {
  CreatePickupTimeSlotPayload,
  GeneratePickupSlotsPayload,
  PickupTimeSlot,
  UpdatePickupTimeSlotPayload,
} from './pickup-slot.model';

@Injectable({
  providedIn: 'root',
})
export class PickupSlotService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private getSlotApi(branchId: string): string {
    return this.applicationConfigService.getEndpointFor(`api/v1/branches/${branchId}/pickup-slots`);
  }

  private getPublicSlotApi(branchId: string): string {
    return this.applicationConfigService.getEndpointFor(`api/v1/public/branches/${branchId}/pickup-slots`);
  }

  /**
   * Lấy danh sách khung giờ pickup của chi nhánh theo ngày (dành cho quản trị nội bộ).
   */
  getSlots(branchId: string, date?: string | null): Observable<PickupTimeSlot[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<ApiResponse<PickupTimeSlot[]>>(this.getSlotApi(branchId), {params}).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Lấy danh sách khung giờ pickup khả dụng của chi nhánh (Public - Dành cho Storefront Checkout).
   */
  getPublicSlots(branchId: string, date?: string | null): Observable<PickupTimeSlot[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<ApiResponse<PickupTimeSlot[]>>(this.getPublicSlotApi(branchId), {params}).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Tạo mới một khung giờ pickup lẻ.
   */
  createSlot(branchId: string, payload: CreatePickupTimeSlotPayload): Observable<PickupTimeSlot> {
    return this.http.post<ApiResponse<PickupTimeSlot>>(this.getSlotApi(branchId), payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Cập nhật thông tin một khung giờ pickup.
   */
  updateSlot(branchId: string, id: string, payload: UpdatePickupTimeSlotPayload): Observable<PickupTimeSlot> {
    return this.http.put<ApiResponse<PickupTimeSlot>>(`${this.getSlotApi(branchId)}/${id}`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Xóa một khung giờ pickup (nếu đã có đơn thì BE an toàn chuyển INACTIVE).
   */
  deleteSlot(branchId: string, id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.getSlotApi(branchId)}/${id}`).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Tự động sinh hàng loạt khung giờ pickup theo bước nhảy thời gian.
   */
  generateSlots(branchId: string, payload: GeneratePickupSlotsPayload): Observable<PickupTimeSlot[]> {
    return this.http.post<ApiResponse<PickupTimeSlot[]>>(`${this.getSlotApi(branchId)}/generate`, payload).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Giữ message lỗi nghiệp vụ từ backend sạch sẽ.
   */
  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || 'Đã xảy ra lỗi không xác định.';
  }
}
