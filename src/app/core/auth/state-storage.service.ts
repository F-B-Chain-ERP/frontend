import { Injectable } from '@angular/core';
import { Account } from './account.model';

@Injectable({ providedIn: 'root' })
export class StateStorageService {
  private readonly previousUrlKey = 'previousUrl';
  private readonly authenticationKey = 'app_auth_token';
  private readonly accountKey = 'app_account';

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

  clearAuthenticationToken(): void {
    sessionStorage.removeItem(this.authenticationKey);
    localStorage.removeItem(this.authenticationKey);
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
  }
}
