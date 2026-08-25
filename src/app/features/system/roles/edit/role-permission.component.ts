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
  groupId = 0;
  loading = signal(false);
  saving = signal(false);
  isDirty = signal(false);

  viewMode: PermissionViewMode = 'matrix';
  searchKeyword = '';
  selectedModuleFilter = 'all';
  permissionStatusFilter: 'all' | 'granted' | 'ungranted' = 'all';

  readonly moduleOptions = [
    { value: 'all', label: 'Tất cả phân hệ' },
    { value: '1000', label: '1. Tổng quan & Dashboard' },
    { value: '2000', label: '2. Quản lý Kho & Vật tư' },
    { value: '3000', label: '3. Quản lý Mua hàng & NCC' },
    { value: '4000', label: '4. Quản lý Bán hàng & CRM' },
    { value: '5000', label: '5. Kế toán & Tài chính' },
    { value: '6000', label: '6. Quản lý Nhân sự & Tiền lương' },
    { value: '7000', label: '7. Quản trị Hệ thống' },
  ];

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
      this.groupId = Number(this.role.id) || 0;
    } else {
      this.groupId = Number(this.route.snapshot.queryParams['id']) || 0;
      if (this.groupId) {
        this.roleService
          .getRoleById(String(this.groupId))
          .pipe(takeUntil(this.destroy$))
          .subscribe(r => {
            if (r) this.role = r;
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
    this.cdr.detectChanges();
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

    roots.forEach(root => this.updateParentCheckState(root));
    return roots;
  }

  private convertTreeToList(root: PermissionTreeNode): PermissionTreeNode[] {
    const stack: PermissionTreeNode[] = [{ ...root, level: 0, expand: true }];
    const array: PermissionTreeNode[] = [];
    const seen: Record<string, boolean> = {};

    while (stack.length) {
      const node = stack.pop()!;
      if (!seen[node.key]) {
        seen[node.key] = true;
        array.push(node);
      }
      if (node.children?.length) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push({ ...node.children[i], level: (node.level ?? 0) + 1, expand: true, parent: node });
        }
      }
    }
    return array;
  }

  private visitNode(node: PermissionTreeNode, hashMap: Record<string, boolean>, array: PermissionTreeNode[]): void {
    if (!hashMap[node.key]) {
      hashMap[node.key] = true;
      array.push(node);
    }
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

  // ── Permission cascade ──────────────────────────────────────────────
  onPermissionChange(field: PermField, node: PermissionTreeNode, moduleKey: string, value: boolean): void {
    this.isDirty.set(true);
    const orig = this.originalPermissions.find(p => p.FunctionsId.toString() === node.key);

    if (field === 'access') {
      node.access = value;
      if (orig) {
        orig.Flag = value ? 1 : 0;
        orig.Res = value ? 1 : 0;
      }
      if (!value) {
        node.add = node.edit = node.delete = false;
        if (orig) orig.Adds = orig.Edit = orig.Del = 0;
      }
      this.propagatePermissionDown(node, 'access', value);
      if (!value) {
        this.propagatePermissionDown(node, 'add', false);
        this.propagatePermissionDown(node, 'edit', false);
        this.propagatePermissionDown(node, 'delete', false);
      }
    } else {
      node[field] = value;
      if (orig) {
        if (field === 'add') orig.Adds = value ? 1 : 0;
        if (field === 'edit') orig.Edit = value ? 1 : 0;
        if (field === 'delete') orig.Del = value ? 1 : 0;
      }
      if (value && !node.access) {
        node.access = true;
        if (orig) {
          orig.Flag = 1;
          orig.Res = 1;
        }
        this.propagateAccessUp(node);
      }
      this.propagatePermissionDown(node, field, value);
    }

    const root = this.listOfMapData.find(r => r.key === moduleKey);
    if (root) this.updateParentCheckState(root);

    this.recalculateStats();
    this.cdr.markForCheck();
  }

  private propagatePermissionDown(node: PermissionTreeNode, field: PermField, value: boolean): void {
    node.children?.forEach(child => {
      child[field] = value;
      const orig = this.originalPermissions.find(p => p.FunctionsId.toString() === child.key);
      if (orig) {
        if (field === 'access') {
          orig.Flag = value ? 1 : 0;
          orig.Res = value ? 1 : 0;
        }
        if (field === 'add') orig.Adds = value ? 1 : 0;
        if (field === 'edit') orig.Edit = value ? 1 : 0;
        if (field === 'delete') orig.Del = value ? 1 : 0;
      }
      this.propagatePermissionDown(child, field, value);
    });
  }

  private propagateAccessUp(node: PermissionTreeNode): void {
    let cur = node.parent;
    while (cur) {
      cur.access = true;
      const orig = this.originalPermissions.find(p => p.FunctionsId.toString() === cur!.key);
      if (orig) {
        orig.Flag = 1;
        orig.Res = 1;
      }
      cur = cur.parent;
    }
  }

  private updateParentCheckState(node: PermissionTreeNode): void {
    if (!node.children?.length) {
      node.accessIndeterminate = node.addIndeterminate = node.editIndeterminate = node.deleteIndeterminate = false;
      return;
    }
    node.children.forEach(c => this.updateParentCheckState(c));
    const total = node.children.length;
    const ac = node.children.filter(c => c.access).length;
    const ad = node.children.filter(c => c.add).length;
    const ed = node.children.filter(c => c.edit).length;
    const de = node.children.filter(c => c.delete).length;

    node.access = ac === total;
    node.accessIndeterminate = ac > 0 && ac < total;
    node.add = ad === total;
    node.addIndeterminate = ad > 0 && ad < total;
    node.edit = ed === total;
    node.editIndeterminate = ed > 0 && ed < total;
    node.delete = de === total;
    node.deleteIndeterminate = de > 0 && de < total;
  }

  // ── Row / Column helpers ────────────────────────────────────────────
  isRowAllChecked(node: PermissionTreeNode): boolean {
    return node.access && node.add && node.edit && node.delete;
  }

  isRowIndeterminate(node: PermissionTreeNode): boolean {
    const sum = Number(node.access) + Number(node.add) + Number(node.edit) + Number(node.delete);
    return sum > 0 && sum < 4;
  }

  toggleRowAll(node: PermissionTreeNode, moduleKey: string, checked: boolean): void {
    this.onPermissionChange('access', node, moduleKey, checked);
    this.onPermissionChange('add', node, moduleKey, checked);
    this.onPermissionChange('edit', node, moduleKey, checked);
    this.onPermissionChange('delete', node, moduleKey, checked);
  }

  isColumnChecked(field: PermField): boolean {
    if (!this.originalPermissions.length) return false;
    return this.originalPermissions.every(p => {
      if (field === 'access') return p.Flag === 1;
      if (field === 'add') return p.Adds === 1;
      if (field === 'edit') return p.Edit === 1;
      return p.Del === 1;
    });
  }

  isColumnIndeterminate(field: PermField): boolean {
    if (!this.originalPermissions.length) return false;
    const count = this.originalPermissions.filter(p => {
      if (field === 'access') return p.Flag === 1;
      if (field === 'add') return p.Adds === 1;
      if (field === 'edit') return p.Edit === 1;
      return p.Del === 1;
    }).length;
    return count > 0 && count < this.originalPermissions.length;
  }

  toggleColumnAll(field: PermField, checked: boolean): void {
    this.isDirty.set(true);
    const val = checked ? 1 : 0;

    this.originalPermissions.forEach(p => {
      if (field === 'access') {
        p.Flag = val;
        p.Res = val;
        if (!checked) p.Adds = p.Edit = p.Del = 0;
      }
      if (field === 'add') {
        p.Adds = val;
        if (checked) {
          p.Flag = 1;
          p.Res = 1;
        }
      }
      if (field === 'edit') {
        p.Edit = val;
        if (checked) {
          p.Flag = 1;
          p.Res = 1;
        }
      }
      if (field === 'delete') {
        p.Del = val;
        if (checked) {
          p.Flag = 1;
          p.Res = 1;
        }
      }
    });

    this.renderTree(this.originalPermissions);
    this.recalculateStats();
  }

  // ── Presets ─────────────────────────────────────────────────────────
  applyPreset(preset: 'fullAdmin' | 'readOnly' | 'warehousePreset' | 'accountantPreset' | 'clearAll'): void {
    this.isDirty.set(true);

    const setAll = (flag: number, adds: number, edit: number, del: number, res: number): void => {
      this.originalPermissions.forEach(p => {
        p.Flag = flag;
        p.Adds = adds;
        p.Edit = edit;
        p.Del = del;
        p.Res = res;
      });
    };

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
        this.originalPermissions.forEach(p => {
          if ([1000, 1002, 2000].includes(p.FunctionsId) || p.ParentId === 2000) {
            p.Flag = p.Adds = p.Edit = p.Del = p.Res = 1;
          } else if (p.FunctionsId === 3000 || p.ParentId === 3000) {
            p.Flag = p.Res = 1;
            p.Adds = p.Edit = p.Del = 0;
          } else {
            p.Flag = p.Adds = p.Edit = p.Del = p.Res = 0;
          }
        });
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Quản lý Kho.');
        break;
      case 'accountantPreset':
        this.originalPermissions.forEach(p => {
          if ([5000, 4004, 1003].includes(p.FunctionsId) || p.ParentId === 5000) {
            p.Flag = p.Adds = p.Edit = p.Del = p.Res = 1;
          } else if ([1000, 2000, 2007, 3000, 3005, 4000].includes(p.FunctionsId)) {
            p.Flag = p.Res = 1;
            p.Adds = p.Edit = p.Del = 0;
          } else {
            p.Flag = p.Adds = p.Edit = p.Del = p.Res = 0;
          }
        });
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Kế toán - Tài chính.');
        break;
      case 'clearAll':
        setAll(0, 0, 0, 0, 0);
        this.toastService.info('Đã bỏ chọn toàn bộ quyền.');
        break;
    }

    this.renderTree(this.originalPermissions);
    this.recalculateStats();
  }

  // ── Stats ───────────────────────────────────────────────────────────
  private recalculateStats(): void {
    const total = this.originalPermissions.length;
    this.totalRights = total * 4;

    let active = 0;
    this.originalPermissions.forEach(p => {
      if (p.Flag === 1) active++;
      if (p.Adds === 1) active++;
      if (p.Edit === 1) active++;
      if (p.Del === 1) active++;
    });
    this.activeRights = active;
    this.overallPercent = this.totalRights ? Math.round((active / this.totalRights) * 100) : 0;

    const roots = this.originalPermissions.filter(p => p.ParentId === -1 || p.ParentId === 0);
    this.moduleStats = roots.map(root => {
      const nodes = this.originalPermissions.filter(p => p.FunctionsId === root.FunctionsId || p.ParentId === root.FunctionsId);
      const totalR = nodes.length * 4;
      let activeR = 0;
      nodes.forEach(m => {
        if (m.Flag === 1) activeR++;
        if (m.Adds === 1) activeR++;
        if (m.Edit === 1) activeR++;
        if (m.Del === 1) activeR++;
      });
      return {
        moduleId: root.FunctionsId,
        moduleName: root.FunctionsName,
        icon: root.Icon || 'folder',
        totalFunctions: nodes.length,
        activeFunctions: nodes.filter(m => m.Flag === 1).length,
        totalRights: totalR,
        activeRights: activeR,
        percent: totalR ? Math.round((activeR / totalR) * 100) : 0,
      };
    });
  }

  // ── Save ────────────────────────────────────────────────────────────
  onSavePermissions(): void {
    this.saving.set(true);
    const payload: UpdatePermissionPayload[] = this.originalPermissions.map(p => ({
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
        error: () => {
          this.saving.set(false);
          this.toastService.error('Lỗi', 'Không thể lưu cấu hình phân quyền.');
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
