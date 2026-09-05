import { Routes } from '@angular/router';
import { BomListComponent } from './bom-list.component';

export default [
  {
    path: '',
    component: BomListComponent,
    title: 'Định lượng (BOM) & Food Cost',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
