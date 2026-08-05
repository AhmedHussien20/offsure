import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectStatus } from 'app/core/models/projects/project.models';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import {
  normalizeProjectStatus,
  normalizeServiceRequestStatus,
  serviceRequestStatusKey,
} from 'app/core/utils/enum-status.util';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SERVICE_REQUEST_STATUS_FILTER_OPTIONS } from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_REQUEST_COLUMNS, SERVICE_REQUEST_STATUS_BADGES } from '../admin.constants';
import { AdminConvertProjectComponent } from './admin-convert-project.component';

type StepState = 'done' | 'active' | 'pending';

@Component({
  selector: 'app-admin-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, RouterModule],
  templateUrl: './admin-requests-list.component.html',
  styleUrl: './admin-requests-list.component.scss',
})
export class AdminRequestsListComponent implements OnInit, OnDestroy {
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

  constructor(private serviceRequestsService: ServiceRequestsService,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private confirmDialog: ConfirmDialogService,
    private router: Router,
    private viewState: RouteViewStateService) {}

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

  canAccept(item: ServiceRequestDto): boolean {
    return normalizeServiceRequestStatus(item.status) === ServiceRequestStatus.Pending;
  }

  canConvert(item: ServiceRequestDto): boolean {
    return (
      !this.hasLinkedProject(item) &&
      normalizeServiceRequestStatus(item.status) === ServiceRequestStatus.PrimaryAccepted
    );
  }

  showConvertBanner(item: ServiceRequestDto): boolean {
    return this.canConvert(item);
  }

  showSalesAttributionBanner(item: ServiceRequestDto): boolean {
    return (
      this.hasSalesPerson(item) &&
      !this.hasLinkedProject(item) &&
      normalizeServiceRequestStatus(item.status) === ServiceRequestStatus.Pending
    );
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

  async acceptRequest(item: ServiceRequestDto): Promise<void> {
    const label = item.title?.trim() || item.serviceName?.trim() || 'this request';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Accept request',
      message: `Accept "${label}"? The client will see it as accepted.`,
      confirmLabel: 'Accept',
      variant: 'primary',
      icon: 'ti-check',
    });
    if (!confirmed) {
      return;
    }

    this.serviceRequestsService.updateStatus(item.id, { status: ServiceRequestStatus.PrimaryAccepted }).subscribe({
      next: () => {
        this.toastr.success('Request accepted.');
        item.status = ServiceRequestStatus.PrimaryAccepted;
        this.loadRequests();
      },
    });
  }

  async rejectRequest(item: ServiceRequestDto): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Reject request',
      message: 'Reject this request? The client will see it as cancelled.',
      confirmLabel: 'Reject',
      variant: 'warning',
      icon: 'ti-ban',
    });
    if (!confirmed) {
      return;
    }

    this.serviceRequestsService.updateStatus(item.id, { status: ServiceRequestStatus.Cancelled }).subscribe({
      next: () => {
        this.toastr.success('Request rejected.');
        this.loadRequests();
      },
    });
  }

  convertToProject(item: ServiceRequestDto): void {
    if (this.hasLinkedProject(item)) {
      this.toastr.info('This request already has a linked project.');
      return;
    }

    if (normalizeServiceRequestStatus(item.status) !== ServiceRequestStatus.PrimaryAccepted) {
      this.toastr.warning('Accept the request before converting to a project.');
      return;
    }

    const modalRef = this.modalService.open(AdminConvertProjectComponent, {
      centered: true,
      backdrop: 'static',
      modalDialogClass: 'project-flow-modal__dialog',
    });
    modalRef.componentInstance.request = item;

    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadRequests();
      }
    });
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
          this.ensureExpandedRequestVisible();
        },
      });
  }

  private ensureExpandedRequestVisible(): void {
    if (!this.expandedRowId || this.data.some(item => item.id === this.expandedRowId)) {
      return;
    }

    this.serviceRequestsService.getById(this.expandedRowId).subscribe({
      next: res => {
        const item = res.data;
        if (!item) {
          return;
        }
        this.data = [item, ...this.data.filter(row => row.id !== item.id)];
      },
    });
  }
}
