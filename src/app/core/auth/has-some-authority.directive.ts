import {Directive, effect, inject, Input, signal, TemplateRef, ViewContainerRef} from '@angular/core';
import {AccountService} from './account.service';

/**
 * Structural directive that conditionally renders an element based on the
 * current user's authorities.
 *
 * Usage:
 *   <button *erpUTTHasSomeAuthority="[ROLE.DANH_MUC_TAI_KHOAN.CREATE]">Thêm</button>
 *   <button *erpUTTHasSomeAuthority="[ROLE.DANH_MUC_TAI_KHOAN.UPDATE, isAdmin]">Sửa</button>
 *
 * Pass `true` in the array to force-show regardless of authorities (e.g. for
 * local boolean checks). Null/undefined values are ignored.
 */
@Directive({
  selector: '[erpUTTHasSomeAuthority], [erpUTTHasAuthority], [appHasSomeAuthority], [ebHasSomeAuthority]',
  standalone: true,
})
export class HasSomeAuthorityDirective {
  private readonly accountService = inject(AccountService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  private readonly authoritiesInput = signal<Array<string | boolean | null | undefined> | string | boolean | null | undefined>(undefined);

  constructor() {
    effect(() => {
      this.accountService.account();
      this.updateView(this.authoritiesInput());
    });
  }

  @Input('erpUTTHasSomeAuthority')
  set erpUTTHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.authoritiesInput.set(value);
  }

  @Input('erpUTTHasAuthority')
  set erpUTTHasAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.authoritiesInput.set(value);
  }

  @Input('appHasSomeAuthority')
  set appHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.authoritiesInput.set(value);
  }

  @Input('ebHasSomeAuthority')
  set ebHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.authoritiesInput.set(value);
  }

  private updateView(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined): void {
    const list = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
    const authorities = list.filter((v): v is string => typeof v === 'string');
    const override = list.some(v => v === true);

    this.vcr.clear();
    if (override || (authorities.length > 0 && this.accountService.hasAnyAuthority(authorities))) {
      this.vcr.createEmbeddedView(this.templateRef);
    }
  }
}
