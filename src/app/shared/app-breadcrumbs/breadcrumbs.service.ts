import {Injectable, inject, signal} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';

export interface BreadcrumbItem {
  label: string;
  url: string;
  icon?: string;
}

@Injectable({providedIn: 'root'})
export class BreadcrumbsService {
  private readonly router = inject(Router);

  readonly breadcrumbs = signal<BreadcrumbItem[]>([]);

  constructor() {
    this.build();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.build());
  }

  set(items: BreadcrumbItem[]): void {
    this.breadcrumbs.set(items);
  }

  private build(): void {
    const crumbs: BreadcrumbItem[] = [];
    let url = '';
    let route = this.router.routerState.snapshot.root;

    while (route) {
      const segment = route.url.map(s => s.path).join('/');
      if (segment) url += `/${segment}`;

      const label: string = route.data['breadcrumb'] ?? route.title ?? '';
      if (label) {
        crumbs.push({label, url: url || '/', icon: route.data['breadcrumbIcon']});
      }

      route = route.children[0];
    }

    this.breadcrumbs.set(crumbs);
  }
}
