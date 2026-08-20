import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error.component.html',
  standalone: true,
})
export class ErrorComponent implements OnInit {
  readonly errorMessage = signal<string | undefined>(undefined);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.data.subscribe(routeData => {
      if (routeData['errorMessage']) {
        this.errorMessage.set(routeData['errorMessage'] as string);
      }
    });
  }
}
export default ErrorComponent;
