import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientContextService } from 'app/core/services/client-context.service';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import {
  normalizeServiceRequestStatus,
  serviceRequestStatusKey,
} from 'app/core/utils/enum-status.util';
import {
  readServiceRequestPrefill,
  ServiceRequestCreatePrefill,
} from 'app/core/models/services/service-request-prefill.model';
import { CLIENT_REQUEST_COLUMNS, SERVICE_REQUEST_STATUS_BADGES } from '../client.constants';
import { ClientRequestCreateComponent } from '../client-request-form/client-request-create.component';

type StepState = 'done' | 'active' | 'pending';

@Component({
  selector: 'app-client-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, RouterModule],
  templateUrl: './client-requests-list.component.html',
  styleUrl: './client-requests-list.component.scss',
})
export class ClientRequestsListComponent implements OnInit {
  columns = CLIENT_REQUEST_COLUMNS;
  data: ServiceRequestDto[] = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;
  loading = false;
  clientId: number | null = null;
  /** Owners can open requests created by organization members. */
  isOrganizationOwner = false;
  private pendingCreatePrefill: ServiceRequestCreatePrefill | null = null;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { status: 'dropdown' },
  });

  labels: Record<string, string> = {
    status: 'Status',
    searchKey: 'Search',
  };

  dropdownOptions = {
    status: [
      { id: 'Pending', name: 'Pending' },
      { id: 'PrimaryAccepted', name: 'Accepted' },
      { id: 'AcceptedWithProject', name: 'With project' },
      { id: 'Completed', name: 'Completed' },
      { id: 'Cancelled', name: 'Cancelled' },
    ],
  };

  readonly priorityLabels: Record<number, string> = {
    1: 'Low',
    3: 'Medium',
    4: 'High',
    5: 'Urgent',
  };

  constructor(
    private clientContext: ClientContextService,
    private serviceRequestsService: ServiceRequestsService,
    private modalService: NgbModal,
    private route: ActivatedRoute,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    // Apply back-navigation page before the first fetch (table restore alone loses the race).
    this.viewState.seedListPaging(this.router.url, this);

    this.clientContext.loadProfile().subscribe(profile => {
      this.clientId = profile?.id ?? null;
      const role = profile?.accountRole;
      this.isOrganizationOwner = role === 'Owner' || role === 1 || role == null;
      if (this.clientId) {
        this.loadRequests();
      }
    });

    if (this.route.snapshot.queryParamMap.get('new') === '1') {
      this.pendingCreatePrefill = this.resolveCreatePrefill();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { new: null, serviceId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.openCreateModal(this.pendingCreatePrefill);
      this.pendingCreatePrefill = null;
    }
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

  onAdd(): void {
    this.openCreateModal(null);
  }

  canViewEnteredData(request: ServiceRequestDto): boolean {
    if (!this.clientId || !request) {
      return false;
    }

    // List API already scopes rows to accessible clients; owners may open member requests.
    if (this.isOrganizationOwner) {
      return true;
    }

    return request.clientId === this.clientId;
  }

  getPriorityLabel(priority: number | null | undefined): string {
    if (priority == null) {
      return 'Not specified';
    }

    return this.priorityLabels[priority] ?? `Priority ${priority}`;
  }

  hasLinkedProject(item: ServiceRequestDto): boolean {
    const id = item.projectId;
    return id != null && id > 0;
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
      { text: 'Request submitted', date: item.requestedDate },
    ];
    const status = normalizeServiceRequestStatus(item.status);
    if (
      status === ServiceRequestStatus.PrimaryAccepted ||
      status === ServiceRequestStatus.AcceptedWithProject ||
      this.hasLinkedProject(item)
    ) {
      entries.push({ text: 'Request accepted' });
    }
    if (status === ServiceRequestStatus.AcceptedWithProject || this.hasLinkedProject(item)) {
      entries.push({ text: 'Project created from request' });
    }
    if (status === ServiceRequestStatus.Completed) {
      entries.push({ text: 'Request completed' });
    }
    if (status === ServiceRequestStatus.Cancelled) {
      entries.push({ text: 'Request cancelled' });
    }
    return entries;
  }

  private resolveCreatePrefill(): ServiceRequestCreatePrefill | null {
    const fromStorage = readServiceRequestPrefill();
    const serviceIdParam = this.route.snapshot.queryParamMap.get('serviceId');
    const serviceId = serviceIdParam ? Number(serviceIdParam) : null;

    if (fromStorage) {
      if (serviceId != null && !Number.isNaN(serviceId)) {
        fromStorage.serviceId = fromStorage.serviceId ?? serviceId;
      }
      return fromStorage;
    }

    if (serviceId != null && !Number.isNaN(serviceId)) {
      return { serviceId };
    }

    return null;
  }

  private openCreateModal(prefill: ServiceRequestCreatePrefill | null): void {
    const modalRef = this.modalService.open(ClientRequestCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.prefill = prefill;
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadRequests();
      }
    });
  }

  private loadRequests(): void {
    if (!this.clientId) return;

    this.loading = true;
    this.serviceRequestsService
      .getClientRequests(this.clientId, buildPagedListQuery(this.searchCriteria) as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = (paged?.data ?? []).map(r => ({
            ...r,
            serviceName: r.serviceName?.trim() || 'General / Custom Request',
          }));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
