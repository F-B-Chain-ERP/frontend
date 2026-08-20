import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { Account } from './account.model';
import { StateStorageService } from './state-storage.service';
import { ApplicationConfigService } from '../config/application-config.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly userIdentity = signal<Account | null>(null);
  readonly account = this.userIdentity.asReadonly();
  private accountCache$?: Observable<Account> | null;

  private readonly http = inject(HttpClient);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly router = inject(Router);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  save(account: Account): Observable<object> {
    return this.http.post(this.applicationConfigService.getEndpointFor('api/account'), account);
  }

  authenticate(identity: Account | null): void {
    this.userIdentity.set(identity);
    if (!identity) {
      this.accountCache$ = null;
      this.stateStorageService.clearAccount();
    } else {
      this.stateStorageService.storeAccount(identity);
    }
  }

  hasAnyAuthority(authorities: string[] | string): boolean {
    const userIdentity = this.userIdentity();
    if (!userIdentity) {
      return false;
    }
    if (userIdentity.authorities.includes('FULL_PERMISSION')) {
      return true;
    }
    if (!Array.isArray(authorities)) {
      authorities = [authorities];
    }
    return userIdentity.authorities.some((authority: string) => (authorities as string[]).includes(authority));
  }

  identity(_force?: boolean): Observable<Account | null> {
    const stored = this.stateStorageService.getAccount();
    if (stored) {
      this.userIdentity.set(stored);
      this.navigateToStoredUrl();
      return of(stored);
    }

    this.userIdentity.set(null);
    return of(null);
  }

  isAuthenticated(): boolean {
    return this.userIdentity() !== null;
  }

  private fetch(): Observable<Account> {
    return this.http.get<Account>(this.applicationConfigService.getEndpointFor('api/account'));
  }

  private navigateToStoredUrl(): void {
    const previousUrl = this.stateStorageService.getUrl();
    if (previousUrl) {
      this.stateStorageService.clearUrl();
      this.router.navigateByUrl(previousUrl);
    }
  }
}
