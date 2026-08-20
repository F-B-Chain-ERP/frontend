import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  User,
  UserFilter,
  UserFormDTO,
  UserListResponse,
  UserStatus,
} from '../models/user.model';
import { ApplicationConfigService } from '../../../../core/config/application-config.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(ApplicationConfigService);

  // In-memory data store for rich instant responsiveness & demo
  private mockUsers: User[] = [
    {
      id: 'USR001',
      username: 'admin',
      fullName: 'Nguyễn Văn Quản Trị',
      email: 'admin@utt.edu.vn',
      phoneNumber: '0988123456',
      status: UserStatus.ACTIVE,
      roles: ['Quản trị hệ thống', 'Kế toán trưởng'],
      department: 'Phòng Công nghệ Thông tin',
      createdAt: '2025-01-15 08:30:00',
      updatedAt: '2026-02-10 14:20:00',
      note: 'Tài khoản quản trị viên tối cao',
    },
    {
      id: 'USR002',
      username: 'leha.kt',
      fullName: 'Lê Thu Hà',
      email: 'leha.kt@utt.edu.vn',
      phoneNumber: '0912345678',
      status: UserStatus.ACTIVE,
      roles: ['Kế toán viên', 'Thủ quỹ'],
      department: 'Phòng Tài chính - Kế toán',
      createdAt: '2025-03-01 09:15:00',
      updatedAt: '2026-01-18 10:00:00',
      note: 'Phụ trách thu chi ngân sách',
    },
    {
      id: 'USR003',
      username: 'tranminh.cntt',
      fullName: 'Trần Quang Minh',
      email: 'minhtq@utt.edu.vn',
      phoneNumber: '0978999888',
      status: UserStatus.ACTIVE,
      roles: ['Kỹ sư phần mềm'],
      department: 'Trung tâm CNTT & Truyền thông',
      createdAt: '2025-04-12 11:20:00',
      updatedAt: '2025-11-05 16:45:00',
    },
    {
      id: 'USR004',
      username: 'hoangyen.dt',
      fullName: 'Hoàng Hải Yến',
      email: 'yenhh@utt.edu.vn',
      phoneNumber: '0933221100',
      status: UserStatus.INACTIVE,
      roles: ['Chuyên viên đào tạo'],
      department: 'Phòng Đào tạo',
      createdAt: '2025-05-20 14:00:00',
      updatedAt: '2026-02-01 09:30:00',
      note: 'Đang tạm nghỉ công tác',
    },
    {
      id: 'USR005',
      username: 'phamduong.tc',
      fullName: 'Phạm Thái Dương',
      email: 'duongpt@utt.edu.vn',
      phoneNumber: '0909112233',
      status: UserStatus.ACTIVE,
      roles: ['Chuyên viên tài vụ'],
      department: 'Phòng Tài chính - Kế toán',
      createdAt: '2025-06-10 10:45:00',
    },
    {
      id: 'USR006',
      username: 'vuthimai',
      fullName: 'Vũ Thị Thanh Mai',
      email: 'maivtt@utt.edu.vn',
      phoneNumber: '0944556677',
      status: UserStatus.ACTIVE,
      roles: ['Kế toán viên'],
      department: 'Phòng Kế hoạch - Đầu tư',
      createdAt: '2025-07-08 08:00:00',
      updatedAt: '2026-01-20 15:10:00',
    },
    {
      id: 'USR007',
      username: 'dangtuan.cb',
      fullName: 'Đặng Tuấn Anh',
      email: 'anhdt@utt.edu.vn',
      phoneNumber: '0966778899',
      status: UserStatus.INACTIVE,
      roles: ['Chuyên viên'],
      department: 'Phòng Tổ chức Cán bộ',
      createdAt: '2025-08-14 13:30:00',
      note: 'Tài khoản đã bàn giao công tác',
    },
    {
      id: 'USR008',
      username: 'buitrong.xd',
      fullName: 'Bùi Trọng Hiếu',
      email: 'hieubt@utt.edu.vn',
      phoneNumber: '0987112244',
      status: UserStatus.ACTIVE,
      roles: ['Quản lý dự án XDCB'],
      department: 'Ban Quản lý Dự án',
      createdAt: '2025-09-02 16:00:00',
    },
    {
      id: 'USR009',
      username: 'nguyenhuong',
      fullName: 'Nguyễn Lan Hương',
      email: 'huongnl@utt.edu.vn',
      phoneNumber: '0918273645',
      status: UserStatus.ACTIVE,
      roles: ['Thủ kho', 'Thủ quỹ'],
      department: 'Phòng Quản trị Thiết bị',
      createdAt: '2025-10-11 09:20:00',
    },
    {
      id: 'USR010',
      username: 'domanhhung',
      fullName: 'Đỗ Mạnh Hùng',
      email: 'hungdm@utt.edu.vn',
      phoneNumber: '0922334455',
      status: UserStatus.ACTIVE,
      roles: ['Giảng viên', 'Quản lý khoa'],
      department: 'Khoa Công nghệ Thông tin',
      createdAt: '2025-11-25 15:40:00',
    },
    {
      id: 'USR011',
      username: 'nguyenthuy.kt',
      fullName: 'Nguyễn Bích Thủy',
      email: 'thuy.nb@utt.edu.vn',
      phoneNumber: '0938475612',
      status: UserStatus.ACTIVE,
      roles: ['Kế toán thanh toán'],
      department: 'Phòng Tài chính - Kế toán',
      createdAt: '2025-12-05 10:15:00',
    },
    {
      id: 'USR012',
      username: 'hoangviet.vp',
      fullName: 'Hoàng Quốc Việt',
      email: 'viethq@utt.edu.vn',
      phoneNumber: '0977665544',
      status: UserStatus.INACTIVE,
      roles: ['Chuyên viên văn phòng'],
      department: 'Văn phòng Trường',
      createdAt: '2026-01-08 14:50:00',
    },
  ];

  /**
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc
   */
  getUsers(filter: UserFilter): Observable<UserListResponse> {
    let result = [...this.mockUsers];

    // Lọc theo từ khóa tìm kiếm (họ tên, email, tên đăng nhập, sđt)
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        u =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.phoneNumber && u.phoneNumber.includes(q)) ||
          (u.department && u.department.toLowerCase().includes(q)),
      );
    }

    // Lọc theo trạng thái
    if (filter.status !== null && filter.status !== undefined) {
      result = result.filter(u => u.status === Number(filter.status));
    }

    // Sắp xếp
    if (filter.sortField) {
      const key = filter.sortField as keyof User;
      const isAsc = filter.sortOrder === 'ascend';
      result.sort((a, b) => {
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      // Mặc định sắp xếp theo ngày tạo mới nhất
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const total = result.length;
    const startIndex = (filter.pageIndex - 1) * filter.pageSize;
    const items = result.slice(startIndex, startIndex + filter.pageSize);

    return of({
      items,
      total,
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
    }).pipe(delay(200));
  }

  /**
   * Lấy chi tiết người dùng theo ID
   */
  getUserById(id: string | number): Observable<User | null> {
    const user = this.mockUsers.find(u => String(u.id) === String(id));
    return of(user ? { ...user } : null).pipe(delay(150));
  }

  /**
   * Thêm mới người dùng
   */
  createUser(dto: UserFormDTO): Observable<User> {
    const now = new Date();
    const formattedDate = this.formatDate(now);
    const newId = `USR${String(this.mockUsers.length + 1).padStart(3, '0')}`;

    const newUser: User = {
      id: newId,
      username: dto.username.trim(),
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phoneNumber: dto.phoneNumber?.trim() || '',
      status: Number(dto.status) as UserStatus,
      department: dto.department?.trim() || 'Phòng ban chung',
      roles: dto.roles?.length ? dto.roles : ['Người dùng hệ thống'],
      note: dto.note?.trim() || '',
      createdAt: formattedDate,
      updatedAt: formattedDate,
    };

    this.mockUsers.unshift(newUser);
    return of(newUser).pipe(delay(300));
  }

  /**
   * Cập nhật thông tin người dùng
   */
  updateUser(id: string | number, dto: Partial<UserFormDTO>): Observable<User> {
    const index = this.mockUsers.findIndex(u => String(u.id) === String(id));
    if (index === -1) {
      throw new Error('Người dùng không tồn tại');
    }

    const now = new Date();
    const formattedDate = this.formatDate(now);
    const current = this.mockUsers[index];

    const updatedUser: User = {
      ...current,
      fullName: dto.fullName !== undefined ? dto.fullName.trim() : current.fullName,
      email: dto.email !== undefined ? dto.email.trim().toLowerCase() : current.email,
      username: dto.username !== undefined ? dto.username.trim() : current.username,
      phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : current.phoneNumber,
      status: dto.status !== undefined ? (Number(dto.status) as UserStatus) : current.status,
      department: dto.department !== undefined ? dto.department.trim() : current.department,
      roles: dto.roles !== undefined ? dto.roles : current.roles,
      note: dto.note !== undefined ? dto.note.trim() : current.note,
      updatedAt: formattedDate,
    };

    this.mockUsers[index] = updatedUser;
    return of(updatedUser).pipe(delay(300));
  }

  /**
   * Đổi trạng thái hoạt động người dùng
   */
  toggleStatus(id: string | number): Observable<User> {
    const user = this.mockUsers.find(u => String(u.id) === String(id));
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }
    const newStatus = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    return this.updateUser(id, { status: newStatus });
  }

  /**
   * Xóa người dùng theo ID
   */
  deleteUser(id: string | number): Observable<boolean> {
    const initialLen = this.mockUsers.length;
    this.mockUsers = this.mockUsers.filter(u => String(u.id) !== String(id));
    const success = this.mockUsers.length < initialLen;
    return of(success).pipe(delay(250));
  }

  /**
   * Xóa nhiều người dùng cùng lúc (Xóa hàng loạt)
   */
  deleteBatch(ids: (string | number)[]): Observable<boolean> {
    const idSet = new Set(ids.map(String));
    this.mockUsers = this.mockUsers.filter(u => !idSet.has(String(u.id)));
    return of(true).pipe(delay(300));
  }

  /**
   * Đổi trạng thái hàng loạt
   */
  changeBatchStatus(ids: (string | number)[], status: UserStatus): Observable<boolean> {
    const idSet = new Set(ids.map(String));
    const now = new Date();
    const formattedDate = this.formatDate(now);

    this.mockUsers = this.mockUsers.map(u => {
      if (idSet.has(String(u.id))) {
        return {
          ...u,
          status,
          updatedAt: formattedDate,
        };
      }
      return u;
    });

    return of(true).pipe(delay(300));
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
  }
}
