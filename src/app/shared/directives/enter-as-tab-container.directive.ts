import {Directive, ElementRef, HostListener, inject} from '@angular/core';

@Directive({
  selector: '[enterAsTabContainer]',
  standalone: true,
})
export class EnterAsTabContainerDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: Event): void {
    const current = event.target as HTMLElement;

    if (!current.matches('input, textarea, select, button, [contenteditable="true"]')) {
      return;
    }

    event.preventDefault();

    const focusableElements = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(`
        input:not([disabled]):not([type="hidden"]),
        textarea:not([disabled]),
        select:not([disabled]),
        button:not([disabled]),
        [tabindex]:not([tabindex="-1"])
      `),
    ).filter(el => {
      const style = window.getComputedStyle(el);

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('disabled') &&
        el.getAttribute('aria-hidden') !== 'true'
      );
    });

    const index = focusableElements.indexOf(current);

    if (index === -1) {
      return;
    }

    const next = focusableElements[index + 1];

    if (!next) {
      return;
    }

    next.focus();

    if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
      next.select();
    }
  }
}
