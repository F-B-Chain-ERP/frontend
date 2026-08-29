import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { takeUntil } from 'rxjs';

import { AppBreadcrumbsComponent } from '../../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../../shared/app-button/app-button.component';
import { BaseComponent } from '../../../../shared/base-component/base.component';
import { HasSomeAuthorityDirective } from '../../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../../core/config/functions.constants';
import { LayoutService } from '../../../../layouts/service/layout.service';
import { RoleService } from '../services/role.service';
import {
  FunctionPermission,
  ModulePermissionStats,
  PermissionTreeNode,
  PermissionViewMode,
  PermField,
  Role,
  UpdatePermissionPayload,
} from '../models/role.model';

const APP_ID = 17;
const UPDATE_APP_ID = 26;

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './role-permission.component.html',
  styleUrls: ['./role-permission.component.scss'],
  animations: [
    trigger('rowSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)', height: '0px', overflow: 'hidden' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)', height: '*' })),
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0)', height: '*', overflow: 'hidden' }),
        animate('340ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(-6px)', height: '0px' })),
      ]),
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ gridTemplateRows: '0fr', opacity: '0', overflow: 'hidden' })),
      state('expanded', style({ gridTemplateRows: '1fr', opacity: '1', overflow: 'hidden' })),
      transition('collapsed => expanded', animate('400ms cubic-bezier(0.16, 1, 0.3, 1)')),
      transition('expanded => collapsed', animate('340ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
    trigger('rotateIcon', [
      state('collapsed', style({ transform: 'rotate(-90deg)' })),
      state('expanded', style({ transform: 'rotate(0deg)' })),
      transition('collapsed <=> expanded', animate('280ms cubic-bezier(0.16, 1, 0.3, 1)')),
    ]),
  ],
})
export class RolePermissionComponent extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly layoutService = inject(LayoutService);
  private readonly roleService = inject(RoleService);

  readonly ROLE = ROLE;
  protected readonly sidebarCollapsed = this.layoutService.sidebarCollapsed;

  role: Partial<Role> = {};
  groupId: string | number = '';
  isAdminRole = false;
  loading = signal(false);
  saving = signal(false);
  isDirty = signal(false);

  viewMode: PermissionViewMode = 'matrix';
  searchKeyword = '';
  selectedModuleFilter = 'all';
  permissionStatusFilter: 'all' | 'granted' | 'ungranted' = 'all';

  moduleOptions: { value: string; label: string }[] = [{ value: 'all', label: 'Tất cả phân hệ' }];

  originalPermissions: FunctionPermission[] = [];
  listOfMapData: PermissionTreeNode[] = [];
  mapOfExpandedData: Record<string, PermissionTreeNode[]> = {};

  moduleStats: ModulePermissionStats[] = [];
  totalRights = 0;
  activeRights = 0;
  overallPercent = 0;

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/roles/list' },
      { label: 'Quản lý vai trò', url: '/admin/system/roles/list' },
      { label: 'Phân quyền vai trò', url: '/admin/system/roles/edit' },
    ]);

    const stateRole = history.state?.role as Role | undefined;
    if (stateRole) {
      this.role = stateRole;
      this.groupId = this.role.id ?? '';
      this.isAdminRole = this.role.code === 'ADMIN';
    } else {
      this.groupId = this.route.snapshot.queryParams['id'] ?? '';
      if (this.groupId) {
        this.roleService
          .getRoleById(String(this.groupId))
          .pipe(takeUntil(this.destroy$))
          .subscribe(r => {
            if (r) {
              this.role = r;
              this.isAdminRole = r.code === 'ADMIN';
            }
          });
      }
    }

    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loading.set(true);
    this.roleService
      .getFunctionPermissions(APP_ID, this.groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.Success && res.Data) {
            this.originalPermissions = res.Data;
            this.renderTree(this.originalPermissions);
            this.recalculateStats();
          }
          this.loading.set(false);
        },
        error: () => {
          this.toastService.error('Không thể tải cây chức năng phân quyền.');
          this.loading.set(false);
        },
      });
  }

  // ── Tree ──────────────────────────────────────────────────────────────
  private renderTree(permissions: FunctionPermission[]): void {
    this.listOfMapData = this.buildPermissionTree(permissions);
    this.mapOfExpandedData = {};
    this.listOfMapData.forEach(item => {
      this.mapOfExpandedData[item.key] = this.convertTreeToList(item);
    });
    this.recomputeTreeFlags();
    this.buildModuleOptions();
    this.cdr.detectChanges();
  }

  private buildModuleOptions(): void {
    this.moduleOptions = [
      { value: 'all', label: 'Tất cả phân hệ' },
      ...this.listOfMapData.map((r, i) => ({ value: r.key, label: `${i + 1}. ${r.name}` })),
    ];
  }

  private buildPermissionTree(permissions: FunctionPermission[]): PermissionTreeNode[] {
    const nodeMap = new Map<number, PermissionTreeNode>();
    const roots: PermissionTreeNode[] = [];

    permissions.forEach(p => {
      nodeMap.set(p.FunctionsId, {
        key: p.FunctionsId.toString(),
        name: p.FunctionsName,
        icon: p.Icon || 'folder',
        path: p.Path,
        access: p.Flag === 1,
        add: p.Adds === 1,
        edit: p.Edit === 1,
        delete: p.Del === 1,
        canView: p.CanView !== false,
        canAdd: p.CanAdd !== false,
        canEdit: p.CanEdit !== false,
        canDelete: p.CanDelete !== false,
        expand: true,
        children: [],
      });
    });

    permissions.forEach(p => {
      const node = nodeMap.get(p.FunctionsId)!;
      if (p.ParentId === -1 || p.ParentId === 0 || !nodeMap.has(p.ParentId)) {
        node.moduleKey = node.key;
        roots.push(node);
      } else {
        const parent = nodeMap.get(p.ParentId)!;
        parent.children ??= [];
        parent.children.push(node);
        node.parent = parent;
      }
    });

    return roots;
  }

  private convertTreeToList(root: PermissionTreeNode): PermissionTreeNode[] {
    const array: PermissionTreeNode[] = [];
    const walk = (node: PermissionTreeNode, level: number): void => {
      node.level = level;
      array.push(node);
      node.children?.forEach(child => walk(child, level + 1));
    };
    walk(root, 0);
    return array;
  }

  isNodeVisible(item: PermissionTreeNode): boolean {
    let curr = item.parent;
    while (curr) {
      if (!curr.expand) return false;
      curr = curr.parent;
    }
    return true;
  }

  collapse(array: PermissionTreeNode[], data: PermissionTreeNode, expand: boolean): void {
    data.expand = expand;
    if (!expand && data.children?.length) {
      data.children.forEach(child => {
        const target = array.find(a => a.key === child.key);
        if (target) {
          target.expand = false;
          this.collapse(array, target, false);
        }
      });
    }
    this.cdr.markForCheck();
  }

  expandAll(): void {
    this.listOfMapData.forEach(root => (root.expand = true));
    Object.values(this.mapOfExpandedData).forEach(list => list.forEach(n => (n.expand = true)));
    this.cdr.markForCheck();
  }

  collapseAll(): void {
    this.listOfMapData.forEach(root => (root.expand = false));
    Object.values(this.mapOfExpandedData).forEach(list => list.forEach(n => (n.expand = false)));
    this.cdr.markForCheck();
  }

  toggleModule(module: PermissionTreeNode): void {
    module.expand = !module.expand;
    const list = this.mapOfExpandedData[module.key];
    if (list) {
      list.forEach(n => {
        if (n.key === module.key) n.expand = !!module.expand;
      });
    }
    this.cdr.markForCheck();
  }

  // ── Search & Filter ─────────────────────────────────────────────────
  onSearch(): void {
    let filtered = [...this.originalPermissions];

    if (this.selectedModuleFilter !== 'all') {
      const targetId = Number(this.selectedModuleFilter);
      const ids = new Set<number>([targetId]);
      const collect = (pid: number): void => {
        this.originalPermissions.forEach(p => {
          if (p.ParentId === pid) {
            ids.add(p.FunctionsId);
            collect(p.FunctionsId);
          }
        });
      };
      collect(targetId);
      filtered = filtered.filter(p => ids.has(p.FunctionsId));
    }

    if (this.permissionStatusFilter === 'granted') {
      filtered = filtered.filter(p => p.Flag === 1 || p.Adds === 1 || p.Edit === 1 || p.Del === 1);
    } else if (this.permissionStatusFilter === 'ungranted') {
      filtered = filtered.filter(p => p.Flag === 0 && p.Adds === 0 && p.Edit === 0 && p.Del === 0);
    }

    const q = this.searchKeyword.trim().toLowerCase();
    if (q) {
      const matched = new Set<number>();
      filtered.forEach(p => {
        if (p.FunctionsName.toLowerCase().includes(q) || p.Path?.toLowerCase().includes(q)) {
          matched.add(p.FunctionsId);
          let pid = p.ParentId;
          while (pid !== -1 && pid !== 0) {
            matched.add(pid);
            const parent = this.originalPermissions.find(x => x.FunctionsId === pid);
            pid = parent ? parent.ParentId : 0;
            if (!parent) break;
          }
        }
      });
      filtered = filtered.filter(p => matched.has(p.FunctionsId));
    }

    this.renderTree(filtered);
  }

  // ── Permission cascade (single source of truth = originalPermissions) ─
  /** Quyền có tồn tại trên hệ thống với một FunctionPermission hay không. */
  private can(fp: FunctionPermission, field: PermField): boolean {
    if (field === 'access') return fp.CanView !== false;
    if (field === 'add') return fp.CanAdd !== false;
    if (field === 'edit') return fp.CanEdit !== false;
    return fp.CanDelete !== false;
  }

  /** Thu thập các FunctionPermission lá (thực sự mang quyền) của một node. */
  private collectLeaves(node: PermissionTreeNode): FunctionPermission[] {
    const out: FunctionPermission[] = [];
    const walk = (n: PermissionTreeNode): void => {
      if (n.children?.length) {
        n.children.forEach(walk);
      } else {
        const fp = this.originalPermissions.find(p => p.FunctionsId.toString() === n.key);
        if (fp) out.push(fp);
      }
    };
    walk(node);
    return out;
  }

  /** Áp dụng một trường cho tập hợp lá, tôn trọng can* và luật phụ thuộc.
   *  Đặc biệt: voucher_branch và role_permission chỉ có create/delete không có view
   *  nên không yêu cầu access để bật add/delete (đã đọc DB can*).
   *  Chỉ clear Adds/Edit/Del khi tắt access nếu resource thực sự có view.
   */
  private applyToLeaves(leaves: FunctionPermission[], field: PermField, value: boolean): void {
    for (const fp of leaves) {
      if (!this.can(fp, field)) continue;
      if (field === 'access') {
        fp.Flag = value ? 1 : 0;
        fp.Res = value ? 1 : 0;
        if (!value && fp.CanView !== false) fp.Adds = fp.Edit = fp.Del = 0;
      } else {
        if (field === 'add') fp.Adds = value ? 1 : 0;
        if (field === 'edit') fp.Edit = value ? 1 : 0;
        if (field === 'delete') fp.Del = value ? 1 : 0;
        if (value && this.can(fp, 'access')) {
          fp.Flag = 1;
          fp.Res = 1;
        }
      }
    }
  }

  onPermissionChange(field: PermField, node: PermissionTreeNode, _moduleKey: string, value: boolean): void {
    if (this.isAdminRole) return;
    this.isDirty.set(true);
    this.applyToLeaves(this.collectLeaves(node), field, value);
    this.recomputeTreeFlags();
    this.recalculateStats();
    this.cdr.markForCheck();
  }

  /** Tính lại checked/indeterminate của mọi node từ originalPermissions (duy nhất). */
  private recomputeTreeFlags(): void {
    const leafFlags = new Map<number, FunctionPermission>();
    this.originalPermissions.forEach(p => leafFlags.set(p.FunctionsId, p));
    const walk = (n: PermissionTreeNode): void => {
      if (!n.children?.length) {
        const fp = leafFlags.get(Number(n.key));
        if (fp) {
          n.access = fp.Flag === 1;
          n.add = fp.Adds === 1;
          n.edit = fp.Edit === 1;
          n.delete = fp.Del === 1;
        }
        n.accessIndeterminate = n.addIndeterminate = n.editIndeterminate = n.deleteIndeterminate = false;
        return;
      }
      n.children.forEach(walk);
      const total = n.children.length;
      const ac = n.children.filter(c => c.access).length;
      const ad = n.children.filter(c => c.add).length;
      const ed = n.children.filter(c => c.edit).length;
      const de = n.children.filter(c => c.delete).length;
      n.access = ac === total;
      n.accessIndeterminate = ac > 0 && ac < total;
      n.add = ad === total;
      n.addIndeterminate = ad > 0 && ad < total;
      n.edit = ed === total;
      n.editIndeterminate = ed > 0 && ed < total;
      n.delete = de === total;
      n.deleteIndeterminate = de > 0 && de < total;
    };
    this.listOfMapData.forEach(walk);
  }

  /** Các lá thuộc module có tên chứa từ khóa (dùng cho preset). */
  private moduleLeavesByKeyword(kw: string): FunctionPermission[] {
    const out: FunctionPermission[] = [];
    this.listOfMapData.forEach(root => {
      if (root.name.toLowerCase().includes(kw.toLowerCase())) {
        out.push(...this.collectLeaves(root));
      }
    });
    return out;
  }

  // ── Row / Column helpers ────────────────────────────────────────────
  moduleStat(id: string | number): { activeFunctions: number; totalFunctions: number } | undefined {
    return this.moduleStats.find(m => m.moduleId === Number(id));
  }

  isRowAllChecked(node: PermissionTreeNode): boolean {
    return node.access && node.add && node.edit && node.delete;
  }

  isRowIndeterminate(node: PermissionTreeNode): boolean {
    const sum = Number(node.access) + Number(node.add) + Number(node.edit) + Number(node.delete);
    return sum > 0 && sum < 4;
  }

  /** Nút "Toàn quyền" chỉ bị khóa với vai trò quản trị hệ thống.
   *  Với các phân hệ thiếu một vài quyền CRUD, nút vẫn dùng được nhưng chỉ cấp những quyền có sẵn. */
  isRowAllDisabled(node: PermissionTreeNode): boolean {
    return this.isAdminRole;
  }

  toggleRowAll(node: PermissionTreeNode, moduleKey: string, checked: boolean): void {
    this.onPermissionChange('access', node, moduleKey, checked);
    this.onPermissionChange('add', node, moduleKey, checked);
    this.onPermissionChange('edit', node, moduleKey, checked);
    this.onPermissionChange('delete', node, moduleKey, checked);
  }

  private flagOf(fp: FunctionPermission, field: PermField): number {
    if (field === 'access') return fp.Flag;
    if (field === 'add') return fp.Adds;
    if (field === 'edit') return fp.Edit;
    return fp.Del;
  }

  /** Chỉ các chức năng lá (FunctionsId >= 1000), loại trừ hàng module. */
  private leafPermissions(): FunctionPermission[] {
    return this.originalPermissions.filter(p => p.FunctionsId >= 1000);
  }

  isColumnChecked(field: PermField): boolean {
    const leaves = this.leafPermissions();
    if (!leaves.length) return false;
    return leaves.every(p => this.flagOf(p, field) === 1);
  }

  isColumnIndeterminate(field: PermField): boolean {
    const leaves = this.leafPermissions();
    if (!leaves.length) return false;
    const count = leaves.filter(p => this.flagOf(p, field) === 1).length;
    return count > 0 && count < leaves.length;
  }

  toggleColumnAll(field: PermField, checked: boolean): void {
    if (this.isAdminRole) return;
    this.isDirty.set(true);
    this.applyToLeaves(this.leafPermissions(), field, checked);
    this.recomputeTreeFlags();
    this.recalculateStats();
  }

  // ── Presets ─────────────────────────────────────────────────────────
  applyPreset(preset: 'fullAdmin' | 'readOnly' | 'warehousePreset' | 'accountantPreset' | 'clearAll'): void {
    if (this.isAdminRole) return;
    this.isDirty.set(true);

    const setAll = (flag: number, adds: number, edit: number, del: number, res: number): void => {
      this.leafPermissions().forEach(p => {
        if (p.CanView !== false) {
          p.Flag = flag;
          p.Res = res;
        } else {
          p.Flag = 0;
          p.Res = 0;
        }
        if (p.CanAdd !== false) p.Adds = adds;
        else p.Adds = 0;
        if (p.CanEdit !== false) p.Edit = edit;
        else p.Edit = 0;
        if (p.CanDelete !== false) p.Del = del;
        else p.Del = 0;
      });
    };

    const grantView = (leaves: FunctionPermission[]): void => {
      leaves.forEach(p => {
        if (p.CanView !== false) {
          p.Flag = 1;
          p.Res = 1;
        }
        p.Adds = p.Edit = p.Del = 0;
      });
    };

    const clearAll = (): void => setAll(0, 0, 0, 0, 0);

    switch (preset) {
      case 'fullAdmin':
        setAll(1, 1, 1, 1, 1);
        this.toastService.success('Đã áp dụng mẫu: Toàn quyền quản trị.');
        break;
      case 'readOnly':
        setAll(1, 0, 0, 0, 1);
        this.toastService.success('Đã áp dụng mẫu: Chỉ xem.');
        break;
      case 'warehousePreset':
        clearAll();
        this.applyToLeaves(this.moduleLeavesByKeyword('kho'), 'access', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kho'), 'add', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kho'), 'edit', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kho'), 'delete', true);
        grantView(this.moduleLeavesByKeyword('mua hàng'));
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Quản lý Kho.');
        break;
      case 'accountantPreset':
        clearAll();
        this.applyToLeaves(this.moduleLeavesByKeyword('kế toán'), 'access', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kế toán'), 'add', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kế toán'), 'edit', true);
        this.applyToLeaves(this.moduleLeavesByKeyword('kế toán'), 'delete', true);
        ['hệ thống', 'kho', 'mua hàng', 'bán hàng'].forEach(kw => grantView(this.moduleLeavesByKeyword(kw)));
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Kế toán - Tài chính.');
        break;
      case 'clearAll':
        clearAll();
        this.toastService.info('Đã bỏ chọn toàn bộ quyền.');
        break;
    }

    this.recomputeTreeFlags();
    this.recalculateStats();
  }

  // ── Stats (chỉ đếm chức năng lá, không đếm hàng module) ────────────
  /** Đếm số quyền (tối đa 4: xem/thêm/sửa/xóa) và số quyền đang bật của tập lá. */
  private sumRights(leaves: FunctionPermission[]): { total: number; active: number } {
    let total = 0;
    let active = 0;
    for (const p of leaves) {
      if (p.CanView !== false) { total++; if (p.Flag === 1) active++; }
      if (p.CanAdd !== false) { total++; if (p.Adds === 1) active++; }
      if (p.CanEdit !== false) { total++; if (p.Edit === 1) active++; }
      if (p.CanDelete !== false) { total++; if (p.Del === 1) active++; }
    }
    return { total, active };
  }

  private recalculateStats(): void {
    const leaves = this.leafPermissions();
    const overall = this.sumRights(leaves);
    this.totalRights = overall.total;
    this.activeRights = overall.active;
    this.overallPercent = overall.total ? Math.round((overall.active / overall.total) * 100) : 0;

    const roots = this.originalPermissions.filter(p => p.ParentId === -1 || p.ParentId === 0);
    this.moduleStats = roots.map(root => {
      const childLeaves = this.originalPermissions.filter(p => p.ParentId === root.FunctionsId && p.FunctionsId >= 1000);
      const stat = this.sumRights(childLeaves);
      return {
        moduleId: root.FunctionsId,
        moduleName: root.FunctionsName,
        icon: root.Icon || 'folder',
        totalFunctions: childLeaves.length,
        activeFunctions: childLeaves.filter(m => m.Flag === 1).length,
        totalRights: stat.total,
        activeRights: stat.active,
        percent: stat.total ? Math.round((stat.active / stat.total) * 100) : 0,
      };
    });
  }

  // ── Save ────────────────────────────────────────────────────────────
  onSavePermissions(): void {
    if (this.isAdminRole) {
      this.toastService.error('Lỗi', 'Vai trò ADMIN là vai trò hệ thống, không được phép chỉnh sửa phân quyền.');
      return;
    }
    this.saving.set(true);
    const payload: UpdatePermissionPayload[] = this.originalPermissions
      .filter(p => p.FunctionsId >= 1000)
      .map(p => ({
        FunctionsId: p.FunctionsId,
        Adds: p.Adds,
        Del: p.Del,
        Edit: p.Edit,
        Flag: p.Flag,
        Res: p.Res,
      }));

    this.roleService
      .updateFunctionPermissions(UPDATE_APP_ID, this.groupId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.isDirty.set(false);
          this.toastService.success('Thành công', `Đã lưu cấu hình phân quyền cho vai trò "${this.role.name || 'Vai trò'}".`);
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.message || 'Không thể lưu cấu hình phân quyền.';
          this.toastService.error('Lỗi', msg);
        },
      });
  }

  backToList(): void {
    if (this.isDirty()) {
      this.modalService.confirm({
        nzTitle: 'Xác nhận rời khỏi trang',
        nzContent: 'Bạn có thay đổi phân quyền chưa lưu. Bạn có chắc chắn muốn quay lại danh sách?',
        nzOkText: 'Rời khỏi',
        nzOkDanger: true,
        nzCancelText: 'Ở lại',
        nzOnOk: () => this.router.navigate(['/admin/system/roles/list']),
      });
    } else {
      this.router.navigate(['/admin/system/roles/list']);
    }
  }
}
