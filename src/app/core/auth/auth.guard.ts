import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AccountService } from './account.service';

export const AUTH_KEY = 'app_authenticated';

export const AuthGuard: CanActivateFn = () => {
  const accountService = inject(AccountService);
  const router = inject(Router);

  return accountService.identity().pipe(
    map(account => {
      if (account) return true;
      router.navigate(['/login']);
      return false;
    }),
  );
};
