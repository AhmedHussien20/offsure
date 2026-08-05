import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminClientMemberCreateComponent } from './admin-client-member-create.component';

@Component({
  selector: 'app-admin-client-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-client-detail-panel.component.html',
  styleUrl: './admin-client-detail-panel.component.scss',
})
export class AdminClientDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) clientId!: number;
  @Output() saved = new EventEmitter<void>();

  loading = false;
  loadingRequests = false;
  loadingMembers = false;
  deactivating = false;
  activating = false;
  loadError: string | null = null;
  requestsError: string | null = null;
  membersError: string | null = null;
  client: ClientDto | null = null;
  recentRequests: ClientServiceRequestSummaryDto[] = [];
  members: ClientDto[] = [];

  private readonly recentRequestsLimit = 2;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private clientsService: ClientsService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService,
    private modalService: NgbModal
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

  get hasSalesPerson(): boolean {
    return !!(this.client?.salesId || this.client?.salesPersonName?.trim());
  }

  get isOrganizationOwner(): boolean {
    if (!this.client) {
      return false;
    }
    const role = this.client.accountRole;
    return role === 'Owner' || role === 1 || role == null;
  }

  salesPersonLabel(): string {
    return this.client?.salesPersonName?.trim() || '—';
  }

  memberDisplayName(member: ClientDto): string {
    return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
  }

  openCreateMember(): void {
    if (!this.client || !this.isOrganizationOwner) {
      return;
    }

    const modalRef = this.modalService.open(AdminClientMemberCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.ownerClientId = this.client.id;
    modalRef.componentInstance.companyName = this.client.companyName;

    modalRef.result.then(
      created => {
        if (created) {
          this.loadMembers();
          this.saved.emit();
        }
      },
      () => undefined
    );
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
    const activeMemberCount =
      this.members.filter(m => m.isActive).length ||
      (this.isOrganizationOwner ? this.client.membersCount ?? 0 : 0);

    let includeMembers = false;

    if (this.isOrganizationOwner && activeMemberCount > 0) {
      const choice = await this.confirmDialog.confirmChoice({
        title: 'Deactivate company owner',
        message: `Deactivate ${label}? This company has ${activeMemberCount} member${
          activeMemberCount === 1 ? '' : 's'
        }. Deactivate this owner only, or the owner and remaining members?${historyNote}`,
        confirmLabel: 'Owner & members',
        alternateConfirmLabel: 'Owner only',
        cancelLabel: 'Cancel',
        variant: 'warning',
        icon: 'ti-user-off',
      });
      if (!choice) {
        return;
      }
      includeMembers = choice === 'confirm';
    } else {
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
    }

    this.deactivating = true;
    this.clientsService
      .deactivate(this.client.id, includeMembers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.client = res.data ?? this.client;
          this.toastr.success(
            includeMembers ? 'Owner and members deactivated.' : 'Client deactivated.'
          );
          this.deactivating = false;
          this.saved.emit();
          if (includeMembers) {
            this.loadMembers();
          }
        },
        error: () => {
          this.deactivating = false;
        },
      });
  }

  async activateClient(): Promise<void> {
    if (!this.client || this.client.isActive) {
      return;
    }

    const label = this.client.companyName?.trim() || this.contactName || 'this client';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Activate client',
      message: `Activate ${label}? They will be able to sign in again.`,
      confirmLabel: 'Activate',
      variant: 'primary',
      icon: 'ti-user-check',
    });
    if (!confirmed) {
      return;
    }

    this.activating = true;
    this.clientsService
      .activate(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.client = res.data ?? this.client;
          this.toastr.success('Client activated.');
          this.activating = false;
          this.saved.emit();
        },
        error: () => {
          this.activating = false;
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
          if (this.isOrganizationOwner) {
            this.loadMembers();
          } else {
            this.members = [];
          }
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load client.';
          this.loading = false;
        },
      });
  }

  private loadMembers(): void {
    this.loadingMembers = true;
    this.membersError = null;

    this.clientsService
      .getOrganizationMembers(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.members = res.data ?? [];
          this.loadingMembers = false;
        },
        error: err => {
          this.membersError = err?.error?.message || 'Failed to load organization users.';
          this.loadingMembers = false;
        },
      });
  }

  private loadRecentRequests(): void {
    this.loadingRequests = true;
    this.requestsError = null;

    this.clientsService
      .getRecentRequestsByClientId(this.clientId, this.recentRequestsLimit)
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
