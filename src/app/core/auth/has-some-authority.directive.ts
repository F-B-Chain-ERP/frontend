import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AccountService } from './account.service';

/**
 * Structural directive that conditionally renders an element based on the
 * current user's authorities.
 *
 * Usage:
 *   <button *appHasSomeAuthority="[ROLE.QUAN_LY_NGUOI_DUNG.ADD]">Thêm</button>
 *   <button *appHasSomeAuthority="[ROLE.QUAN_LY_NGUOI_DUNG.EDIT, isAdmin]">Sửa</button>
 */
@Directive({
  selector: '[appHasSomeAuthority]',
  standalone: true,
})
export class HasSomeAuthorityDirective {
  private readonly accountService = inject(AccountService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  @Input()
  set appHasSomeAuthority(value: Array<string | boolean | null | undefined>) {
    const list = value ?? [];
    const authorities = list.filter((v): v is string => typeof v === 'string');
    const override = list.some(v => v === true);

    this.vcr.clear();
    if (override || this.accountService.hasAnyAuthority(authorities)) {
      this.vcr.createEmbeddedView(this.templateRef);
    }
  }
}
