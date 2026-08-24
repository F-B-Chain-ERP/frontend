import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Supplier, SupplierFilter, SupplierFormDTO, SupplierListResponse, SupplierStatus } from './supplier.model';

/**
 * TODO(S2-10): Hiện dùng mock data in-memory theo chuẩn màn mẫu users.
 * Khi backend có API, thay thân các method bằng HttpClient gọi /api/v1/...
 */
@Injectable({
  providedIn: 'root',
})
export class SupplierService {
  private mockSuppliers: Supplier[] = [
    {
      id: 'SUP001',
      code: 'NCC-001',
      name: 'Công ty TNHH Nguyên liệu Phúc An',
      phoneNumber: '0241234567',
      email: 'kinhdoanh@phucan.vn',
      address: 'Số 12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
      taxCode: '0101234567',
      contactPerson: 'Nguyễn Văn Phúc',
      status: SupplierStatus.ACTIVE,
      note: 'NCC cà phê nhân chính',
      createdAt: '2026-01-10 08:30:00',
      updatedAt: '2026-02-15 10:20:00',
    },
    {
      id: 'SUP002',
      code: 'NCC-002',
      name: 'Nhà phân phối Sữa Sao Băng',
      phoneNumber: '0283888999',
      email: 'info@saobang.com',
      address: '55 Trần Hưng Đạo, Quận 1, TP.HCM',
      taxCode: '0309876543',
      contactPerson: 'Trần Thị Mai',
      status: SupplierStatus.ACTIVE,
      createdAt: '2026-01-18 09:00:00',
    },
    {
      id: 'SUP003',
      code: 'NCC-003',
      name: 'Hợp tác xã Trà Thái Nguyên',
      phoneNumber: '02083556677',
      email: 'tratha@thainguyen.vn',
      address: 'Khu phố Quyết Thắng, TP. Thái Nguyên',
      contactPerson: 'Lê Văn Chín',
      status: SupplierStatus.INACTIVE,
      note: 'Tạm ngừng do hết vụ thu hoạch',
      createdAt: '2026-02-01 14:15:00',
    },
  ];

  getSuppliers(filter: SupplierFilter): Observable<SupplierListResponse> {
    let result = [...this.mockSuppliers];

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        s =>
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.phoneNumber?.includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q),
      );
    }

    if (filter.status !== null && filter.status !== undefined) {
      const statusFilter = filter.status;
      result = result.filter(s => s.status === statusFilter);
    }

    if (filter.sortField) {
      const key = filter.sortField as keyof Supplier;
      const isAsc = filter.sortOrder === 'ascend';
      result.sort((a, b) => {
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const total = result.length;
    const pageIndex = filter.pageIndex && filter.pageIndex > 0 ? filter.pageIndex : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 10;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = result.slice(startIndex, startIndex + pageSize);

    return of({ items, total, pageIndex, pageSize }).pipe(delay(200));
  }

  getSupplierById(id: string | number): Observable<Supplier | null> {
    const supplier = this.mockSuppliers.find(s => String(s.id) === String(id));
    return of(supplier ? { ...supplier } : null).pipe(delay(150));
  }

  createSupplier(dto: SupplierFormDTO): Observable<Supplier> {
    const now = this.formatDate(new Date());
    const newId = `SUP${String(this.mockSuppliers.length + 1).padStart(3, '0')}`;

    const newSupplier: Supplier = {
      id: newId,
      code: (dto.code || '').trim(),
      name: (dto.name || '').trim(),
      phoneNumber: (dto.phoneNumber || '').trim(),
      email: (dto.email || '').trim().toLowerCase(),
      address: (dto.address || '').trim(),
      taxCode: (dto.taxCode || '').trim(),
      contactPerson: (dto.contactPerson || '').trim(),
      status: dto.status,
      note: (dto.note || '').trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.mockSuppliers.unshift(newSupplier);
    return of(newSupplier).pipe(delay(300));
  }

  updateSupplier(id: string | number, dto: Partial<SupplierFormDTO>): Observable<Supplier> {
    const index = this.mockSuppliers.findIndex(s => String(s.id) === String(id));
    if (index === -1) {
      return throwError(() => new Error('Nhà cung cấp không tồn tại'));
    }

    const current = this.mockSuppliers[index];
    const updatedSupplier: Supplier = {
      ...current,
      code: dto.code !== undefined ? dto.code.trim() : current.code,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : current.phoneNumber,
      email: dto.email !== undefined ? dto.email.trim().toLowerCase() : current.email,
      address: dto.address !== undefined ? dto.address.trim() : current.address,
      taxCode: dto.taxCode !== undefined ? dto.taxCode.trim() : current.taxCode,
      contactPerson: dto.contactPerson !== undefined ? dto.contactPerson.trim() : current.contactPerson,
      status: dto.status !== undefined ? dto.status : current.status,
      note: dto.note !== undefined ? dto.note.trim() : current.note,
      updatedAt: this.formatDate(new Date()),
    };

    this.mockSuppliers[index] = updatedSupplier;
    return of(updatedSupplier).pipe(delay(300));
  }

  toggleStatus(id: string | number): Observable<Supplier> {
    const supplier = this.mockSuppliers.find(s => String(s.id) === String(id));
    if (!supplier) {
      return throwError(() => new Error('Nhà cung cấp không tồn tại'));
    }
    const newStatus = supplier.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE;
    return this.updateSupplier(id, { status: newStatus });
  }

  deleteSupplier(id: string | number): Observable<boolean> {
    const initialLen = this.mockSuppliers.length;
    this.mockSuppliers = this.mockSuppliers.filter(s => String(s.id) !== String(id));
    return of(this.mockSuppliers.length < initialLen).pipe(delay(250));
  }

  private formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
  }
}
