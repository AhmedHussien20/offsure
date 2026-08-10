import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ClientsService } from 'app/core/services/clients.service';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminClientMemberCreateComponent } from './admin-client-member-create.component';

interface OrgPersonRow {
  client: ClientDto;
  isOwner: boolean;
}

@Component({
  selector: 'app-admin-client-organization',
  standalone: true,
  imports: [CommonModule, RouterLink, SharedModule],
  templateUrl: './admin-client-organization.component.html',
  styleUrl: './admin-client-organization.component.scss',
})
export class AdminClientOrganizationComponent implements OnInit, OnDestroy {
  owner: ClientDto | null = null;
  people: OrgPersonRow[] = [];
  recentRequests: ClientServiceRequestSummaryDto[] = [];

  loading = true;
  loadingPeople = false;
  loadError: string | null = null;
  peopleError: string | null = null;
  requestsError: string | null = null;
  deactivating = false;
  activating = false;
  deleting = false;

  private ownerId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientsService: ClientsService,
    private breadcrumbService: BreadcrumbService,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        void this.router.navigate(['/admin/companies']);
        return;
      }
      this.ownerId = id;
      this.loadOrganization();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  personName(client: ClientDto): string {
    return `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email || '—';
  }

  openCreateMember(): void {
    if (!this.owner) {
      return;
    }
    const modalRef = this.modalService.open(AdminClientMemberCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.ownerClientId = this.owner.id;
    modalRef.componentInstance.companyName = this.owner.companyName;
    modalRef.result.then(
      created => {
        if (created) {
          this.loadPeople();
          this.loadOrganization(false);
        }
      },
      () => undefined
    );
  }

  async toggleActive(person: ClientDto): Promise<void> {
    if (person.isActive) {
      await this.deactivate(person);
    } else {
      await this.activate(person);
    }
  }

  private async deactivate(person: ClientDto): Promise<void> {
    const label = this.personName(person);
    const isOwner = person.id === this.owner?.id;
    const activeMemberCount = this.people.filter(p => !p.isOwner && p.client.isActive).length;

    let includeMembers = false;

    if (isOwner && activeMemberCount > 0) {
      const choice = await this.confirmDialog.confirmChoice({
        title: 'Deactivate company owner',
        message: `Deactivate ${label}? This company has ${activeMemberCount} active member${
          activeMemberCount === 1 ? '' : 's'
        }. Deactivate this owner only, or the owner and remaining members?`,
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
        title: isOwner ? 'Deactivate company owner' : 'Deactivate user',
        message: `Deactivate ${label}? They will no longer be able to sign in.`,
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
      .deactivate(person.id, includeMembers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            includeMembers ? 'Owner and members deactivated.' : 'User deactivated.'
          );
          this.deactivating = false;
          this.loadOrganization();
        },
        error: () => {
          this.deactivating = false;
        },
      });
  }

  private async activate(person: ClientDto): Promise<void> {
    const label = this.personName(person);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Activate user',
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
      .activate(person.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('User activated.');
          this.activating = false;
          this.loadOrganization();
        },
        error: () => {
          this.activating = false;
        },
      });
  }

  async deletePerson(person: ClientDto): Promise<void> {
    const label = this.personName(person);
    const isOwner = person.id === this.owner?.id;
    const remainingMembers = this.people.filter(p => !p.isOwner).length;

    if (isOwner && remainingMembers > 0) {
      this.toastr.warning(
        `Cannot delete owner while members remain. Delete all ${remainingMembers} member${
          remainingMembers === 1 ? '' : 's'
        } first.`
      );
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: isOwner ? 'Delete company owner' : 'Delete member',
      message: `Delete ${label}? They will be removed from lists and will no longer be able to sign in. Service requests and projects are kept on record.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.clientsService
      .delete(person.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(isOwner ? 'Company owner deleted.' : 'Member deleted.');
          this.deleting = false;
          if (isOwner) {
            void this.router.navigate(['/admin/companies']);
            return;
          }
          this.loadOrganization();
        },
        error: () => {
          this.deleting = false;
        },
      });
  }

  private loadOrganization(showPageLoading = true): void {
    if (showPageLoading) {
      this.loading = true;
    }
    this.loadError = null;

    this.clientsService
      .getById(this.ownerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.owner = res.data ?? null;
          if (!this.owner) {
            this.loadError = 'Company not found.';
            this.loading = false;
            return;
          }

          const role = this.owner.accountRole;
          const isOwner = role === 'Owner' || role === 1 || role == null;
          if (!isOwner) {
            const parentId = this.owner.parentClientId;
            if (parentId) {
              void this.router.navigate(['/admin/companies', parentId]);
              return;
            }
          }

          this.breadcrumbService.setDynamicLabel(this.owner.companyName);
          this.loading = false;
          this.loadPeople();
          this.loadRecentRequests();
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load company.';
          this.loading = false;
        },
      });
  }

  private loadPeople(): void {
    if (!this.owner) {
      return;
    }
    this.loadingPeople = true;
    this.peopleError = null;

    this.clientsService
      .getOrganizationMembers(this.owner.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const members = res.data ?? [];
          this.people = [
            { client: this.owner!, isOwner: true },
            ...members.map(m => ({ client: m, isOwner: false })),
          ];
          this.loadingPeople = false;
        },
        error: err => {
          this.people = this.owner ? [{ client: this.owner, isOwner: true }] : [];
          this.peopleError = err?.error?.message || 'Failed to load users.';
          this.loadingPeople = false;
        },
      });
  }

  private loadRecentRequests(): void {
    this.requestsError = null;
    this.clientsService
      .getRecentRequestsByClientId(this.ownerId, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.recentRequests = res.data ?? [];
        },
        error: err => {
          this.requestsError = err?.error?.message || 'Failed to load recent requests.';
        },
      });
  }
}
