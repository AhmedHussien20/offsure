import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ClientsService } from 'app/core/services/clients.service';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface OrgPersonRow {
  client: ClientDto;
  isOwner: boolean;
}

@Component({
  selector: 'app-viewer-client-organization',
  standalone: true,
  imports: [CommonModule, RouterLink, SharedModule],
  templateUrl: './viewer-client-organization.component.html',
  styleUrl: './viewer-client-organization.component.scss',
})
export class ViewerClientOrganizationComponent implements OnInit, OnDestroy {
  owner: ClientDto | null = null;
  people: OrgPersonRow[] = [];
  recentRequests: ClientServiceRequestSummaryDto[] = [];

  loading = true;
  loadingPeople = false;
  loadError: string | null = null;
  peopleError: string | null = null;
  requestsError: string | null = null;

  private ownerId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientsService: ClientsService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        void this.router.navigate(['/viewer/companies']);
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

  private loadOrganization(): void {
    this.loading = true;
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
              void this.router.navigate(['/viewer/companies', parentId]);
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
