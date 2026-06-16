import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-client-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-client-detail-panel.component.html',
  styleUrl: './admin-client-detail-panel.component.scss',
})
export class AdminClientDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) clientId!: number;
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  loadingRequests = false;
  deleting = false;
  loadError: string | null = null;
  requestsError: string | null = null;
  client: ClientDto | null = null;
  recentRequests: ClientServiceRequestSummaryDto[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private clientsService: ClientsService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && this.clientId) {
      this.loadClient();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get contactName(): string {
    if (!this.client) {
      return '';
    }
    return `${this.client.firstName ?? ''} ${this.client.lastName ?? ''}`.trim();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  async deactivateClient(): Promise<void> {
    if (!this.client || !this.client.isActive) {
      return;
    }

    const label = this.client.companyName?.trim() || this.contactName || 'this client';
    const hasHistory = (this.client.requestsCount ?? 0) > 0 || (this.client.projectsCount ?? 0) > 0;
    const historyNote = hasHistory
      ? ' Their service requests and projects will be kept on record.'
      : '';

    const confirmed = await this.confirmDialog.confirm({
      title: 'Deactivate client',
      message: `Deactivate ${label}? The client will no longer be able to sign in.${historyNote}`,
      confirmLabel: 'Deactivate',
      variant: 'warning',
      icon: 'ti-user-off',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.clientsService
      .deactivate(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Client deactivated.');
          this.deleting = false;
          this.deleted.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to deactivate client.');
          this.deleting = false;
        },
      });
  }

  private loadClient(): void {
    this.loading = true;
    this.loadError = null;
    this.requestsError = null;
    this.client = null;
    this.recentRequests = [];

    this.clientsService
      .getById(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.client = res.data ?? null;
          if (!this.client) {
            this.loadError = 'Client not found.';
            this.loading = false;
            return;
          }
          this.loading = false;
          this.loadRecentRequests();
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load client.';
          this.loading = false;
        },
      });
  }

  private loadRecentRequests(): void {
    this.loadingRequests = true;
    this.requestsError = null;

    this.clientsService
      .getRecentRequestsByClientId(this.clientId, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.recentRequests = res.data ?? [];
          this.loadingRequests = false;
        },
        error: err => {
          this.requestsError = err?.error?.message || 'Failed to load recent requests.';
          this.loadingRequests = false;
        },
      });
  }
}
