import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import {
  normalizeServiceRequestStatus,
  serviceRequestStatusKey,
} from 'app/core/utils/enum-status.util';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SERVICE_REQUEST_STATUS_FILTER_OPTIONS } from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import {
  ADMIN_REQUEST_COLUMNS,
  SERVICE_REQUEST_STATUS_BADGES,
} from 'app/components/admin/admin.constants';

type StepState = 'done' | 'active' | 'pending';

@Component({
  selector: 'app-viewer-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, RouterModule],
  templateUrl: './viewer-requests-list.component.html',
  styleUrl: './viewer-requests-list.component.scss',
})
export class ViewerRequestsListComponent implements OnInit, OnDestroy {
  @ViewChild('requestDetail', { static: true }) requestDetail!: TemplateRef<unknown>;

  columns = ADMIN_REQUEST_COLUMNS;
  data: ServiceRequestDto[] = [];
  expandedRowId: number | null = null;
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { status: 'dropdown' },
  });

  labels: Record<string, string> = { status: 'Status', searchKey: 'Search' };
  dropdownOptions = {
    status: SERVICE_REQUEST_STATUS_FILTER_OPTIONS,
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private serviceRequestsService: ServiceRequestsService,
    private route: ActivatedRoute,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.viewState.seedListPaging(this.router.url, this);
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));
      this.expandedRowId = Number.isFinite(id) && id > 0 ? id : null;
      this.loadRequests();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadRequests();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadRequests();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadRequests();
  }

  hasLinkedProject(item: ServiceRequestDto): boolean {
    const id = item.projectId;
    return id != null && id > 0;
  }

  hasSalesPerson(item: ServiceRequestDto): boolean {
    return item.salesId != null && item.salesId > 0;
  }

  salesPersonLabel(item: ServiceRequestDto): string {
    const name = item.salesPersonName?.trim();
    return name || 'Assigned sales user';
  }

  statusBadgeClass(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.text ?? String(status ?? '');
  }

  requestSteps(item: ServiceRequestDto): { key: string; label: string; state: StepState }[] {
    const status = normalizeServiceRequestStatus(item.status);
    let activeIndex = 0;
    if (status === ServiceRequestStatus.Cancelled) {
      activeIndex = 1;
    } else if (status === ServiceRequestStatus.Completed) {
      activeIndex = 3;
    } else if (status === ServiceRequestStatus.AcceptedWithProject || this.hasLinkedProject(item)) {
      activeIndex = 2;
    } else if (status === ServiceRequestStatus.PrimaryAccepted) {
      activeIndex = 1;
    }

    const step = (key: string, label: string, index: number): { key: string; label: string; state: StepState } => {
      let state: StepState = 'pending';
      if (index < activeIndex) state = 'done';
      else if (index === activeIndex) state = 'active';
      return { key, label, state };
    };

    return [
      step('submitted', 'Submitted', 0),
      step('accepted', status === ServiceRequestStatus.Cancelled ? 'Cancelled' : 'Accepted', 1),
      step('project', 'With project', 2),
      step('done', 'Completed', 3),
    ];
  }

  activityLog(item: ServiceRequestDto): { text: string; date?: string }[] {
    const entries: { text: string; date?: string }[] = [
      {
        text: `Submitted by ${item.clientMemberName || item.clientName}${
          item.clientMemberName && item.clientName ? ` (${item.clientName})` : ''
        }`,
        date: item.requestedDate,
      },
    ];
    const status = normalizeServiceRequestStatus(item.status);
    if (
      status === ServiceRequestStatus.PrimaryAccepted ||
      status === ServiceRequestStatus.AcceptedWithProject ||
      this.hasLinkedProject(item)
    ) {
      entries.push({ text: 'Accepted by admin', date: item.requestedDate });
    }
    if (status === ServiceRequestStatus.AcceptedWithProject || this.hasLinkedProject(item)) {
      entries.push({ text: 'Converted to project' });
    }
    if (status === ServiceRequestStatus.Completed) {
      entries.push({ text: 'Request completed' });
    }
    if (status === ServiceRequestStatus.Cancelled) {
      entries.push({ text: 'Request rejected / cancelled' });
    }
    return entries;
  }

  private loadRequests(): void {
    this.serviceRequestsService
      .getAll(buildPagedListQuery(this.searchCriteria) as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = paged?.data ?? [];
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
        },
      });
  }
}
