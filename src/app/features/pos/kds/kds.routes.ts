import { Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/auth/user-route-access.service';
import { ROLE } from '../../../core/config/functions.constants';

export const KDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./kds-board.component'),
    title: 'Bếp (KDS)',
    canActivate: [UserRouteAccessService],
    data: { authorities: [ROLE.KDS_TICKET.VIEW] },
  },
];

export default KDS_ROUTES;
