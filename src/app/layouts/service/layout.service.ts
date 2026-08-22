import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  public readonly sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }
}
