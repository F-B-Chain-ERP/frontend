import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppQuantityStepperComponent } from '../../../shared/app-quantity-stepper/app-quantity-stepper.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { BranchService } from '../../../core/auth/branch.service';
import { ROLE } from '../../../core/config/functions.constants';
import { KdsApiService } from '../kds-api.service';
import {
  KDS_STATUS_ACTION_ICONS,
  KDS_STATUS_ACTION_LABELS,
  KDS_TICKET_STATUS_OPTIONS,
  KdsTicketDetail,
  KdsTicketSummary,
  getKdsStatusMeta,
  nextKdsActions,
} from '../kds.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '../../../shared/constants/constant';

function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Màn bếp KDS trạm BAR: 3 cột Chờ làm / Đang pha / Sẵn sàng, đồng nhất UI màn quản đơn. */
@Component({
  selector: 'app-kds-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzSelectModule,
    NzIconModule,
    NzDatePickerModule,
    NzSpinModule,
    NzTooltipModule,
    NzEmptyModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppQuantityStepperComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './kds-board.component.html',
  styleUrls: ['./kds-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KdsBoardComponent implements OnInit, OnDestroy {
  readonly ROLE = ROLE;
  readonly statusOptions = KDS_TICKET_STATUS_OPTIONS;
  readonly actionLabels = KDS_STATUS_ACTION_LABELS;
  readonly branchService = inject(BranchService);
  readonly tickets = signal<KdsTicketSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageIndex = signal(DEFAULT_PAGE_INDEX);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly detailVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly detail = signal<KdsTicketDetail | null>(null);
  readonly actionLoading = signal(false);

  getStatusMeta = getKdsStatusMeta;
  nextActions = nextKdsActions;

  selectedBranchId: string | null = null;
  selectedStatus: string | null = null;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  private readonly api = inject(KdsApiService);
  private readonly toast = inject(AppNotificationService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.branchService.loadMine().subscribe();
    this.load();
    this.refreshTimer = setInterval(() => this.load(true), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  actionIcon(action: string): string {
    return KDS_STATUS_ACTION_ICONS[action]?.icon ?? 'question-circle';
  }

  actionTooltip(action: string): string {
    return KDS_STATUS_ACTION_ICONS[action]?.tooltip ?? action;
  }

  queued(): KdsTicketSummary[] {
    return this.tickets().filter(t => t.status === 'QUEUED');
  }

  preparing(): KdsTicketSummary[] {
    return this.tickets().filter(t => t.status === 'PREPARING');
  }

  ready(): KdsTicketSummary[] {
    return this.tickets().filter(t => t.status === 'READY');
  }

  elapsedMinutes(createdAt: string | null): number {
    if (!createdAt) return 0;
    const d = new Date(createdAt).getTime();
    if (Number.isNaN(d)) return 0;
    return Math.max(0, Math.floor((Date.now() - d) / 60000));
  }

  isOverdue(createdAt: string | null): boolean {
    return this.elapsedMinutes(createdAt) >= 15;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api
      .listTickets({
        branchId: this.selectedBranchId,
        status: this.selectedStatus,
        fromDate: toISODate(this.fromDate),
        toDate: toISODate(this.toDate),
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.tickets.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          if (!silent) this.toast.error(err?.error?.message || 'Không tải được phiếu bếp');
        },
      });
  }

  onFilterChange(): void {
    this.pageIndex.set(1);
    this.load();
  }

  onResetFilters(): void {
    this.selectedBranchId = null;
    this.selectedStatus = null;
    this.fromDate = null;
    this.toDate = null;
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
    this.load();
  }

  onPageChange(index: number): void {
    this.pageIndex.set(index);
    this.load();
  }

  openDetail(ticket: KdsTicketSummary): void {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detail.set(null);
    this.api.getTicket(ticket.id).subscribe({
      next: d => {
        this.detail.set(d);
        this.detailLoading.set(false);
      },
      error: err => {
        this.detailLoading.set(false);
        this.toast.error(err?.error?.message || 'Không tải được chi tiết phiếu bếp');
      },
    });
  }

  closeDetail(): void {
    this.detailVisible.set(false);
  }

  advance(ticket: KdsTicketSummary, target: string): void {
    const call: Observable<unknown> =
      target === 'PREPARING' ? this.api.start(ticket.id) : target === 'READY' ? this.api.ready(ticket.id) : this.api.serve(ticket.id);
    this.doAction(call, `${this.actionLabels[target] ?? target} thành công`);
  }

  advanceFromDetail(detail: KdsTicketDetail, target: string): void {
    this.advance(detail, target);
  }

  changePrepared(itemId: string, qty: number): void {
    this.doAction(this.api.progressItem(itemId, qty, null), 'Cập nhật số lượng xong thành công');
  }

  markItemReady(itemId: string): void {
    this.doAction(this.api.progressItem(itemId, null, 'READY'), 'Báo món sẵn sàng thành công');
  }

  private doAction(request: Observable<unknown>, successMessage: string): void {
    this.actionLoading.set(true);
    request.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success(successMessage);
        this.load(true);
        const current = this.detail();
        if (current) this.openDetail(current);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Thao tác thất bại');
      },
    });
  }
}

export default KdsBoardComponent;
