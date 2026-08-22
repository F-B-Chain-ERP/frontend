export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
  organizationId?: string | number | null;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface ApiResponse<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

export interface BackendAccount {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  authProvider: string;
  hasLocalPassword: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  account: BackendAccount;
  requiresScopeAssignment: boolean;
}

export type LoginError =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DELETED'
  | 'UNKNOWN'
  | 'NO_ORGANIZATION';

export class LoginException extends Error {
  constructor(
    public readonly type: LoginError,
    public override readonly message: string = '',
  ) {
    super(type);
  }
}
