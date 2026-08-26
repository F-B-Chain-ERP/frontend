import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ApplicationConfigService } from '../../../../core/config/application-config.service';
import {
  FunctionPermission,
  PageResponseBE,
  PermissionApiResponse,
  Role,
  RoleAssignedUser,
  RoleFilter,
  RoleFormDTO,
  RoleMemberResponseBE,
  RoleResponseBE,
  RoleStatsKPI,
  UpdatePermissionPayload,
} from '../models/role.model';

interface PermissionCatalogItem {
  id: string;
  code: string;
  name: string;
  module: string;
}

interface FunctionMeta {
  viewCode?: string;
  createCode?: string;
  updateCode?: string;
  deleteCode?: string;
}

const MODULE_LABELS: Record<string, string> = {
  SYS: 'Hệ thống', sys: 'Hệ thống',
  ACC: 'Tài khoản', acc: 'Tài khoản',
  PROC: 'Mua hàng', proc: 'Mua hàng',
  INV: 'Kho vận', inv: 'Kho vận',
  STORE: 'Cửa hàng', store: 'Cửa hàng',
  POS: 'Bán hàng', pos: 'Bán hàng',
  FIN: 'Tài chính', fin: 'Tài chính',
  PLATFORM: 'Nền tảng', platform: 'Nền tảng',
  CUSTOMER: 'Khách hàng', customer: 'Khách hàng',
  MENU: 'Thực đơn', menu: 'Thực đơn',
};

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);
  private applicationConfigService = inject(ApplicationConfigService);

  private get roleApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/roles');
  }

  private toRole(r: RoleResponseBE): Role {
    const active = r.status === 'ACTIVE';
    const deleted = r.status === 'DELETED';
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description ?? '',
      active,
      deleted,
      isDefault: r.roleType === 'SYSTEM',
      accountCount: 0,
      createdAt: '',
      createdBy: undefined,
      updatedAt: undefined,
    };
  }

  private fetchAllRoles(): Observable<Role[]> {
    return this.http
      .get<{ data: PageResponseBE<RoleResponseBE> }>(this.roleApi, {
        params: new HttpParams().set('page', '0').set('size', '1000'),
      })
      .pipe(
        map((res) => res.data?.content ?? []),
        map((list) => list.map((r) => this.toRole(r)))
      );
  }



  // ── ROLE SERVICE METHODS ─────────────────────────────────────────────

  getKPIStats(): Observable<RoleStatsKPI> {
    return this.fetchAllRoles().pipe(
      map((roles) => {
        const total = roles.length;
        const active = roles.filter((r) => r.active && !r.deleted).length;
        const inactive = roles.filter((r) => !r.active && !r.deleted).length;
        const system = roles.filter((r) => r.isDefault).length;
        return { total, active, inactive, system };
      })
    );
  }

  getRoles(filter?: RoleFilter): Observable<{ items: Role[]; total: number }> {
    let params = new HttpParams()
      .set('page', String((filter?.pageIndex ?? 1) - 1))
      .set('size', String(filter?.pageSize ?? 10));
    if (filter?.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    return this.http
      .get<{ data: PageResponseBE<RoleResponseBE> }>(this.roleApi, { params })
      .pipe(
        map((res) => ({
          items: (res.data?.content ?? []).map((r) => this.toRole(r)),
          total: res.data?.totalElements ?? 0,
        }))
      );
  }

  getRoleById(id: string): Observable<Role | undefined> {
    return this.http
      .get<{ data: RoleResponseBE }>(`${this.roleApi}/${id}`)
      .pipe(
        map((res) => (res.data ? this.toRole(res.data) : undefined)),
        catchError(() => of(undefined))
      );
  }

  saveRole(dto: RoleFormDTO): Observable<Role> {
    const body = {
      name: dto.name,
      description: dto.description || null,
      roleType: 'TENANT',
      status: dto.active ? 'ACTIVE' : 'INACTIVE',
    };
    if (dto.id) {
      return this.http
        .put<{ data: RoleResponseBE }>(`${this.roleApi}/${dto.id}`, body)
        .pipe(map((res) => this.toRole(res.data)));
    }
    return this.http
      .post<{ data: RoleResponseBE }>(this.roleApi, body)
      .pipe(map((res) => this.toRole(res.data)));
  }

  cloneRole(sourceRoleId: string, newName: string, newDescription?: string): Observable<Role> {
    const body = {
      name: newName,
      description: newDescription || `Nhân bản từ role ${sourceRoleId}`,
      roleType: 'TENANT',
      status: 'ACTIVE',
    };
    return this.http
      .post<{ data: RoleResponseBE }>(this.roleApi, body)
      .pipe(map((res) => this.toRole(res.data)));
  }

  toggleStatus(id: string, active: boolean): Observable<boolean> {
    return this.getRoleById(id).pipe(
      switchMap((role) => {
        if (!role) return of(false);
        const body = {
          name: role.name,
          description: role.description || null,
          roleType: role.isDefault ? 'SYSTEM' : 'TENANT',
          status: active ? 'ACTIVE' : 'INACTIVE',
        };
        return this.http
          .put<{ data: RoleResponseBE }>(`${this.roleApi}/${id}`, body)
          .pipe(map(() => true));
      }),
      catchError(() => of(false))
    );
  }

  deleteRole(id: string): Observable<boolean> {
    return this.http
      .delete<{ data: null }>(`${this.roleApi}/${id}`)
      .pipe(map(() => true), catchError(() => of(false)));
  }

  restoreRole(id: string): Observable<boolean> {
    return this.getRoleById(id).pipe(
      switchMap((role) => {
        if (!role) return of(false);
        const body = {
          name: role.name,
          description: role.description || null,
          roleType: role.isDefault ? 'SYSTEM' : 'TENANT',
          status: 'ACTIVE',
        };
        return this.http
          .put<{ data: RoleResponseBE }>(`${this.roleApi}/${id}`, body)
          .pipe(map(() => true));
      }),
      catchError(() => of(false))
    );
  }

  batchUpdateStatus(ids: string[], active: boolean): Observable<number> {
    return forkJoin(ids.map((id) => this.toggleStatus(id, active))).pipe(
      map((results) => results.filter(Boolean).length)
    );
  }

  batchDelete(ids: string[]): Observable<number> {
    return forkJoin(ids.map((id) => this.deleteRole(id))).pipe(
      map((results) => results.filter(Boolean).length)
    );
  }

  // ── 5. PERMISSION MANAGEMENT (REAL API) ──────────────────────────────
  /** Map FunctionsId (tạo tự động) -> meta quyền thật để save ngược lại BE. */
  private functionMeta = new Map<number, FunctionMeta>();

  private get permApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/permissions');
  }

  /**
   * Lấy cây chức năng của một vai trò từ BE:
   * - Catalog quyền (toàn bộ) -> xây dựng cây module -> chức năng.
   * - Quyền đã gán của role -> đánh dấu Flag/Adds/Edit/Del.
   * roleId được truyền qua tham số thứ 2 (tương thích ngược với component).
   */
  getFunctionPermissions(_applicationId?: number, roleId?: string | number): Observable<PermissionApiResponse<FunctionPermission[]>> {
    const role = roleId != null ? String(roleId) : '';
    if (!role) {
      return of({ Data: [], Message: 'Thiếu roleId', Success: false, Pager: null, Id: null });
    }
    return forkJoin({
      catalog: this.fetchAllPermissions(),
      assigned: this.http
        .get<{ data: string[] }>(`${this.roleApi}/${role}/permissions`)
        .pipe(map(r => r.data ?? [])),
    }).pipe(
      map(({ catalog, assigned }) => this.buildFunctionTree(catalog, new Set(assigned))),
      map(tree => ({ Data: tree, Message: null, Success: true, Pager: null, Id: null })),
      catchError(() => of({ Data: [], Message: 'Lỗi tải quyền', Success: false, Pager: null, Id: null })),
    );
  }

  /** Lấy toàn bộ permission từ BE, gộp theo module (mỗi module < 100 bản ghi). */
  private fetchAllPermissions(): Observable<PermissionCatalogItem[]> {
    return this.http
      .get<{ data: string[] }>(`${this.permApi}/modules`)
      .pipe(
        switchMap(mods => {
          const modules = mods.data ?? [];
          if (!modules.length) return of([]);
          return forkJoin(
            modules.map(m =>
              this.http
                .get<{ data: PageResponseBE<PermissionCatalogItem> }>(
                  `${this.permApi}?module=${encodeURIComponent(m)}&size=100`,
                )
                .pipe(map(r => r.data?.content ?? [])),
            ),
          ).pipe(map(lists => lists.flat()));
        }),
      );
  }

  /** Xây dựng cây FunctionPermission từ danh mục quyền + tập đã gán. */
  private buildFunctionTree(catalog: PermissionCatalogItem[], assigned: Set<string>): FunctionPermission[] {
    this.functionMeta.clear();
    const byModule = new Map<string, PermissionCatalogItem[]>();
    for (const p of catalog) {
      const arr = byModule.get(p.module) ?? [];
      arr.push(p);
      byModule.set(p.module, arr);
    }
    const result: FunctionPermission[] = [];
    let moduleId = 1;
    let funcId = 1000;
    for (const mod of Array.from(byModule.keys()).sort()) {
      const items = byModule.get(mod)!;
      const mid = moduleId++;
      const children: FunctionPermission[] = [];
      const byResource = new Map<string, PermissionCatalogItem[]>();
      for (const p of items) {
        const resource = p.code.split(':')[1] ?? p.code;
        const arr = byResource.get(resource) ?? [];
        arr.push(p);
        byResource.set(resource, arr);
      }
      for (const [resource, resItems] of byResource) {
        const fid = funcId++;
        const meta: FunctionMeta = {};
        let label = '';
        for (const it of resItems) {
          const action = (it.code.split(':')[2] ?? '').toLowerCase();
          if (action === 'view') { meta.viewCode = it.code; label = it.name; }
          else if (action === 'create') meta.createCode = it.code;
          else if (action === 'update') meta.updateCode = it.code;
          else if (action === 'delete') meta.deleteCode = it.code;
        }
        const has = (code?: string) => !!code && assigned.has(code);
        children.push({
          FunctionsId: fid, ApplicationId: 17, ParentId: mid, FunctionsName: label || resource,
          Path: '', FunctionUrl: '', Icon: 'folder',
          Flag: has(meta.viewCode) ? 1 : 0, OrderId: 0, OnMenu: 0, IsSystem: 0, Help: null,
          Adds: has(meta.createCode) ? 1 : 0, Del: has(meta.deleteCode) ? 1 : 0,
          Edit: has(meta.updateCode) ? 1 : 0, Res: has(meta.viewCode) ? 1 : 0, Level: 2, ListFunc: null,
          CanView: !!meta.viewCode, CanAdd: !!meta.createCode, CanEdit: !!meta.updateCode, CanDelete: !!meta.deleteCode,
        });
        this.functionMeta.set(fid, meta);
      }
      const anyFlag = (pred: (n: FunctionPermission) => boolean) => (children.some(pred) ? 1 : 0);
      result.push({
        FunctionsId: mid, ApplicationId: 17, ParentId: 0, FunctionsName: MODULE_LABELS[mod] ?? mod,
        Path: '', FunctionUrl: '', Icon: 'appstore',
        Flag: anyFlag(n => n.Flag === 1), OrderId: 0, OnMenu: 0, IsSystem: 0, Help: null,
        Adds: anyFlag(n => n.Adds === 1), Del: anyFlag(n => n.Del === 1),
        Edit: anyFlag(n => n.Edit === 1), Res: anyFlag(n => n.Flag === 1), Level: 1, ListFunc: null,
        CanView: children.some(n => n.CanView), CanAdd: children.some(n => n.CanAdd),
        CanEdit: children.some(n => n.CanEdit), CanDelete: children.some(n => n.CanDelete),
      });
      result.push(...children);
    }
    return result;
  }

  /**
   * Lưu phân quyền: chuyển cờ (Flag/Adds/Edit/Del) của từng chức năng thành
   * danh sách permission code thật (ví dụ: sys:role:view), gửi PUT /roles/{id}/permissions
   * (thay thế toàn bộ).
   */
  updateFunctionPermissions(_donViSuDungId?: number, roleId?: string | number, permissions?: UpdatePermissionPayload[]): Observable<any> {
    const role = roleId != null ? String(roleId) : '';
    const payload = permissions ?? [];
    // Guard: functionMeta chỉ được build sau khi GET cây quyền thành công.
    // Nếu rỗng mà vẫn gửi, BE sẽ nhận mảng rỗng và xoá SẠCH quyền của role.
    // Trường hợp này (reload trang / navigate thẳng đến save) phải chặn để tránh mất dữ liệu.
    if (this.functionMeta.size === 0) {
      return throwError(
        () => new Error('Chưa tải được danh mục quyền. Vui lòng mở lại trang phân quyền và thử lại.'),
      );
    }
    const selected: string[] = [];
    for (const p of payload) {
      const meta = this.functionMeta.get(p.FunctionsId);
      if (!meta) continue;
      if (p.Flag === 1 && meta.viewCode) selected.push(meta.viewCode);
      if (p.Adds === 1 && meta.createCode) selected.push(meta.createCode);
      if (p.Edit === 1 && meta.updateCode) selected.push(meta.updateCode);
      if (p.Del === 1 && meta.deleteCode) selected.push(meta.deleteCode);
    }
    const unique = Array.from(new Set(selected));
    return this.http.put<void>(`${this.roleApi}/${role}/permissions`, unique);
  }

  getAssignedUsers(roleId: string): Observable<RoleAssignedUser[]> {
    return this.http
      .get<{ data: RoleMemberResponseBE[] }>(`${this.roleApi}/${roleId}/users`)
      .pipe(
        map((res) => (res.data ?? []).map((u) => this.toAssignedUser(u))),
        catchError(() => of([]))
      );
  }

  private toAssignedUser(u: RoleMemberResponseBE): RoleAssignedUser {
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName ?? u.username,
      email: u.email ?? '',
      department: u.department ?? undefined,
      assignedAt: u.assignedAt ?? undefined,
    };
  }
}
