import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { NzTagComponent } from 'ng-zorro-antd/tag';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-overflow-tags',
  templateUrl: './app-overflow-tags.component.html',
  styleUrl: './app-overflow-tags.component.scss',
  imports: [NzTagComponent, NzTooltipDirective],
  standalone: true,
})
export class AppOverflowTagsComponent implements AfterViewInit, OnChanges {
  @Input() items: string[] = [];
  @Input() separator = ', ';

  @ViewChild('container') private containerRef!: ElementRef<HTMLElement>;
  @ViewChild('extraProbe', { read: ElementRef }) private extraProbeRef?: ElementRef<HTMLElement>;
  @ViewChildren('measureTag', { read: ElementRef }) private measureTagRefs!: QueryList<ElementRef<HTMLElement>>;

  protected visibleCount = signal(Number.MAX_SAFE_INTEGER);

  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private resizeObserver?: ResizeObserver;

  protected get visibleItems(): string[] {
    return this.items.slice(0, this.visibleCount());
  }

  protected get extraItems(): string[] {
    return this.items.slice(this.visibleCount());
  }

  protected get extraTooltip(): string {
    return this.extraItems.join(this.separator);
  }

  ngAfterViewInit(): void {
    this.recompute();

    this.resizeObserver = new ResizeObserver(() => this.ngZone.run(() => this.recompute()));
    this.resizeObserver.observe(this.containerRef.nativeElement);
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      queueMicrotask(() => this.recompute());
    }
  }

  private recompute(): void {
    const container = this.containerRef?.nativeElement;
    const total = this.items.length;
    const tagEls = this.measureTagRefs?.toArray().map(ref => ref.nativeElement) ?? [];
    if (!container || tagEls.length !== total) {
      return;
    }

    const containerWidth = container.clientWidth;
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const extraWidth = this.extraProbeRef ? this.extraProbeRef.nativeElement.offsetWidth : 0;

    const cumulativeWidth: number[] = [0];
    tagEls.forEach((el, i) => {
      cumulativeWidth.push(cumulativeWidth[i] + el.offsetWidth + (i > 0 ? gap : 0));
    });

    let visible = total;
    if (cumulativeWidth[total] > containerWidth) {
      visible = total - 1;
      while (visible > 0 && cumulativeWidth[visible] + gap + extraWidth > containerWidth) {
        visible--;
      }
    }

    this.visibleCount.set(visible);
  }
}
