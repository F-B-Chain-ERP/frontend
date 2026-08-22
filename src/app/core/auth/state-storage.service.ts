import {Injectable} from '@angular/core';
import {Account} from './account.model';

@Injectable({providedIn: 'root'})
export class StateStorageService {
  private readonly previousUrlKey = 'previousUrl';
  private readonly authenticationKey = 'app_auth_token';
  private readonly refreshTokenKey = 'app_refresh_token';
  private readonly accountKey = 'app_account';

  constructor() {
    this.clearLegacyKeys();
  }

  /**
   * Tự động dọn dẹp các key cũ/dư thừa từ các dự án khác (HCSN, WHS, JHI, v.v.)
   * nếu trình duyệt đang lưu chung origin localhost.
   */
  clearLegacyKeys(): void {
    const legacyPrefixes = ['hcsn', 'whs', 'jhi'];
    try {
      if (typeof localStorage !== 'undefined') {
        const localKeysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && legacyPrefixes.some(prefix => key.toLowerCase().startsWith(prefix))) {
            localKeysToRemove.push(key);
          }
        }
        for (const key of localKeysToRemove) {
          localStorage.removeItem(key);
        }
      }

      if (typeof sessionStorage !== 'undefined') {
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && legacyPrefixes.some(prefix => key.toLowerCase().startsWith(prefix))) {
            sessionKeysToRemove.push(key);
          }
        }
        for (const key of sessionKeysToRemove) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Bỏ qua lỗi trong môi trường không hỗ trợ storage
    }
  }

  storeUrl(url: string): void {
    sessionStorage.setItem(this.previousUrlKey, JSON.stringify(url));
  }

  getUrl(): string | null {
    const previousUrl = sessionStorage.getItem(this.previousUrlKey);
    return previousUrl ? (JSON.parse(previousUrl) as string | null) : previousUrl;
  }

  clearUrl(): void {
    sessionStorage.removeItem(this.previousUrlKey);
  }

  storeAuthenticationToken(authenticationToken: string, rememberMe: boolean): void {
    const token = JSON.stringify(authenticationToken);
    this.clearAuthenticationToken();
    if (rememberMe) {
      localStorage.setItem(this.authenticationKey, token);
    } else {
      sessionStorage.setItem(this.authenticationKey, token);
    }
  }

  getAuthenticationToken(): string | null {
    const authenticationToken = localStorage.getItem(this.authenticationKey) ?? sessionStorage.getItem(this.authenticationKey);
    return authenticationToken ? (JSON.parse(authenticationToken) as string | null) : authenticationToken;
  }

  storeRefreshToken(refreshToken: string, rememberMe: boolean): void {
    const token = JSON.stringify(refreshToken);
    this.clearRefreshToken();
    if (rememberMe) {
      localStorage.setItem(this.refreshTokenKey, token);
    } else {
      sessionStorage.setItem(this.refreshTokenKey, token);
    }
  }

  getRefreshToken(): string | null {
    const refreshToken = localStorage.getItem(this.refreshTokenKey) ?? sessionStorage.getItem(this.refreshTokenKey);
    return refreshToken ? (JSON.parse(refreshToken) as string | null) : refreshToken;
  }

  clearRefreshToken(): void {
    sessionStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  clearAuthenticationToken(): void {
    sessionStorage.removeItem(this.authenticationKey);
    localStorage.removeItem(this.authenticationKey);
    this.clearRefreshToken();
    this.clearLegacyKeys();
  }

  storeAccount(account: Account): void {
    const data = JSON.stringify(account);
    if (localStorage.getItem(this.authenticationKey)) {
      localStorage.setItem(this.accountKey, data);
    } else {
      sessionStorage.setItem(this.accountKey, data);
    }
  }

  getAccount(): Account | null {
    const raw = localStorage.getItem(this.accountKey) ?? sessionStorage.getItem(this.accountKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Account;
    } catch {
      return null;
    }
  }

  clearAccount(): void {
    sessionStorage.removeItem(this.accountKey);
    localStorage.removeItem(this.accountKey);
    this.clearLegacyKeys();
  }
}
