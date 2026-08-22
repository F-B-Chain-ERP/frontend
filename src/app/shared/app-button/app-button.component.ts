import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {NzSpinComponent} from 'ng-zorro-antd/spin';
import {deriveBrandScale} from '../../core/theme/theme.service';
import {NgStyle} from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'app-button',
  templateUrl: './app-button.component.html',
  styleUrls: ['./app-button.component.scss'],
  imports: [NzIconDirective, NzSpinComponent, NgStyle],
  standalone: true,
})
export class AppButtonComponent implements OnInit {
  @Input() variant: ButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() rounded = false;
  @Input() leftIcon?: string;
  @Input() rightIcon?: string;
  @Input() iconOnly?: string;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() backgroundColor?: string;
  @Input() type = 'button';
  @Input() tabindex: string | number = '';

  protected buttonStyle: { [key: string]: string } = {};

  @HostBinding('style.width')
  get hostWidth(): string | null {
    return this.fullWidth ? '100%' : null;
  }

  ngOnInit() {
    if (this.backgroundColor) {
      const scale = deriveBrandScale(this.backgroundColor);

      this.buttonStyle = {
        '--brand': scale['--brand-500'],
        '--brand-hover': scale['--brand-600'],
        '--brand-active': scale['--brand-700'],
        '--on-brand': '#fff',
      };
    }
  }
}
