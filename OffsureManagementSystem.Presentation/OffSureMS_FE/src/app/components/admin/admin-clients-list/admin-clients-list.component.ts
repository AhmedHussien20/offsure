import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto } from 'app/core/models/clients/client.models';
import { ClientsService } from 'app/core/services/clients.service';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { AdminClientCreateComponent } from './admin-client-create.component';

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE = 12;

@Component({
  selector: 'app-admin-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './admin-clients-list.component.html',
  styleUrl: './admin-clients-list.component.scss',
})
export class AdminClientsListComponent implements OnInit, OnDestroy {
  companies: ClientDto[] = [];
  loading = false;
  hasLoaded = false;
  hasMore = false;
  loadError: string | null = null;

  searchKey = '';
  activeFilter: '' | 'true' | 'false' = '';

  private page = 1;
  private readonly pageSize = PAGE_SIZE;
  private totalCount = 0;
  private loadRequestId = 0;
  private observer: IntersectionObserver | null = null;
  private sentinelEl: HTMLElement | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  @ViewChild('scrollSentinel')
  set scrollSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.sentinelEl = ref?.nativeElement ?? null;
    this.bindObserver();
  }

  constructor(
    private clientsService: ClientsService,
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(v => v.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadCompanies(true));

    this.loadCompanies(true);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get refreshing(): boolean {
    return this.loading && this.hasLoaded && this.page === 1;
  }

  onSearchInput(): void {
    this.search$.next(this.searchKey);
  }

  onActiveFilterChange(): void {
    this.loadCompanies(true);
  }

  openCompany(company: ClientDto): void {
    void this.router.navigate(['/admin/companies', company.id]);
  }

  onAdd(): void {
    const modalRef = this.modalService.open(AdminClientCreateComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadCompanies(true);
      }
    });
  }

  companyInitials(company: ClientDto): string {
    const name = company.companyName?.trim() || '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  ownerName(company: ClientDto): string {
    return `${company.firstName ?? ''} ${company.lastName ?? ''}`.trim() || company.email || '—';
  }

  locationLabel(company: ClientDto): string {
    return [company.city, company.country].filter(Boolean).join(', ') || '—';
  }

  private loadCompanies(reset: boolean): void {
    if (reset) {
      this.page = 1;
      this.hasMore = false;
      if (!this.hasLoaded) {
        this.companies = [];
      }
    }

    const requestId = ++this.loadRequestId;
    this.loading = true;
    this.loadError = null;

    const request: Record<string, unknown> = {
      pageIndex: this.page,
      pageSize: this.pageSize,
      sortColumn: 'CompanyName',
      sortDirection: 'ASC',
      ownersOnly: true,
    };

    const term = this.searchKey.trim();
    if (term) {
      request['searchKey'] = term;
    }
    if (this.activeFilter === 'true') {
      request['isActive'] = true;
    } else if (this.activeFilter === 'false') {
      request['isActive'] = false;
    }

    this.clientsService.getAll(request as any).subscribe({
      next: res => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        const pageItems = res.data?.data ?? [];
        this.companies = reset ? pageItems : [...this.companies, ...pageItems];
        this.totalCount = res.data?.totalCount ?? 0;
        this.hasMore = this.companies.length < this.totalCount;
        this.loading = false;
        this.hasLoaded = true;
        if (!reset || pageItems.length > 0) {
          queueMicrotask(() => this.loadMoreIfNeeded());
        }
      },
      error: () => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        if (reset && !this.hasLoaded) {
          this.companies = [];
        }
        this.loadError = 'Unable to load companies.';
        this.hasMore = false;
        this.loading = false;
        this.hasLoaded = true;
      },
    });
  }

  private bindObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    const el = this.sentinelEl;
    if (!el) {
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) {
          return;
        }
        this.loadMoreIfNeeded();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );
    this.observer.observe(el);
  }

  private loadMoreIfNeeded(): void {
    if (!this.hasMore || this.loading || this.refreshing) {
      return;
    }
    if (!this.sentinelEl) {
      return;
    }
    this.page += 1;
    this.loadCompanies(false);
  }
}
