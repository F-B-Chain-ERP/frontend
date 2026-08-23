import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'continue_with' | 'signup_with';
              width?: number;
            },
          ) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly zone = inject(NgZone);
  private readonly credential$ = new Subject<string>();
  private initialized = false;
  private scriptLoading = false;
  private pendingSignIn = false;
  private hiddenContainer?: HTMLDivElement;

  /** Phát ra idToken mỗi khi người dùng chọn tài khoản Google thành công. */
  onCredential(): Observable<string> {
    return this.credential$.asObservable();
  }

  /** Tải script Google Identity Services và khởi tạo One Tap. */
  load(clientId: string = environment.googleClientId): void {
    if (this.initialized || !clientId) {
      return;
    }
    this.initialized = true;

    const init = (): void => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          this.zone.run(() => this.credential$.next(response.credential));
        },
        cancel_on_tap_outside: true,
      });
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }

    this.scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.scriptLoading = false;
      init();
      if (this.pendingSignIn) {
        this.pendingSignIn = false;
        this.signIn();
      }
    };
    document.head.appendChild(script);
  }

  /**
   * Mở popup chọn tài khoản Google cho nút tuỳ chỉnh.
   * Render một nút Google ẩn và kích hoạt nó (hoạt động cả khi chưa đăng nhập Google).
   */
  signIn(): void {
    if (!window.google?.accounts?.id) {
      if (this.scriptLoading) {
        this.pendingSignIn = true;
      }
      return;
    }

    if (!this.hiddenContainer) {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        width: 1,
      });
      this.hiddenContainer = container;
    }

    const btn = this.hiddenContainer.querySelector<HTMLElement>('div[role="button"]');
    btn?.click();
  }
}
