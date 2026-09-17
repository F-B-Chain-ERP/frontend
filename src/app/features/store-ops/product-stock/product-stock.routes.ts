import {Routes} from '@angular/router';
import {StoreProductStockListComponent} from './product-stock-list.component';

export default [
  {
    path: '',
    component: StoreProductStockListComponent,
    title: 'Tồn sản phẩm mở bán',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
