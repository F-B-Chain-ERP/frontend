import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { NzDatePickerComponent, NzRangePickerComponent } from 'ng-zorro-antd/date-picker';

@Component({
  selector: 'app-table-search-input',
  templateUrl: './app-table-search-input.component.html',
  imports: [FormsModule, NzIconModule, NzInputModule, NzSelectComponent, NzOptionComponent, NzDatePickerComponent, NzRangePickerComponent],
  standalone: true,
})
export class AppTableSearchInputComponent {
  @Input() value: unknown = '';
  @Output() valueChange = new EventEmitter<unknown>();

  @Input() placeholder = '';
  @Input() type: 'text' | 'option' | 'date' = 'text';

  @Input() options: any[] = [];
  @Input() labelField = 'label';
  @Input() valueField = 'value';

  onValueChange(value: unknown): void {
    this.value = value;
    this.valueChange.emit(this.value);
  }
}
