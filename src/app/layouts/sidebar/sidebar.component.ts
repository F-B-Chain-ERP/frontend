import {NgTemplateOutlet} from '@angular/common';
import {Component, computed, effect, inject, OnInit, signal, untracked} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {SIDEBAR_MENU} from './sidebar.constant';
import {SidebarChild, SidebarGroup, SidebarParent} from './sidebar.model';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {LayoutService} from '../service/layout.service';
import {AccountService} from '../../core/auth/account.service';
import {NzTooltipDirective} from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [NgTemplateOutlet, NzIconDirective, NzTooltipDirective],
  standalone: true,
})
export class SidebarComponent implements OnInit {
  private readonly layoutService = inject(LayoutService);
  private readonly accountService = inject(AccountService);

  protected readonly collapsed = this.layoutService.sidebarCollapsed;

  protected readonly filteredMenu = computed(() => {
    this.accountService.account();
    return SIDEBAR_MENU.map(group => ({
      ...group,
      items: group.items
        .filter(parent => {
          if (parent.authorities?.length && !this.accountService.hasAnyAuthority(parent.authorities)) {
            return false;
          }
          return true;
        })
        .map(parent => {
          const originalChildCount = parent.children?.length ?? 0;
          const visibleChildren = this.filterChildrenRecursive(parent.children ?? []);
          return {
            ...parent,
            children: visibleChildren,
            _hadChildren: originalChildCount > 0,
          };
        })
        .filter(parent => {
          if (!parent._hadChildren) return true;
          return parent.children.length > 0;
        }),
    })).filter(group => group.items.length > 0);
  });

  private readonly openParents = signal<Set<string>>(new Set());
  private readonly activeRoute = signal<string>('');

  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.collapsed()) {
        this.openParents.set(new Set());
      } else {
        untracked(() => this.autoOpenParents(this.activeRoute()));
      }
    });
  }

  ngOnInit(): void {
    this.activeRoute.set(this.router.url);
    this.autoOpenParents(this.router.url);

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: NavigationEnd) => {
      this.activeRoute.set(e.urlAfterRedirects);
      this.autoOpenParents(e.urlAfterRedirects);
    });
  }

  private filterChildrenRecursive(children: SidebarChild[]): SidebarChild[] {
    return children
      .map(child => ({
        ...child,
        children: child.children ? this.filterChildrenRecursive(child.children) : undefined,
      }))
      .filter(child => {
        if (child.authorities?.length && !this.accountService.hasAnyAuthority(child.authorities)) {
          return false;
        }
        const isEmptySubmenu = child.children !== undefined && child.children.length === 0;
        return !isEmptySubmenu || !!child.route;
      });
  }

  private matchesUrl(node: SidebarChild, url: string): boolean {
    const ownMatch = node.route ? url.startsWith(node.activePrefix ?? node.route) : false;
    const descendantMatch = !!node.children?.some(child => this.matchesUrl(child, url));
    return ownMatch || descendantMatch;
  }

  private collectOpenIds(children: SidebarChild[], url: string, open: Set<string>): void {
    for (const child of children) {
      if (child.children?.length) {
        if (this.matchesUrl(child, url)) {
          open.add(child.id);
        }
        this.collectOpenIds(child.children, url, open);
      }
    }
  }

  private autoOpenParents(url: string): void {
    const open = new Set<string>();
    for (const group of SIDEBAR_MENU) {
      for (const parent of group.items) {
        const children = parent.children ?? [];
        if (children.some(child => this.matchesUrl(child, url))) {
          open.add(parent.id);
        }
        this.collectOpenIds(children, url, open);
      }
    }
    this.openParents.set(open);
  }

  protected handleNavigation(route: string) {
    this.router.navigate([route]);
  }

  protected onParentClick(id: string, route?: string): void {
    this.toggleParent(id);
    if (route !== undefined) {
      this.handleNavigation(route);
    }
  }

  protected onChildClick(node: SidebarChild): void {
    if (node.children?.length) {
      this.toggleNode(node.id);
    }
    if (node.route) {
      this.handleNavigation(node.route);
    }
  }

  protected toggleParent(id: string): void {
    const open = new Set(this.openParents());
    if (open.has(id)) {
      open.delete(id);
    } else {
      for (const group of SIDEBAR_MENU) {
        for (const parent of group.items) {
          if (parent.id !== id && !parent.children?.some((child: SidebarChild) => this.isChildActive(child))) {
            open.delete(parent.id);
          }
        }
      }
      open.add(id);
      const parentItem = SIDEBAR_MENU.flatMap((g: SidebarGroup) => g.items).find((p: SidebarParent) => p.id === id);
      if (parentItem?.children?.length) {
        this.layoutService.setSidebarCollapsed(false);
      }
    }
    this.openParents.set(open);
  }

  protected toggleNode(id: string): void {
    const open = new Set(this.openParents());
    if (open.has(id)) {
      open.delete(id);
    } else {
      open.add(id);
    }
    this.openParents.set(open);
  }

  protected isParentOpen(id: string): boolean {
    return this.openParents().has(id);
  }

  protected isChildActive(child: SidebarChild): boolean {
    const ownMatch = child.route ? this.activeRoute().startsWith(child.activePrefix ?? child.route) : false;
    const descendantMatch = !!child.children?.some(c => this.isChildActive(c));
    return ownMatch || descendantMatch;
  }

  protected isParentActive(parent: SidebarParent): boolean {
    const routeMatch = parent.route !== undefined && this.activeRoute().startsWith(parent.route);
    const childMatch = !!parent.children?.some(child => this.isChildActive(child));
    return routeMatch || childMatch;
  }
}
