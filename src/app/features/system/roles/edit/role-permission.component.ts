import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { AppButtonComponent } from '../../../../shared/app-button/app-button.component';
import { BaseComponent } from '../../../../shared/base-component/base.component';
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
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzRadioModule,
    NzProgressModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    NzAlertModule,
    NzBadgeModule,
    AppButtonComponent,
  ],
  templateUrl: './role-permission.component.html',
  styleUrls: ['./role-permission.component.scss'],
})
export class RolePermissionComponent extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly layoutService = inject(LayoutService);
  private readonly roleService = inject(RoleService);

  protected readonly sidebarCollapsed = this.layoutService.sidebarCollapsed;

  // ── Role State ────────────────────────────────────────────────────────
  role: Partial<Role> = {};
  groupId = 0;
  loading = signal(false);
  saving = signal(false);
  isDirty = signal(false);

  // ── View Mode & Filters ───────────────────────────────────────────────
  viewMode: PermissionViewMode = 'matrix'; // 'matrix' | 'tree'
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

  // ── Tree Data Structures ──────────────────────────────────────────────
  originalPermissions: FunctionPermission[] = [];
  listOfMapData: PermissionTreeNode[] = [];
  mapOfExpandedData: { [key: string]: PermissionTreeNode[] } = {};

  // ── Metrics & Stats ───────────────────────────────────────────────────
  moduleStats: ModulePermissionStats[] = [];
  totalRights = 0;
  activeRights = 0;
  overallPercent = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Hệ thống', url: '/admin/system/roles/list' },
      { label: 'Quản lý vai trò', url: '/admin/system/roles/list' },
      { label: 'Phân quyền vai trò', url: '/admin/system/roles/edit' },
    ]);

    const stateRole = history.state?.role;
    if (stateRole) {
      this.role = stateRole;
      this.groupId = Number(this.role.id) || 0;
    } else {
      this.groupId = Number(this.route.snapshot.queryParams['id']) || 0;
      if (this.groupId) {
        this.roleService.getRoleById(String(this.groupId)).pipe(takeUntil(this.destroy$)).subscribe(r => {
          if (r) this.role = r;
        });
      }
    }

    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loading.set(true);
    this.roleService
      .getFunctionPermissions(17, this.groupId)
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

  // ── Tree Building & Rendering ─────────────────────────────────────────
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

    // Pass 1: Build nodes
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

    // Pass 2: Connect parent-child
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

    // Pass 3: Update indeterminate for parent nodes
    roots.forEach(root => this.updateParentCheckState(root));

    return roots;
  }

  convertTreeToList(root: PermissionTreeNode): PermissionTreeNode[] {
    const stack: PermissionTreeNode[] = [];
    const array: PermissionTreeNode[] = [];
    const hashMap: { [key: string]: boolean } = {};
    stack.push({ ...root, level: 0, expand: true });

    while (stack.length !== 0) {
      const node = stack.pop()!;
      this.visitNode(node, hashMap, array);
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push({
            ...node.children[i],
            level: (node.level ?? 0) + 1,
            expand: true,
            parent: node,
          });
        }
      }
    }
    return array;
  }

  private visitNode(
    node: PermissionTreeNode,
    hashMap: { [key: string]: boolean },
    array: PermissionTreeNode[]
  ): void {
    if (!hashMap[node.key]) {
      hashMap[node.key] = true;
      array.push(node);
    }
  }

  isNodeVisible(item: PermissionTreeNode): boolean {
    let curr = item.parent;
    while (curr) {
      if (!curr.expand) {
        return false;
      }
      curr = curr.parent;
    }
    return true;
  }

  collapse(array: PermissionTreeNode[], data: PermissionTreeNode, expand: boolean): void {
    data.expand = expand;
    if (!expand && data.children) {
      data.children.forEach(d => {
        const target = array.find(a => a.key === d.key);
        if (target) {
          target.expand = false;
          this.collapse(array, target, false);
        }
      });
    }
    this.cdr.markForCheck();
  }

  expandAll(): void {
    this.listOfMapData.forEach(root => {
      root.expand = true;
    });
    Object.values(this.mapOfExpandedData).forEach(list => {
      list.forEach(node => {
        node.expand = true;
      });
    });
    this.cdr.markForCheck();
  }

  collapseAll(): void {
    // Thu gọn lại 1 cấp: Đóng tất cả các cấp (root expand = false), chỉ hiển thị cấp 1 (phân hệ gốc)
    this.listOfMapData.forEach(root => {
      root.expand = false;
    });
    Object.values(this.mapOfExpandedData).forEach(list => {
      list.forEach(node => {
        node.expand = false;
      });
    });
    this.cdr.markForCheck();
  }

  // ── Search & Filter Logic ─────────────────────────────────────────────
  onSearch(): void {
    let filtered = [...this.originalPermissions];

    // Module filter
    if (this.selectedModuleFilter !== 'all') {
      const targetModuleId = Number(this.selectedModuleFilter);
      const moduleNodeIds = new Set<number>();
      moduleNodeIds.add(targetModuleId);

      const findChildren = (parentId: number) => {
        this.originalPermissions.forEach(p => {
          if (p.ParentId === parentId) {
            moduleNodeIds.add(p.FunctionsId);
            findChildren(p.FunctionsId);
          }
        });
      };
      findChildren(targetModuleId);

      filtered = filtered.filter(p => moduleNodeIds.has(p.FunctionsId));
    }

    // Permission status filter
    if (this.permissionStatusFilter === 'granted') {
      filtered = filtered.filter(p => p.Flag === 1 || p.Adds === 1 || p.Edit === 1 || p.Del === 1);
    } else if (this.permissionStatusFilter === 'ungranted') {
      filtered = filtered.filter(p => p.Flag === 0 && p.Adds === 0 && p.Edit === 0 && p.Del === 0);
    }

    // Keyword search
    if (this.searchKeyword?.trim()) {
      const q = this.searchKeyword.trim().toLowerCase();
      const matchedIds = new Set<number>();

      filtered.forEach(p => {
        if (p.FunctionsName.toLowerCase().includes(q) || (p.Path && p.Path.toLowerCase().includes(q))) {
          matchedIds.add(p.FunctionsId);

          let parentId = p.ParentId;
          while (parentId !== -1 && parentId !== 0) {
            matchedIds.add(parentId);
            const parent = this.originalPermissions.find(x => x.FunctionsId === parentId);
            if (parent) {
              parentId = parent.ParentId;
            } else {
              break;
            }
          }
        }
      });

      filtered = filtered.filter(p => matchedIds.has(p.FunctionsId));
    }

    this.renderTree(filtered);
  }

  // ── Permission State Management & Cascading ───────────────────────────
  onPermissionChange(
    field: PermField,
    node: PermissionTreeNode,
    moduleKey: string,
    value: boolean
  ): void {
    this.isDirty.set(true);

    // Update in original permission array
    const originalItem = this.originalPermissions.find(p => p.FunctionsId.toString() === node.key);

    if (field === 'access') {
      node.access = value;
      if (originalItem) {
        originalItem.Flag = value ? 1 : 0;
        originalItem.Res = value ? 1 : 0;
      }

      // If access is revoked, also revoke adds, edit, delete
      if (!value) {
        node.add = false;
        node.edit = false;
        node.delete = false;
        if (originalItem) {
          originalItem.Adds = 0;
          originalItem.Edit = 0;
          originalItem.Del = 0;
        }
      }

      // Propagate down to all descendants
      this.propagatePermissionDown(node, 'access', value);
      if (!value) {
        this.propagatePermissionDown(node, 'add', false);
        this.propagatePermissionDown(node, 'edit', false);
        this.propagatePermissionDown(node, 'delete', false);
      }
    } else {
      node[field] = value;
      if (originalItem) {
        if (field === 'add') originalItem.Adds = value ? 1 : 0;
        if (field === 'edit') originalItem.Edit = value ? 1 : 0;
        if (field === 'delete') originalItem.Del = value ? 1 : 0;
      }

      // If granting add/edit/delete, automatically ensure access is granted
      if (value && !node.access) {
        node.access = true;
        if (originalItem) {
          originalItem.Flag = 1;
          originalItem.Res = 1;
        }
        this.propagateAccessUp(node);
      }

      // Propagate down
      this.propagatePermissionDown(node, field, value);
    }

    // Refresh parents up to root
    const root = this.listOfMapData.find(r => r.key === moduleKey);
    if (root) {
      this.updateParentCheckState(root);
    }

    this.recalculateStats();
    this.cdr.markForCheck();
  }

  private propagatePermissionDown(node: PermissionTreeNode, field: PermField, value: boolean): void {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
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
  }

  private propagateAccessUp(node: PermissionTreeNode): void {
    let current = node.parent;
    while (current) {
      current.access = true;
      const orig = this.originalPermissions.find(p => p.FunctionsId.toString() === current?.key);
      if (orig) {
        orig.Flag = 1;
        orig.Res = 1;
      }
      current = current.parent;
    }
  }

  private updateParentCheckState(node: PermissionTreeNode): void {
    if (!node.children || node.children.length === 0) {
      node.accessIndeterminate = false;
      node.addIndeterminate = false;
      node.editIndeterminate = false;
      node.deleteIndeterminate = false;
      return;
    }

    node.children.forEach(child => this.updateParentCheckState(child));

    const total = node.children.length;
    const accessCount = node.children.filter(c => c.access).length;
    const addCount = node.children.filter(c => c.add).length;
    const editCount = node.children.filter(c => c.edit).length;
    const delCount = node.children.filter(c => c.delete).length;

    node.access = accessCount === total;
    node.accessIndeterminate = accessCount > 0 && accessCount < total;

    node.add = addCount === total;
    node.addIndeterminate = addCount > 0 && addCount < total;

    node.edit = editCount === total;
    node.editIndeterminate = editCount > 0 && editCount < total;

    node.delete = delCount === total;
    node.deleteIndeterminate = delCount > 0 && delCount < total;
  }

  // ── Row-Level Quick Action ────────────────────────────────────────────
  isRowAllChecked(node: PermissionTreeNode): boolean {
    return node.access && node.add && node.edit && node.delete;
  }

  isRowIndeterminate(node: PermissionTreeNode): boolean {
    const sum = (node.access ? 1 : 0) + (node.add ? 1 : 0) + (node.edit ? 1 : 0) + (node.delete ? 1 : 0);
    return sum > 0 && sum < 4;
  }

  toggleRowAll(node: PermissionTreeNode, moduleKey: string, checked: boolean): void {
    this.onPermissionChange('access', node, moduleKey, checked);
    this.onPermissionChange('add', node, moduleKey, checked);
    this.onPermissionChange('edit', node, moduleKey, checked);
    this.onPermissionChange('delete', node, moduleKey, checked);
  }

  // ── Column-Level Quick Action ─────────────────────────────────────────
  isColumnChecked(field: PermField): boolean {
    if (this.originalPermissions.length === 0) return false;
    return this.originalPermissions.every(p => {
      if (field === 'access') return p.Flag === 1;
      if (field === 'add') return p.Adds === 1;
      if (field === 'edit') return p.Edit === 1;
      if (field === 'delete') return p.Del === 1;
      return false;
    });
  }

  isColumnIndeterminate(field: PermField): boolean {
    if (this.originalPermissions.length === 0) return false;
    const count = this.originalPermissions.filter(p => {
      if (field === 'access') return p.Flag === 1;
      if (field === 'add') return p.Adds === 1;
      if (field === 'edit') return p.Edit === 1;
      if (field === 'delete') return p.Del === 1;
      return false;
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
        if (!checked) {
          p.Adds = 0;
          p.Edit = 0;
          p.Del = 0;
        }
      }
      if (field === 'add') {
        p.Adds = val;
        if (checked) { p.Flag = 1; p.Res = 1; }
      }
      if (field === 'edit') {
        p.Edit = val;
        if (checked) { p.Flag = 1; p.Res = 1; }
      }
      if (field === 'delete') {
        p.Del = val;
        if (checked) { p.Flag = 1; p.Res = 1; }
      }
    });

    this.renderTree(this.originalPermissions);
    this.recalculateStats();
  }

  // ── Quick Presets ─────────────────────────────────────────────────────
  applyPreset(preset: 'fullAdmin' | 'readOnly' | 'warehousePreset' | 'accountantPreset' | 'clearAll'): void {
    this.isDirty.set(true);

    switch (preset) {
      case 'fullAdmin':
        this.originalPermissions.forEach(p => {
          p.Flag = 1;
          p.Adds = 1;
          p.Edit = 1;
          p.Del = 1;
          p.Res = 1;
        });
        this.toastService.success('Đã áp dụng mẫu: Toàn quyền quản trị.');
        break;

      case 'readOnly':
        this.originalPermissions.forEach(p => {
          p.Flag = 1;
          p.Adds = 0;
          p.Edit = 0;
          p.Del = 0;
          p.Res = 1;
        });
        this.toastService.success('Đã áp dụng mẫu: Chỉ xem.');
        break;

      case 'warehousePreset':
        this.originalPermissions.forEach(p => {
          if (p.FunctionsId === 1000 || p.FunctionsId === 1002 || p.FunctionsId === 2000 || p.ParentId === 2000) {
            p.Flag = 1; p.Adds = 1; p.Edit = 1; p.Del = 1; p.Res = 1;
          } else if (p.FunctionsId === 3000 || p.ParentId === 3000) {
            p.Flag = 1; p.Adds = 0; p.Edit = 0; p.Del = 0; p.Res = 1;
          } else {
            p.Flag = 0; p.Adds = 0; p.Edit = 0; p.Del = 0; p.Res = 0;
          }
        });
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Quản lý Kho.');
        break;

      case 'accountantPreset':
        this.originalPermissions.forEach(p => {
          if (p.FunctionsId === 5000 || p.ParentId === 5000 || p.FunctionsId === 4004 || p.FunctionsId === 1003) {
            p.Flag = 1; p.Adds = 1; p.Edit = 1; p.Del = 1; p.Res = 1;
          } else if ([1000, 2000, 2007, 3000, 3005, 4000].includes(p.FunctionsId)) {
            p.Flag = 1; p.Adds = 0; p.Edit = 0; p.Del = 0; p.Res = 1;
          } else {
            p.Flag = 0; p.Adds = 0; p.Edit = 0; p.Del = 0; p.Res = 0;
          }
        });
        this.toastService.success('Đã áp dụng mẫu: Nghiệp vụ Kế toán - Tài chính.');
        break;

      case 'clearAll':
        this.originalPermissions.forEach(p => {
          p.Flag = 0;
          p.Adds = 0;
          p.Edit = 0;
          p.Del = 0;
          p.Res = 0;
        });
        this.toastService.info('Đã bỏ chọn toàn bộ quyền.');
        break;
    }

    this.renderTree(this.originalPermissions);
    this.recalculateStats();
  }

  // ── Stats Recalculation ───────────────────────────────────────────────
  private recalculateStats(): void {
    const totalNodes = this.originalPermissions.length;
    this.totalRights = totalNodes * 4;

    let active = 0;
    this.originalPermissions.forEach(p => {
      if (p.Flag === 1) active++;
      if (p.Adds === 1) active++;
      if (p.Edit === 1) active++;
      if (p.Del === 1) active++;
    });

    this.activeRights = active;
    this.overallPercent = this.totalRights > 0 ? Math.round((active / this.totalRights) * 100) : 0;

    // Module stats breakdown
    const roots = this.originalPermissions.filter(p => p.ParentId === -1 || p.ParentId === 0);
    this.moduleStats = roots.map(root => {
      const moduleNodes = this.originalPermissions.filter(
        p => p.FunctionsId === root.FunctionsId || p.ParentId === root.FunctionsId
      );
      const totalR = moduleNodes.length * 4;
      let activeR = 0;
      moduleNodes.forEach(m => {
        if (m.Flag === 1) activeR++;
        if (m.Adds === 1) activeR++;
        if (m.Edit === 1) activeR++;
        if (m.Del === 1) activeR++;
      });
      const pct = totalR > 0 ? Math.round((activeR / totalR) * 100) : 0;

      return {
        moduleId: root.FunctionsId,
        moduleName: root.FunctionsName,
        icon: root.Icon || 'folder',
        totalFunctions: moduleNodes.length,
        activeFunctions: moduleNodes.filter(m => m.Flag === 1).length,
        totalRights: totalR,
        activeRights: activeR,
        percent: pct,
      };
    });
  }

  // ── Save Permissions ──────────────────────────────────────────────────
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
      .updateFunctionPermissions(26, this.groupId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.isDirty.set(false);
          this.toastService.success(
            'Thành công',
            `Đã lưu cấu hình phân quyền cho vai trò "${this.role.name || 'Vai trò'}".`
          );
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
        nzOnOk: () => {
          this.router.navigate(['/admin/system/roles/list']);
        },
      });
    } else {
      this.router.navigate(['/admin/system/roles/list']);
    }
  }
}
