import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzEmptyModule} from 'ng-zorro-antd/empty';
import {AppModalComponent} from '../../../../shared/app-modal/app-modal.component';
import {AppButtonComponent} from '../../../../shared/app-button/app-button.component';
import {Role, RoleAssignedUser} from '../models/role.model';

@Component({
  selector: 'app-role-user-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzInputModule,
    NzIconModule,
    NzAvatarModule,
    NzTagModule,
    NzEmptyModule,
    AppModalComponent,
    AppButtonComponent,
  ],
  templateUrl: './role-user-modal.component.html',
  styleUrls: ['./role-user-modal.component.scss'],
})
export class RoleUserModalComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() role: Role | null = null;
  @Input() users: RoleAssignedUser[] = [];
  @Input() loading = false;

  searchQuery = '';

  get filteredUsers(): RoleAssignedUser[] {
    if (!this.searchQuery.trim()) {
      return this.users;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return this.users.filter(
      u =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  close(): void {
    this.searchQuery = '';
    this.visibleChange.emit(false);
  }
}
