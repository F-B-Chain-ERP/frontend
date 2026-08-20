export interface Organization {
  UserId: number | string;
  OrganizationId: number | string;
  OrganizationName: string;
}

export class Login {
  constructor(
    public username: string,
    public password: string,
    public rememberMe: boolean,
    public organizationId?: string | number | null,
  ) {}
}

export interface SandboxLoginPager {
  PageIndex?: number;
  PageSize?: number;
  TotalRow?: number;
  [key: string]: unknown;
}

export interface SandboxLoginResponse {
  Id: number | string;
  EncryptId: string;
  UserName: string;
  FullName: string;
  Description?: string;
  Avatar?: string;
  Email?: string;
  Mobile?: string;
  IsFullPermission?: boolean;
  StatusId?: number;
  Address?: string;
  Sex?: number;
  Birthday?: string;
  BirthdayPicker?: string;
  RoleId?: number | string;
  RolesId?: number | string;
  RoleCode?: string;
  Temp?: string;
  TenVaiTro?: string;
  DonViTrucThuocId?: number | string;
  DonViTrucThuocIds?: Array<number | string>;
  TenDonViTrucThuoc?: string;
  DoiTuongId?: number | string;
  ApplicationId?: number;
  PermissionCount?: number;
  CreateDate?: string;
  ModifiedDate?: string;
  LastLoginDate?: string;
  LastChangePass?: string;
  IsSystem?: boolean;
  IsBlacklist?: boolean;
  RowNum?: number;
  DonViSuDungId?: number;
  CustomerParentId?: number | string;
  CustomerNameParent?: string;
  CustomerName?: string;
  CustomerCode?: string;
  CustomerType?: number | string;
  NewPassword?: string;
  IsPaid?: boolean;
  IsSuDungDangPhi?: boolean;
  SLChungTu?: number;
  SLDangPhi?: number;
  SLTaiSan?: number;
  UseOrganizationList: Organization[];
  Pager?: SandboxLoginPager;
  Success: boolean;
  Message?: string;
}

export interface SandboxLoginRequest {
  UserName: string;
  Password: string;
  ApplicationId: number;
}

export interface AuthenticateRequest {
  Id: number | string;
  EncryptId: string;
  UserName: string;
  FullName: string;
  Email?: string;
  DonViSuDungId: number | string;
  DonViTrucThuocId: number | string;
  DonViTrucThuocIds?: string;
  RolesCode?: string;
  RolesId?: number | string;
  IsFullPermission?: number | boolean;
  IsBlacklist?: boolean;
  StatusId?: number;
  ApplicationId?: number;
}

export interface LoginApiResponse {
  Data: SandboxLoginResponse | null;
  Message: string;
  Code: string;
  Success: boolean;
}

export interface AuthenticateResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
}

export type LoginError = 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DELETED' | 'UNKNOWN' | 'NO_ORGANIZATION';

export class LoginException extends Error {
  constructor(
    public readonly type: LoginError,
    public override readonly message: string = '',
  ) {
    super(type);
  }
}
