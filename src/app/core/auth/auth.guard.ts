import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {map} from 'rxjs';

import {AccountService} from './account.service';
import {StateStorageService} from './state-storage.service';

export const AUTH_KEY = 'app_authenticated';

export const AuthGuard: CanActivateFn = () => {
  const accountService = inject(AccountService);
  const stateStorageService = inject(StateStorageService);
  const router = inject(Router);

  return accountService.identity().pipe(
    map(account => {
      if (!account) {
        router.navigate(['/login']);
        return false;
      }
      if (stateStorageService.hasPendingScopeAssignment()) {
        router.navigate(['/select-branch']);
        return false;
      }
      return true;
    }),
  );
};
