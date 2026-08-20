import {
  AfterViewInit,
  Directive,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appModalMaskClick]',
  standalone: true,
})
export class ModalMaskClickDirective implements AfterViewInit, OnDestroy {
  @Input() visible = false;
  @Output() maskClick = new EventEmitter<void>();

  private removeListener?: () => void;

  private observer = new MutationObserver(() => {
    if (!this.visible) {
      this.removeListener?.();
      this.removeListener = undefined;
      return;
    }

    if (this.removeListener) {
      return;
    }

    const wraps = document.querySelectorAll<HTMLElement>('.ant-modal-wrap');
    if (!wraps.length) {
      return;
    }

    const wrap = wraps[wraps.length - 1];
    const listener = (event: MouseEvent) => {
      if (event.target === wrap) {
        this.ngZone.run(() => this.maskClick.emit());
      }
    };

    wrap.addEventListener('click', listener);
    this.removeListener = () => {
      wrap.removeEventListener('click', listener);
    };
  });

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
    this.removeListener?.();
  }
}
