import {Component, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {
  NzAutocompleteModule,
  NzAutocompleteOptionComponent,
} from 'ng-zorro-antd/auto-complete';
import {NzInputModule} from 'ng-zorro-antd/input';

import {FlatMenuItem, flattenSidebarMenu, normalizeVi} from './menu-search.util';
import {SIDEBAR_MENU} from '../../layouts/sidebar/sidebar.constant';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {AccountService} from '../../core/auth/account.service';

@Component({
  selector: 'app-menu-search',
  standalone: true,
  imports: [NzAutocompleteModule, NzInputModule, NzIconDirective],
  template: `
    <nz-input-wrapper>
      <input nz-input placeholder="Tìm nhanh chức năng..." [nzAutocomplete]="auto" (input)="onInput($event)"/>
      <nz-icon nzInputSuffix nzType="search"></nz-icon>
    </nz-input-wrapper>

    <nz-autocomplete #auto (selectionChange)="onSelect($event)">
      @for (item of filtered(); track item.id) {
        <nz-auto-option [nzValue]="item" [nzLabel]="item.title">
          <div class="menu-option">
            <span class="menu-option__title">{{ item.title }}</span>
            <span class="menu-option__path">{{ item.breadcrumb }}</span>
          </div>
        </nz-auto-option>
      }

      @if (keyword().trim() && filtered().length === 0) {
        <nz-auto-option nzDisabled [nzValue]="null">
          Không tìm thấy chức năng
        </nz-auto-option>
      }
    </nz-autocomplete>
  `,
  styles: [
    `
      nz-input-wrapper {
        min-width: 300px;
      }

      .menu-option {
        display: flex;
        flex-direction: column;
      }

      .menu-option__title {
        font-weight: 500;
      }

      .menu-option__path {
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
})
export default class MenuSearchComponent {
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);

  private readonly source = signal<FlatMenuItem[]>(flattenSidebarMenu(SIDEBAR_MENU));
  readonly keyword = signal('');

  readonly filtered = computed(() => {
    const kw = normalizeVi(this.keyword());
    if (!kw) {
      return [];
    }

    return this.source().filter(
      i =>
        (!i.authorities?.length || this.accountService.hasAnyAuthority(i.authorities)) &&
        i.searchKey.includes(kw),
    );
  });

  onInput(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
  }

  onSelect(option: NzAutocompleteOptionComponent): void {
    const item = option.nzValue as FlatMenuItem | null;
    if (!item) {
      return;
    }
    this.router.navigateByUrl(item.route).then(() => {
    });
    this.keyword.set('');
  }
}
