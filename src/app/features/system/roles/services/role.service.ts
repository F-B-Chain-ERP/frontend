import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
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
  RoleResponseBE,
  RoleStatsKPI,
  UpdatePermissionPayload,
} from '../models/role.model';

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

  // ── 1. MOCK ROLES DATA STORE (CHUẨN ERP) ─────────────────────────────
  private mockRoles: Role[] = [
    {
      id: '1',
      name: 'Quản trị hệ thống (Admin)',
      code: 'ADMIN',
      description: 'Toàn quyền cấu hình hệ thống, quản trị người dùng, phân quyền và giám sát vận hành ERP UTT',
      active: true,
      deleted: false,
      isDefault: true,
      accountCount: 3,
      createdAt: '2025-01-10 08:00:00',
      updatedAt: '2026-02-15 14:30:00',
      createdBy: 'Hệ thống',
    },
    {
      id: '2',
      name: 'Quản lý kho',
      code: 'WAREHOUSE_MGR',
      description: 'Quản lý xuất nhập tồn, kho bãi, kiểm kê hàng hóa, điều chuyển và định mức tồn kho tối thiểu',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 4,
      createdAt: '2025-01-15 09:30:00',
      updatedAt: '2026-02-20 11:15:00',
      createdBy: 'admin',
    },
    {
      id: '3',
      name: 'Nhân viên kho',
      code: 'WAREHOUSE_STAFF',
      description: 'Lập phiếu nhập kho, phiếu xuất kho, in phiếu giao nhận và quét mã vạch kiểm kê',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 6,
      createdAt: '2025-02-01 10:00:00',
      updatedAt: '2026-01-12 16:45:00',
      createdBy: 'admin',
    },
    {
      id: '4',
      name: 'Nhân viên (Staff)',
      code: 'STAFF',
      description: 'Quyền truy cập cơ bản cổng thông tin nội bộ, gửi đề xuất mua sắm và tra cứu cá nhân',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 28,
      createdAt: '2025-02-10 14:00:00',
      updatedAt: '2025-11-20 09:00:00',
      createdBy: 'admin',
    },
    {
      id: '5',
      name: 'Kế toán trưởng',
      code: 'CHIEF_ACCOUNTANT',
      description: 'Kiểm soát thu chi, phê duyệt chứng từ kế toán, lập báo cáo tài chính và kê khai thuế',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 2,
      createdAt: '2025-03-05 11:20:00',
      updatedAt: '2026-02-01 10:20:00',
      createdBy: 'admin',
    },
    {
      id: '6',
      name: 'Kế toán viên',
      code: 'ACCOUNTANT',
      description: 'Lập hóa đơn, hạch toán phiếu thu chi, theo dõi sổ quỹ và công nợ khách hàng, NCC',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 5,
      createdAt: '2025-04-12 15:30:00',
      updatedAt: '2025-10-05 08:30:00',
      createdBy: 'admin',
    },
    {
      id: '7',
      name: 'Quản lý bán hàng',
      code: 'SALES_MGR',
      description: 'Phê duyệt báo giá, hạn mức công nợ, quản lý đơn hàng bán và theo dõi KPI doanh số',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 3,
      createdAt: '2025-05-18 08:45:00',
      updatedAt: '2026-01-20 14:10:00',
      createdBy: 'admin',
    },
    {
      id: '8',
      name: 'Nhân viên kinh doanh',
      code: 'SALES_STAFF',
      description: 'Tạo báo giá, tiếp nhận đơn đặt hàng từ khách hàng, theo dõi giao dịch và chăm sóc khách hàng CRM',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 10,
      createdAt: '2025-06-01 09:15:00',
      updatedAt: '2026-02-10 16:30:00',
      createdBy: 'admin',
    },
    {
      id: '9',
      name: 'Quản lý mua hàng',
      code: 'PURCHASE_MGR',
      description: 'Phê duyệt đơn đặt mua hàng (PO), đàm phán hợp đồng cung ứng và đánh giá nhà cung cấp',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 2,
      createdAt: '2025-07-10 13:30:00',
      updatedAt: '2025-12-15 11:00:00',
      createdBy: 'admin',
    },
    {
      id: '10',
      name: 'Nhân viên mua hàng',
      code: 'PURCHASE_STAFF',
      description: 'Lập đề xuất mua hàng, theo dõi đơn đặt mua, kiểm tra tiến độ giao hàng và đối soát NCC',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 4,
      createdAt: '2025-08-05 10:45:00',
      updatedAt: '2026-01-05 09:20:00',
      createdBy: 'admin',
    },
    {
      id: '11',
      name: 'Quản lý nhân sự',
      code: 'HR_MGR',
      description: 'Quản lý hồ sơ nhân viên, cơ cấu phòng ban, chấm công, tính lương và hợp đồng lao động',
      active: true,
      deleted: false,
      isDefault: false,
      accountCount: 2,
      createdAt: '2025-09-01 14:00:00',
      updatedAt: '2026-02-18 15:40:00',
      createdBy: 'admin',
    },
    {
      id: '12',
      name: 'Kiểm toán viên nội bộ (Lưu trữ)',
      code: 'AUDITOR',
      description: 'Tra cứu chứng từ kế toán, giám sát nhật ký tác động và trích xuất báo cáo kiểm toán',
      active: false,
      deleted: true,
      isDefault: false,
      accountCount: 1,
      createdAt: '2024-12-01 08:00:00',
      updatedAt: '2025-06-01 17:00:00',
      createdBy: 'admin',
    },
  ];

  // ── 2. MOCK ERP HIERARCHICAL FUNCTION TREE (7 PHÂN HỆ, 28 CHỨC NĂNG) ───
  private mockFunctionPermissions: FunctionPermission[] = [
    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 1: TỔNG QUAN & DASHBOARD
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 1000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Tổng quan & Báo cáo',
      Path: '/dashboard',
      FunctionUrl: '',
      Icon: 'dashboard',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Tổng quan dashboard và báo cáo phân tích ERP',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 1001,
      ApplicationId: 17,
      ParentId: 1000,
      FunctionsName: 'Dashboard kinh doanh & Doanh số',
      Path: '/dashboard/sales',
      FunctionUrl: '/dashboard/sales',
      Icon: 'line-chart',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi biểu đồ doanh thu, đơn hàng và khách hàng',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 1002,
      ApplicationId: 17,
      ParentId: 1000,
      FunctionsName: 'Dashboard kho vận & Cung ứng',
      Path: '/dashboard/inventory',
      FunctionUrl: '/dashboard/inventory',
      Icon: 'pie-chart',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi giá trị tồn kho, cảnh báo hết hàng và luân chuyển',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 1003,
      ApplicationId: 17,
      ParentId: 1000,
      FunctionsName: 'Báo cáo tài chính tổng hợp',
      Path: '/dashboard/finance',
      FunctionUrl: '/dashboard/finance',
      Icon: 'fund',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Xem dòng tiền thu chi, công nợ và lợi nhuận gộp',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 2: QUẢN LÝ KHO & VẬT TƯ (INVENTORY)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 2000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Quản lý Kho & Vật tư',
      Path: '/inventory',
      FunctionUrl: '',
      Icon: 'appstore',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Quản lý danh mục hàng hóa, kho bãi, nhập xuất và kiểm kê kho',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 2001,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Danh mục hàng hóa & Vật tư',
      Path: '/inventory/products',
      FunctionUrl: '/inventory/products',
      Icon: 'tags',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Quản lý mã sản phẩm, phân loại, đơn vị tính và định mức',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2002,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Danh mục kho bãi & Vị trí',
      Path: '/inventory/warehouses',
      FunctionUrl: '/inventory/warehouses',
      Icon: 'shop',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Khai báo kho tổng, kho nhánh, kệ hàng và vị trí lưu trữ',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2003,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Phiếu nhập kho hàng hóa',
      Path: '/inventory/inbound',
      FunctionUrl: '/inventory/inbound',
      Icon: 'import',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập và duyệt phiếu nhập mua hàng, nhập trả lại',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2004,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Phiếu xuất kho hàng hóa',
      Path: '/inventory/outbound',
      FunctionUrl: '/inventory/outbound',
      Icon: 'export',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập phiếu xuất bán hàng, xuất tiêu hao và xuất thanh lý',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2005,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Điều chuyển kho nội bộ',
      Path: '/inventory/transfer',
      FunctionUrl: '/inventory/transfer',
      Icon: 'swap',
      Flag: 1,
      OrderId: 5,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập phiếu luân chuyển hàng giữa các chi nhánh, kho bãi',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2006,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Kiểm kê & Điều chỉnh tồn kho',
      Path: '/inventory/audit',
      FunctionUrl: '/inventory/audit',
      Icon: 'check-square',
      Flag: 1,
      OrderId: 6,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập phiếu kiểm kê định kỳ và xử lý chênh lệch thực tế',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 2007,
      ApplicationId: 17,
      ParentId: 2000,
      FunctionsName: 'Báo cáo thẻ kho & Tồn tối thiểu',
      Path: '/inventory/reports',
      FunctionUrl: '/inventory/reports',
      Icon: 'file-text',
      Flag: 1,
      OrderId: 7,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tra cứu lịch sử xuất nhập tồn và cảnh báo hết hàng',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 3: QUẢN LÝ MUA HÀNG & NCC (PURCHASING)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 3000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Quản lý Mua hàng & NCC',
      Path: '/purchasing',
      FunctionUrl: '',
      Icon: 'shopping-cart',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Quản lý đơn hàng mua, nhà cung cấp và đề xuất mua sắm',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 3001,
      ApplicationId: 17,
      ParentId: 3000,
      FunctionsName: 'Quản lý Nhà cung cấp (Vendor)',
      Path: '/purchasing/suppliers',
      FunctionUrl: '/purchasing/suppliers',
      Icon: 'contacts',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Hồ sơ nhà cung cấp, thông tin liên hệ và lịch sử giao dịch',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 3002,
      ApplicationId: 17,
      ParentId: 3000,
      FunctionsName: 'Đề xuất / Yêu cầu mua hàng',
      Path: '/purchasing/requisitions',
      FunctionUrl: '/purchasing/requisitions',
      Icon: 'file-done',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tạo và xét duyệt yêu cầu mua sắm vật tư từ các phòng ban',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 3003,
      ApplicationId: 17,
      ParentId: 3000,
      FunctionsName: 'Đơn đặt mua hàng (PO)',
      Path: '/purchasing/orders',
      FunctionUrl: '/purchasing/orders',
      Icon: 'solution',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập PO gửi nhà cung cấp, theo dõi tiến độ giao nhận',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 3004,
      ApplicationId: 17,
      ParentId: 3000,
      FunctionsName: 'Hợp đồng mua hàng & Cung ứng',
      Path: '/purchasing/contracts',
      FunctionUrl: '/purchasing/contracts',
      Icon: 'file-protect',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lưu trữ hợp đồng kinh tế, điều khoản thanh toán và bảo hành',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 3005,
      ApplicationId: 17,
      ParentId: 3000,
      FunctionsName: 'Báo cáo chi tiêu mua sắm',
      Path: '/purchasing/reports',
      FunctionUrl: '/purchasing/reports',
      Icon: 'bar-chart',
      Flag: 1,
      OrderId: 5,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tổng hợp chi phí mua sắm theo kỳ, theo NCC và sản phẩm',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 4: QUẢN LÝ BÁN HÀNG & KHÁCH HÀNG (SALES & CRM)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 4000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Quản lý Bán hàng & Khách hàng',
      Path: '/sales',
      FunctionUrl: '',
      Icon: 'shopping',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Quản lý khách hàng, báo giá, đơn đặt hàng và doanh số',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 4001,
      ApplicationId: 17,
      ParentId: 4000,
      FunctionsName: 'Hồ sơ Khách hàng & Đối tác (CRM)',
      Path: '/sales/customers',
      FunctionUrl: '/sales/customers',
      Icon: 'team',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Quản lý thông tin khách hàng, phân hạng và hạn mức nợ',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 4002,
      ApplicationId: 17,
      ParentId: 4000,
      FunctionsName: 'Báo giá bán hàng',
      Path: '/sales/quotations',
      FunctionUrl: '/sales/quotations',
      Icon: 'transaction',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tạo báo giá, gửi khách hàng và chuyển đổi sang đơn hàng',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 4003,
      ApplicationId: 17,
      ParentId: 4000,
      FunctionsName: 'Đơn đặt hàng bán (SO)',
      Path: '/sales/orders',
      FunctionUrl: '/sales/orders',
      Icon: 'snippets',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tiếp nhận đơn hàng, duyệt bán và theo dõi trạng thái giao hàng',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 4004,
      ApplicationId: 17,
      ParentId: 4000,
      FunctionsName: 'Hóa đơn & Chứng từ bán hàng',
      Path: '/sales/invoices',
      FunctionUrl: '/sales/invoices',
      Icon: 'audit',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập hóa đơn bán hàng, phiếu xuất kho kèm hóa đơn',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 4005,
      ApplicationId: 17,
      ParentId: 4000,
      FunctionsName: 'Báo cáo doanh số theo nhân viên & Khu vực',
      Path: '/sales/reports',
      FunctionUrl: '/sales/reports',
      Icon: 'rise',
      Flag: 1,
      OrderId: 5,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tổng hợp doanh số, chiết khấu và hiệu quả bán hàng',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 5: KẾ TOÁN & TÀI CHÍNH (FINANCE & ACCOUNTING)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 5000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Kế toán & Tài chính',
      Path: '/finance',
      FunctionUrl: '',
      Icon: 'account-book',
      Flag: 1,
      OrderId: 5,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Quản lý thu chi, sổ quỹ tiền mặt, công nợ và hạch toán sổ cái',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 5001,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Sổ quỹ tiền mặt & Tài khoản ngân hàng',
      Path: '/finance/cashbook',
      FunctionUrl: '/finance/cashbook',
      Icon: 'bank',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi số dư tiền mặt, tài khoản ngân hàng và sao kê',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 5002,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Lập phiếu thu tiền mặt',
      Path: '/finance/receipts',
      FunctionUrl: '/finance/receipts',
      Icon: 'dollar',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập và in phiếu thu tiền từ khách hàng, hoàn ứng',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 5003,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Lập phiếu chi tiền mặt',
      Path: '/finance/payments',
      FunctionUrl: '/finance/payments',
      Icon: 'pay-circle',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Lập phiếu chi thanh toán NCC, tạm ứng và chi phí hoạt động',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 5004,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Quản lý Công nợ phải thu (Khách hàng)',
      Path: '/finance/receivables',
      FunctionUrl: '/finance/receivables',
      Icon: 'arrow-down',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi hạn nợ, đối soát công nợ và tuổi nợ khách hàng',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 5005,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Quản lý Công nợ phải trả (Nhà cung cấp)',
      Path: '/finance/payables',
      FunctionUrl: '/finance/payables',
      Icon: 'arrow-up',
      Flag: 1,
      OrderId: 5,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi lịch thanh toán NCC và đối chiếu chứng từ',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 5006,
      ApplicationId: 17,
      ParentId: 5000,
      FunctionsName: 'Sổ cái & Hạch toán kế toán tổng hợp',
      Path: '/finance/general-ledger',
      FunctionUrl: '/finance/general-ledger',
      Icon: 'book',
      Flag: 1,
      OrderId: 6,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Định khoản kế toán tự động, khóa sổ kỳ kế toán',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 6: QUẢN LÝ NHÂN SỰ & TIỀN LƯƠNG (HRM)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 6000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Quản lý Nhân sự & Tiền lương',
      Path: '/hrm',
      FunctionUrl: '',
      Icon: 'usergroup-add',
      Flag: 1,
      OrderId: 6,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Hồ sơ nhân sự, phòng ban, chấm công và bảng lương',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 6001,
      ApplicationId: 17,
      ParentId: 6000,
      FunctionsName: 'Hồ sơ nhân viên',
      Path: '/hrm/employees',
      FunctionUrl: '/hrm/employees',
      Icon: 'idcard',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Thông tin cá nhân, hợp đồng lao động và bằng cấp chuyên môn',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 6002,
      ApplicationId: 17,
      ParentId: 6000,
      FunctionsName: 'Cơ cấu phòng ban & Chức danh',
      Path: '/hrm/departments',
      FunctionUrl: '/hrm/departments',
      Icon: 'apartment',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Sơ đồ tổ chức doanh nghiệp, phân cấp quản lý',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 6003,
      ApplicationId: 17,
      ParentId: 6000,
      FunctionsName: 'Chấm công & Phân ca làm việc',
      Path: '/hrm/timesheet',
      FunctionUrl: '/hrm/timesheet',
      Icon: 'schedule',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Bảng chấm công điện tử, duyệt nghỉ phép và ca kíp',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 6004,
      ApplicationId: 17,
      ParentId: 6000,
      FunctionsName: 'Tính lương & Phúc lợi',
      Path: '/hrm/payroll',
      FunctionUrl: '/hrm/payroll',
      Icon: 'calculator',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Tính lương theo ca, bảo hiểm xã hội, thưởng và phiếu lương',
      Adds: 1,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },

    // ═════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 7: QUẢN TRỊ HỆ THỐNG (SYSTEM ADMIN)
    // ═════════════════════════════════════════════════════════════════════
    {
      FunctionsId: 7000,
      ApplicationId: 17,
      ParentId: 0,
      FunctionsName: 'Quản trị Hệ thống',
      Path: '/system',
      FunctionUrl: '',
      Icon: 'setting',
      Flag: 1,
      OrderId: 7,
      OnMenu: 1,
      IsSystem: 1,
      Help: 'Quản lý tài khoản, phân quyền và cấu hình thông số ERP',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 1,
      ListFunc: null,
    },
    {
      FunctionsId: 7001,
      ApplicationId: 17,
      ParentId: 7000,
      FunctionsName: 'Quản lý Người dùng & Tài khoản',
      Path: '/system/accounts',
      FunctionUrl: '/system/accounts/list',
      Icon: 'user',
      Flag: 1,
      OrderId: 1,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Quản lý danh sách tài khoản, mật khẩu và trạng thái',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 7002,
      ApplicationId: 17,
      ParentId: 7000,
      FunctionsName: 'Quản lý Vai trò & Phân quyền',
      Path: '/system/roles',
      FunctionUrl: '/system/roles/list',
      Icon: 'safety-certificate',
      Flag: 1,
      OrderId: 2,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Thiết lập vai trò người dùng và ma trận phân quyền chức năng',
      Adds: 1,
      Del: 1,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 7003,
      ApplicationId: 17,
      ParentId: 7000,
      FunctionsName: 'Cấu hình tham số hệ thống ERP',
      Path: '/system/settings',
      FunctionUrl: '/system/settings',
      Icon: 'control',
      Flag: 1,
      OrderId: 3,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Cấu hình định dạng tiền tệ, mã chứng từ tự sinh, email gateway',
      Adds: 0,
      Del: 0,
      Edit: 1,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
    {
      FunctionsId: 7004,
      ApplicationId: 17,
      ParentId: 7000,
      FunctionsName: 'Nhật ký hoạt động (Audit Log)',
      Path: '/system/audit-logs',
      FunctionUrl: '/system/audit-logs',
      Icon: 'history',
      Flag: 1,
      OrderId: 4,
      OnMenu: 1,
      IsSystem: 0,
      Help: 'Theo dõi lịch sử đăng nhập, tác động thêm sửa xóa dữ liệu',
      Adds: 0,
      Del: 0,
      Edit: 0,
      Res: 1,
      Level: 2,
      ListFunc: null,
    },
  ];

  // ── 3. MOCK ROLE USERS DATA ──────────────────────────────────────────
  private mockRoleUsers: Record<string, RoleAssignedUser[]> = {
    '1': [
      { id: 'USR001', username: 'admin', fullName: 'Nguyễn Văn Quản Trị', email: 'admin@utt.edu.vn', department: 'Phòng CNTT & TT', assignedAt: '2025-01-10 08:00' },
      { id: 'USR005', username: 'duyduc.admin', fullName: 'Đỗ Duy Đức', email: 'ducdd@utt.edu.vn', department: 'Ban Giám Hiệu', assignedAt: '2025-02-15 10:30' },
      { id: 'USR007', username: 'thang.sys', fullName: 'Vũ Quốc Thắng', email: 'thangvq@utt.edu.vn', department: 'Phòng CNTT & TT', assignedAt: '2025-05-20 14:15' },
    ],
    '2': [
      { id: 'USR010', username: 'hoang.kho', fullName: 'Phạm Huy Hoàng', email: 'hoangph@utt.edu.vn', department: 'Phòng Quản trị Thiết bị & Kho', assignedAt: '2025-01-15 09:30' },
      { id: 'USR011', username: 'tuan.kho', fullName: 'Trần Anh Tuấn', email: 'tuanta@utt.edu.vn', department: 'Phòng Quản trị Thiết bị & Kho', assignedAt: '2025-03-01 11:00' },
      { id: 'USR012', username: 'dung.kho', fullName: 'Ngô Việt Dũng', email: 'dungnv@utt.edu.vn', department: 'Phòng Quản trị Thiết bị & Kho', assignedAt: '2025-04-10 14:20' },
      { id: 'USR013', username: 'thinh.kho', fullName: 'Bùi Đức Thịnh', email: 'thinhbd@utt.edu.vn', department: 'Kho Vật tư Tổng hợp', assignedAt: '2025-06-05 08:45' },
    ],
    '3': [
      { id: 'USR014', username: 'hai.nkho', fullName: 'Lê Văn Hải', email: 'hailv@utt.edu.vn', department: 'Kho Vật tư Tổng hợp', assignedAt: '2025-02-01 10:00' },
      { id: 'USR015', username: 'nam.nkho', fullName: 'Nguyễn Thành Nam', email: 'namnt@utt.edu.vn', department: 'Kho Thiết bị Điện tử', assignedAt: '2025-02-15 11:30' },
      { id: 'USR016', username: 'anh.nkho', fullName: 'Đặng Ngọc Ánh', email: 'anhdn@utt.edu.vn', department: 'Kho Thiết bị Điện tử', assignedAt: '2025-03-12 14:00' },
      { id: 'USR017', username: 'phuc.nkho', fullName: 'Hoàng Văn Phúc', email: 'phuchv@utt.edu.vn', department: 'Kho Dụng cụ & Hóa chất', assignedAt: '2025-04-20 09:15' },
      { id: 'USR018', username: 'loc.nkho', fullName: 'Vũ Tấn Lộc', email: 'locvt@utt.edu.vn', department: 'Kho Dụng cụ & Hóa chất', assignedAt: '2025-05-18 16:30' },
      { id: 'USR019', username: 'tri.nkho', fullName: 'Phan Minh Trí', email: 'tripm@utt.edu.vn', department: 'Kho Vật tư Tổng hợp', assignedAt: '2025-07-01 08:30' },
    ],
    '4': [
      { id: 'USR020', username: 'van.staff', fullName: 'Nguyễn Bích Vân', email: 'vannb@utt.edu.vn', department: 'Văn phòng Trường', assignedAt: '2025-02-10 14:00' },
      { id: 'USR021', username: 'hoa.staff', fullName: 'Trịnh Mai Hoa', email: 'hoatm@utt.edu.vn', department: 'Phòng Đào tạo', assignedAt: '2025-02-12 09:30' },
      { id: 'USR022', username: 'quan.staff', fullName: 'Lê Minh Quân', email: 'quanlm@utt.edu.vn', department: 'Phòng Tổ chức Cán bộ', assignedAt: '2025-03-01 10:45' },
      { id: 'USR023', username: 'lan.staff', fullName: 'Phạm Quỳnh Lan', email: 'lanpq@utt.edu.vn', department: 'Khoa Công nghệ Thông tin', assignedAt: '2025-03-15 15:20' },
    ],
    '5': [
      { id: 'USR002', username: 'leha.kt', fullName: 'Lê Thu Hà', email: 'leha.kt@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-01-15 09:30' },
      { id: 'USR008', username: 'huong.ktt', fullName: 'Phạm Thị Thu Hương', email: 'huongpt@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-03-01 11:00' },
    ],
    '6': [
      { id: 'USR003', username: 'minh.acc', fullName: 'Trần Quang Minh', email: 'minhtq@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-02-01 10:00' },
      { id: 'USR004', username: 'yen.acc', fullName: 'Hoàng Hải Yến', email: 'yenhh@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-02-10 14:20' },
      { id: 'USR009', username: 'phuong.acc', fullName: 'Đỗ Mai Phương', email: 'phuongdm@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-04-05 08:30' },
    ],
  };

  // ── 4. ROLE SERVICE METHODS ───────────────────────────────────────────

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

  // ── 5. PERMISSION MANAGEMENT METHODS (100% PURE MOCK) ─────────────────
  private rolePermissionsCache: Record<number, FunctionPermission[]> = {};

  getFunctionPermissions(applicationId: number = 17, groupId: number = 0): Observable<PermissionApiResponse<FunctionPermission[]>> {
    // Pure mock - Không gọi API backend
    if (!this.rolePermissionsCache[groupId]) {
      const clonedTree = JSON.parse(JSON.stringify(this.mockFunctionPermissions)) as FunctionPermission[];

      if (groupId === 1) {
        // ADMIN: Full permissions
        clonedTree.forEach(f => {
          f.Flag = 1;
          f.Adds = 1;
          f.Edit = 1;
          f.Del = 1;
          f.Res = 1;
        });
      } else if (groupId === 2) {
        // WAREHOUSE_MGR: Full access to Dashboard & Inventory, View Purchasing
        clonedTree.forEach(f => {
          if (f.FunctionsId === 1000 || f.FunctionsId === 1002 || f.ParentId === 2000 || f.FunctionsId === 2000) {
            f.Flag = 1; f.Adds = 1; f.Edit = 1; f.Del = 1; f.Res = 1;
          } else if (f.FunctionsId === 3000 || f.ParentId === 3000) {
            f.Flag = 1; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 1;
          } else {
            f.Flag = 0; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 0;
          }
        });
      } else if (groupId === 3) {
        // WAREHOUSE_STAFF: Inbound/Outbound/Transfer/Audit operations
        clonedTree.forEach(f => {
          if ([2000, 2001, 2003, 2004, 2005, 2006, 2007].includes(f.FunctionsId)) {
            f.Flag = 1;
            f.Adds = [2003, 2004, 2005].includes(f.FunctionsId) ? 1 : 0;
            f.Edit = [2003, 2004].includes(f.FunctionsId) ? 1 : 0;
            f.Del = 0;
            f.Res = 1;
          } else {
            f.Flag = 0; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 0;
          }
        });
      } else if (groupId === 4) {
        // STAFF: Dashboard & Purchasing Requisitions & HRM Profile
        clonedTree.forEach(f => {
          if ([1000, 1001, 3000, 3002, 6000, 6001].includes(f.FunctionsId)) {
            f.Flag = 1;
            f.Adds = f.FunctionsId === 3002 ? 1 : 0;
            f.Edit = 0;
            f.Del = 0;
            f.Res = 1;
          } else {
            f.Flag = 0; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 0;
          }
        });
      } else if (groupId === 5 || groupId === 6) {
        // ACCOUNTANTS: Full Finance + Sales Invoices + Purchasing Reports
        clonedTree.forEach(f => {
          if (f.FunctionsId === 5000 || f.ParentId === 5000 || f.FunctionsId === 4004 || f.FunctionsId === 1003) {
            f.Flag = 1; f.Adds = 1; f.Edit = 1; f.Del = groupId === 5 ? 1 : 0; f.Res = 1;
          } else if ([1000, 2000, 2007, 3000, 3005, 4000].includes(f.FunctionsId)) {
            f.Flag = 1; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 1;
          } else {
            f.Flag = 0; f.Adds = 0; f.Edit = 0; f.Del = 0; f.Res = 0;
          }
        });
      }

      this.rolePermissionsCache[groupId] = clonedTree;
    }

    const data = JSON.parse(JSON.stringify(this.rolePermissionsCache[groupId])) as FunctionPermission[];

    return of({
      Data: data,
      Message: 'Success (Mock)',
      Success: true,
      Pager: null,
      Id: groupId,
    });
  }

  updateFunctionPermissions(donViSuDungId: number, groupId: number, permissions: UpdatePermissionPayload[]): Observable<any> {
    // Pure mock - Lưu lại thay đổi quyền vào bộ nhớ
    if (this.rolePermissionsCache[groupId]) {
      permissions.forEach(p => {
        const target = this.rolePermissionsCache[groupId].find(f => f.FunctionsId === p.FunctionsId);
        if (target) {
          target.Flag = p.Flag;
          target.Adds = p.Adds;
          target.Edit = p.Edit;
          target.Del = p.Del;
          target.Res = p.Res;
        }
      });
    }

    return of({ Success: true, Message: 'Lưu phân quyền thành công! (Mock)' });
  }

  getAssignedUsers(roleId: string): Observable<RoleAssignedUser[]> {
    const list = this.mockRoleUsers[roleId] || [
      { id: 'USR001', username: 'admin', fullName: 'Nguyễn Văn Quản Trị', email: 'admin@utt.edu.vn', department: 'Phòng CNTT & TT', assignedAt: '2025-01-10 08:00' },
      { id: 'USR003', username: 'minh.acc', fullName: 'Trần Quang Minh', email: 'minhtq@utt.edu.vn', department: 'Phòng Tài chính - Kế toán', assignedAt: '2025-02-01 10:00' },
    ];
    return of(list);
  }
}
