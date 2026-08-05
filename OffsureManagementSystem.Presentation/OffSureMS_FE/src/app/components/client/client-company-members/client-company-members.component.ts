import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto } from 'app/core/models/clients/client.models';
import { ClientContextService } from 'app/core/services/client-context.service';
import { ClientsService } from 'app/core/services/clients.service';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 12;

@Component({
  selector: 'app-client-company-members',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, NgbPaginationModule],
  templateUrl: './client-company-members.component.html',
  styleUrl: './client-company-members.component.scss',
})
export class ClientCompanyMembersComponent implements OnInit, OnDestroy {
  members: ClientDto[] = [];
  loading = true;
  hasLoadedOnce = false;
  loadError: string | null = null;
  isOwner = false;

  searchKey = '';
  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  totalCount = 0;

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();
  private loadRequestId = 0;

  constructor(
    private clientContext: ClientContextService,
    private clientsService: ClientsService,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.viewState.savePage(this.router.url, this.page, this.pageSize);
        this.loadMembers();
      });

    this.clientContext.loadProfile().subscribe({
      next: profile => {
        const role = profile?.accountRole;
        this.isOwner = role === 'Owner' || role === 1;
        if (!this.isOwner) {
          this.loading = false;
          void this.router.navigate(['/client/dashboard']);
          return;
        }

        const restored = this.viewState.restorePageIfPop(this.router.url);
        if (restored) {
          this.page = restored.page;
          if (restored.pageSize) {
            this.pageSize = restored.pageSize;
          }
        } else {
          this.viewState.savePage(this.router.url, this.page, this.pageSize);
        }

        this.loadMembers();
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Unable to load your profile.';
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get showPagination(): boolean {
    return this.totalCount > this.pageSize;
  }

  onSearchInput(): void {
    this.search$.next(this.searchKey);
  }

  onPageChange(page: number): void {
    this.page = page;
    this.viewState.savePage(this.router.url, this.page, this.pageSize);
    this.loadMembers();
  }

  displayName(member: ClientDto): string {
    return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email || '—';
  }

  initials(member: ClientDto): string {
    const name = this.displayName(member);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private loadMembers(): void {
    const isInitial = !this.hasLoadedOnce;
    if (isInitial) {
      this.loading = true;
    }
    this.loadError = null;

    const requestId = ++this.loadRequestId;
    const trimmed = this.searchKey.trim();

    this.clientsService
      .getMyOrganizationMembers({
        pageIndex: this.page,
        pageSize: this.pageSize,
        ...(trimmed ? { searchKey: trimmed } : {}),
      })
      .subscribe({
        next: res => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          const paged = res.data;
          this.members = paged?.data ?? [];
          this.totalCount = paged?.totalCount ?? 0;
          this.loading = false;
          this.hasLoadedOnce = true;
        },
        error: err => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.loading = false;
          this.hasLoadedOnce = true;
          if (isInitial) {
            this.members = [];
            this.totalCount = 0;
          }
          this.loadError = err?.error?.message || 'Unable to load company members.';
        },
      });
  }
}
