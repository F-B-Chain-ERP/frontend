import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { AppModalComponent } from '../../../../../shared/app-modal/app-modal.component';
import { AppButtonComponent } from '../../../../../shared/app-button/app-button.component';
import { User, getUserStatusMeta, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzDescriptionsModule,
    NzTagModule,
    NzAvatarModule,
    NzIconModule,
    NzDividerModule,
    AppModalComponent,
    AppButtonComponent,
  ],
  templateUrl: './user-detail-modal.component.html',
  styleUrls: ['./user-detail-modal.component.scss'],
})
export class UserDetailModalComponent {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() editRequested = new EventEmitter<User>();

  readonly UserStatus = UserStatus;

  getStatusMeta(status: UserStatus | number) {
    return getUserStatusMeta(status);
  }

  handleClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  handleEdit(): void {
    if (this.user) {
      this.editRequested.emit(this.user);
      this.handleClose();
    }
  }
}
