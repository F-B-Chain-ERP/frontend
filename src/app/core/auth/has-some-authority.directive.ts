import {Directive, inject, Input, TemplateRef, ViewContainerRef} from '@angular/core';
import {AccountService} from './account.service';

/**
 * Structural directive that conditionally renders an element based on the
 * current user's authorities.
 *
 * Usage:
 *   <button *erpUTTHasSomeAuthority="[ROLE.DANH_MUC_TAI_KHOAN.ADD]">Thêm</button>
 *   <button *erpUTTHasSomeAuthority="[ROLE.DANH_MUC_TAI_KHOAN.EDIT, isAdmin]">Sửa</button>
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

  @Input('erpUTTHasSomeAuthority')
  set erpUTTHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.updateView(value);
  }

  @Input('erpUTTHasAuthority')
  set erpUTTHasAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.updateView(value);
  }

  @Input('appHasSomeAuthority')
  set appHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.updateView(value);
  }

  @Input('ebHasSomeAuthority')
  set ebHasSomeAuthority(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined) {
    this.updateView(value);
  }

  private updateView(value: Array<string | boolean | null | undefined> | string | boolean | null | undefined): void {
    const list = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
    const authorities = list.filter((v): v is string => typeof v === 'string');
    const override = list.some(v => v === true);

    this.vcr.clear();
    if (override || this.accountService.hasAnyAuthority(authorities)) {
      this.vcr.createEmbeddedView(this.templateRef);
    }
  }
}
