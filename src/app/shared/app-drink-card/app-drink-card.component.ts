import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppButtonComponent } from '../app-button/app-button.component';

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
  imports: [AppButtonComponent],
  standalone: true,
})
export class AppDrinkCardComponent {
  @Input({ required: true }) item!: DrinkItem;

  @Output() selectItem = new EventEmitter<DrinkItem>();
  @Output() addToCart = new EventEmitter<DrinkItem>();

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  onCardClick(): void {
    this.selectItem.emit(this.item);
  }

  onAddClick(): void {
    this.addToCart.emit(this.item);
  }
}
export default AppDrinkCardComponent;
