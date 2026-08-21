import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { AppButtonComponent } from '../../shared/app-button/app-button.component';

@Component({
  selector: 'app-error-pages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-pages.component.html',
  styleUrls: ['./error-pages.component.scss'],
  imports: [NzIconDirective, AppButtonComponent],
  standalone: true,
})
export class ErrorPagesComponent {
  private readonly router = inject(Router);

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
export default ErrorPagesComponent;
