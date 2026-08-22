import {Injectable} from '@angular/core';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

@Injectable()
export class AppPageTitleStrategy extends TitleStrategy {
  override updateTitle(routerState: RouterStateSnapshot): void {
    let pageTitle = this.buildTitle(routerState);
    pageTitle = pageTitle ? `${pageTitle} - ERP UTT` : 'ERP UTT';
    document.title = pageTitle;
  }
}
