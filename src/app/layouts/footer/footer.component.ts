import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
})
export class FooterComponent {
  private readonly router = inject(Router);

  goToSupport(): void {
    this.router.navigate(['/tro-giup/ho-tro']);
  }

  goToContact(): void {
    this.router.navigate(['/tro-giup/lien-he']);
  }

  goToAbout(): void {
    this.router.navigate(['/quy-trinh-su-dung']);
  }
}
export default FooterComponent;
