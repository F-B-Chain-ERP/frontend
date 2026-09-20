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

/** Chỉ cho tài khoản nội bộ vào khu vực ERP; customer luôn quay về storefront. */
export const StaffGuard: CanActivateFn = (_route, state) => {
  const accountService = inject(AccountService);
  const stateStorageService = inject(StateStorageService);
  const router = inject(Router);

  return accountService.identity().pipe(
    map(account => {
      if (!account) {
        stateStorageService.storeUrl(state.url);
        return router.createUrlTree(['/login']);
      }
      if (account.principalType === 'CUSTOMER') {
        return router.createUrlTree(['/store']);
      }
      if (stateStorageService.hasPendingScopeAssignment()) {
        return router.createUrlTree(['/select-branch']);
      }
      return true;
    }),
  );
};
