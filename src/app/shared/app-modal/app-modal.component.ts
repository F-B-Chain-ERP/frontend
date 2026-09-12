import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ModalMaskClickDirective } from './modal-mask-click.directive';

@Component({
  selector: 'app-modal',
  templateUrl: './app-modal.component.html',
  styleUrls: ['./app-modal.component.scss'],
  imports: [NzModalModule, ModalMaskClickDirective],
  standalone: true,
})
export class AppModalComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() centered = false;
  @Input() closable = true;
  @Input() maskClosable = false;

  @Input() footer: TemplateRef<any> | string | null | undefined = undefined;

  @Input() okLoading = false;
  @Input() okText = 'OK';
  @Input() cancelText = 'Cancel';

  @Output() okEmit = new EventEmitter<void>();
  @Output() cancelEmit = new EventEmitter<void>();

  get width(): number {
    switch (this.size) {
      case 'sm':
        return 480;
      case 'md':
        return 720;
      case 'lg':
        return 960;
      case 'xl':
        return 1200;
      default:
        return 720;
    }
  }

  handleOk(): void {
    this.okEmit.emit();
  }

  handleCancel(): void {
    this.cancelEmit.emit();
    this.visibleChange.emit(false);
  }

  overlayBlockCloseModal(): void {
    const modal = document.querySelector('.ant-modal');
    if (!modal) return;

    modal.classList.remove('zoom-feedback');
    void (modal as HTMLElement).offsetWidth;
    modal.classList.add('zoom-feedback');

    modal.addEventListener(
      'animationend',
      () => modal.classList.remove('zoom-feedback'),
      { once: true },
    );
  }
}
