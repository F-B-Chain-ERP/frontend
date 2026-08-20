import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { BreadcrumbsService } from './breadcrumbs.service';

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './app-breadcrumbs.component.html',
  styleUrl: './app-breadcrumbs.component.scss',
  imports: [NzBreadCrumbModule, RouterLink, NzIconDirective],
  standalone: true,
})
export class AppBreadcrumbsComponent {
  readonly breadcrumbs = inject(BreadcrumbsService).breadcrumbs;
}
