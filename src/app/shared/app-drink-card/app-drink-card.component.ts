import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {AppButtonComponent} from '../app-button/app-button.component';
import {normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE} from '../../core/util/image.util';

export interface DrinkItem {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  badge?: string;
  badgeType?: 'signature' | 'bestseller' | 'new';
  sizes?: Array<{ label: string; priceDelta: number }>;
}

@Component({
  selector: 'app-drink-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-drink-card.component.html',
  styleUrls: ['./app-drink-card.component.scss'],
  imports: [AppButtonComponent, NzIconDirective],
  standalone: true,
})
export class AppDrinkCardComponent {
  @Input({required: true}) item!: DrinkItem;

  @Output() selectItem = new EventEmitter<DrinkItem>();
  @Output() viewDetail = new EventEmitter<DrinkItem>();
  @Output() addToCart = new EventEmitter<DrinkItem>();

  readonly normalizeImageUrl = normalizeImageUrl;
  readonly defaultImage = DEFAULT_BEVERAGE_IMAGE;

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount);
  }

  onCardClick(): void {
    this.viewDetail.emit(this.item);
    this.selectItem.emit(this.item);
  }

  onAddClick(): void {
    this.addToCart.emit(this.item);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.defaultImage) {
      target.src = this.defaultImage;
    }
  }
}

export default AppDrinkCardComponent;
