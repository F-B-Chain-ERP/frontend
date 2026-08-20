import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AppModalService } from '../../shared/app-modal/app-modal.service';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
  getLeaveMessage?(): string;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = async component => {
  if (component.canDeactivate()) {
    return true;
  }

  const modal = inject(AppModalService);
  return modal.confirmLeave(component.getLeaveMessage?.());
};
