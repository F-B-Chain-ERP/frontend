import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BaseComponent } from '../../../../../shared/base-component/base.component';
import { AppModalComponent } from '../../../../../shared/app-modal/app-modal.component';
import { AppButtonComponent } from '../../../../../shared/app-button/app-button.component';
import { EnterAsTabContainerDirective } from '../../../../../shared/directives/enter-as-tab-container.directive';
import { UserService } from '../../services/user.service';
import { User, UserFormDTO, UserStatus } from '../../models/user.model';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzRadioModule,
    NzIconModule,
    AppModalComponent,
    AppButtonComponent,
    EnterAsTabContainerDirective,
  ],
  templateUrl: './user-form-modal.component.html',
  styleUrls: ['./user-form-modal.component.scss'],
})
export class UserFormModalComponent extends BaseComponent implements OnInit, OnChanges {
  private readonly userService = inject(UserService);

  @Input() visible = false;
  @Input() user: User | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<User>();

  readonly isSaving = signal(false);
  readonly UserStatus = UserStatus;

  readonly departmentOptions = [
    { label: 'Phòng Tài chính - Kế toán', value: 'Phòng Tài chính - Kế toán' },
    { label: 'Phòng Công nghệ Thông tin', value: 'Phòng Công nghệ Thông tin' },
    { label: 'Phòng Đào tạo', value: 'Phòng Đào tạo' },
    { label: 'Phòng Tổ chức Cán bộ', value: 'Phòng Tổ chức Cán bộ' },
    { label: 'Phòng Kế hoạch - Đầu tư', value: 'Phòng Kế hoạch - Đầu tư' },
    { label: 'Ban Quản lý Dự án', value: 'Ban Quản lý Dự án' },
    { label: 'Khoa Công nghệ Thông tin', value: 'Khoa Công nghệ Thông tin' },
    { label: 'Văn phòng Trường', value: 'Văn phòng Trường' },
    { label: 'Phòng Quản trị Thiết bị', value: 'Phòng Quản trị Thiết bị' },
  ];

  readonly roleOptions = [
    { label: 'Quản trị hệ thống', value: 'Quản trị hệ thống' },
    { label: 'Kế toán trưởng', value: 'Kế toán trưởng' },
    { label: 'Kế toán viên', value: 'Kế toán viên' },
    { label: 'Thủ quỹ', value: 'Thủ quỹ' },
    { label: 'Chuyên viên tài vụ', value: 'Chuyên viên tài vụ' },
    { label: 'Chuyên viên đào tạo', value: 'Chuyên viên đào tạo' },
    { label: 'Quản lý dự án XDCB', value: 'Quản lý dự án XDCB' },
    { label: 'Người dùng hệ thống', value: 'Người dùng hệ thống' },
  ];

  userForm = this.fb.group({
    fullName: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    username: ['', [Validators.required, this.safeTextValidator(), Validators.maxLength(50)]],
    phoneNumber: ['', [Validators.pattern(/^[0-9+() -]*$/), Validators.maxLength(15)]],
    status: [UserStatus.ACTIVE, [Validators.required]],
    department: ['Phòng Tài chính - Kế toán'],
    roles: [['Người dùng hệ thống']],
    note: ['', [Validators.maxLength(500)]],
  });

  get isEditMode(): boolean {
    return !!this.user?.id;
  }

  get modalTitle(): string {
    return this.isEditMode ? `Cập nhật người dùng: ${this.user?.fullName || ''}` : 'Thêm mới người dùng';
  }

  ngOnInit(): void {
    // Tự động sinh username gợi ý từ email khi thêm mới nếu chưa nhập username
    this.userForm.get('email')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(email => {
      if (!this.isEditMode && email) {
        const usernameControl = this.userForm.get('username');
        if (!usernameControl?.dirty && email.includes('@')) {
          const suggested = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
          usernameControl?.setValue(suggested, { emitEvent: false });
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForm();
    }
  }

  private initForm(): void {
    if (this.user) {
      this.userForm.reset({
        fullName: this.user.fullName,
        email: this.user.email,
        username: this.user.username,
        phoneNumber: this.user.phoneNumber || '',
        status: this.user.status,
        department: this.user.department || 'Phòng Tài chính - Kế toán',
        roles: this.user.roles && this.user.roles.length ? this.user.roles : ['Người dùng hệ thống'],
        note: this.user.note || '',
      });
      // Khi edit không cho đổi username
      this.userForm.get('username')?.disable();
    } else {
      this.userForm.reset({
        fullName: '',
        email: '',
        username: '',
        phoneNumber: '',
        status: UserStatus.ACTIVE,
        department: 'Phòng Tài chính - Kế toán',
        roles: ['Người dùng hệ thống'],
        note: '',
      });
      this.userForm.get('username')?.enable();
    }
  }

  handleCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  handleSubmit(): void {
    if (!this.validateAndFocusFirstInvalid(this.userForm)) {
      return;
    }

    const formRaw = this.userForm.getRawValue();
    const payload: UserFormDTO = {
      fullName: formRaw.fullName || '',
      email: formRaw.email || '',
      username: formRaw.username || '',
      phoneNumber: formRaw.phoneNumber || '',
      status: Number(formRaw.status) as UserStatus,
      department: formRaw.department || '',
      roles: formRaw.roles || [],
      note: formRaw.note || '',
    };

    this.isSaving.set(true);

    if (this.isEditMode && this.user) {
      this.userService.updateUser(this.user.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: updatedUser => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã cập nhật thông tin người dùng "${updatedUser.fullName}"`);
          this.saved.emit(updatedUser);
          this.handleCancel();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể cập nhật người dùng.');
        },
      });
    } else {
      this.userService.createUser(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: createdUser => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã thêm mới người dùng "${createdUser.fullName}"`);
          this.saved.emit(createdUser);
          this.handleCancel();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể thêm người dùng.');
        },
      });
    }
  }
}
