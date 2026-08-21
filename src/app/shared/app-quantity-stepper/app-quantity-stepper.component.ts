import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type StepperSize = 'sm' | 'default' | 'lg';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './app-quantity-stepper.component.html',
  styleUrls: ['./app-quantity-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppQuantityStepperComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;
  @Input() size: StepperSize = 'default';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<number>();
  @Output() reachMin = new EventEmitter<void>();
  @Output() reachMax = new EventEmitter<void>();

  get canDecrease(): boolean {
    return !this.disabled && this.value > this.min;
  }

  get canIncrease(): boolean {
    return !this.disabled && this.value < this.max;
  }

  decrease(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.canDecrease) {
      const nextVal = this.value - 1;
      this.value = nextVal;
      this.valueChange.emit(nextVal);
    } else {
      this.reachMin.emit();
    }
  }

  increase(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.canIncrease) {
      const nextVal = this.value + 1;
      this.value = nextVal;
      this.valueChange.emit(nextVal);
    } else {
      this.reachMax.emit();
    }
  }
}
export default AppQuantityStepperComponent;
