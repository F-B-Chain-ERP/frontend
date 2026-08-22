import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzIconModule} from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-selection-bar',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './app-selection-bar.component.html',
  styleUrls: ['./app-selection-bar.component.scss'],
})
export class AppSelectionBarComponent {
  @Input() selectedCount = 0;
  @Input() totalCount?: number;
  @Input() itemLabel = 'bản ghi';
  @Input() showClear = true;
  @Input() clearText = 'Bỏ chọn';

  @Output() clearSelection = new EventEmitter<void>();
}
