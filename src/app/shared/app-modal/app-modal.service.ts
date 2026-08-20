import { ModalOptions, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { inject, Injectable } from '@angular/core';
import { take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppModalService {
  private readonly modal = inject(NzModalService);

  confirm(options: ModalOptions): NzModalRef {
    const ref = this.modal.confirm(options);
    this.bindMaskClick(ref);
    return ref;
  }

  error(options: ModalOptions): NzModalRef {
    const ref = this.modal.error(options);
    this.bindMaskClick(ref);
    return ref;
  }

  info(options: ModalOptions): NzModalRef {
    const ref = this.modal.info(options);
    this.bindMaskClick(ref);
    return ref;
  }

  warning(options: ModalOptions): NzModalRef {
    const ref = this.modal.warning(options);
    this.bindMaskClick(ref);
    return ref;
  }

  confirmLeave(content?: string): Promise<boolean> {
    return new Promise(resolve => {
      this.modal.confirm({
        nzTitle: 'Thông báo',
        nzContent:
          content ??
          'Dữ liệu đã thay đổi. Nếu rời khỏi màn hình mà chưa lưu, các thay đổi sẽ không được ghi nhận. Bạn có muốn rời khỏi trang không?',
        nzOkText: 'Rời trang',
        nzCancelText: 'Hủy',
        nzOnOk: () => resolve(true),
        nzOnCancel: () => resolve(false),
      });
    });
  }

  private bindMaskClick(ref: NzModalRef): void {
    ref.afterOpen.pipe(take(1)).subscribe(() => {
      const wraps = document.querySelectorAll<HTMLElement>('.ant-modal-wrap');
      const wrap = wraps[wraps.length - 1];
      if (!wrap) return;

      const listener = (event: MouseEvent) => {
        if (event.target === wrap) {
          const modal = wrap.querySelector<HTMLElement>('.ant-modal');
          if (!modal) return;

          modal.classList.remove('zoom-feedback');
          void modal.offsetWidth;
          modal.classList.add('zoom-feedback');
          modal.addEventListener('animationend', () => modal.classList.remove('zoom-feedback'), { once: true });
        }
      };

      wrap.addEventListener('click', listener);

      ref.afterClose.pipe(take(1)).subscribe(() => {
        wrap.removeEventListener('click', listener);
      });
    });
  }
}
