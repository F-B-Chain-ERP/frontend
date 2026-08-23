export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
  organizationId?: string | number | null;
}

export type PrincipalType = 'ACCOUNT' | 'CUSTOMER';

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
  type?: PrincipalType;
}

export interface RegisterCustomerRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  password: string;
  authProvider?: 'LOCAL' | 'GOOGLE' | null;
}

export interface GoogleOAuth2Request {
  idToken: string;
}

export interface VerifyOtpRequest {
  verifyToken: string;
  otp: string;
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

export interface CustomerResponse {
  id: string;
  customerCode: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  authProvider: string;
  hasLocalPassword: boolean;
  emailVerified: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  principalType: PrincipalType;
  customer?: CustomerResponse | null;
  requiresScopeAssignment: boolean;
  requiresEmailVerification: boolean;
  verifyToken?: string | null;
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
