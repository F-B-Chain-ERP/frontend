import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NzPaginationComponent} from 'ng-zorro-antd/pagination';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {FormsModule} from '@angular/forms';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_TOTAL_PAGE
} from '../constants/constant';

@Component({
  selector: 'app-pagination',
  templateUrl: './app-pagination.component.html',
  styleUrl: './app-pagination.component.scss',
  imports: [NzPaginationComponent, NzSelectModule, FormsModule],
  standalone: true,
})
export class AppPaginationComponent {
  @Input() total = DEFAULT_TOTAL_PAGE;

  @Input() pageIndex = DEFAULT_PAGE_INDEX;
  @Output() pageIndexChange = new EventEmitter<number>();

  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Output() pageSizeChange = new EventEmitter<number>();

  @Input() pageSizeOptions: number[] = DEFAULT_PAGE_SIZE_OPTIONS;

  get rangeFrom(): number {
    if (this.total === 0) return 0;
    return (this.pageIndex - 1) * this.pageSize + 1;
  }

  get rangeTo(): number {
    return Math.min(this.pageIndex * this.pageSize, this.total);
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.pageIndexChange.emit(index);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.pageSizeChange.emit(size);
    this.pageIndexChange.emit(1);
  }
}
