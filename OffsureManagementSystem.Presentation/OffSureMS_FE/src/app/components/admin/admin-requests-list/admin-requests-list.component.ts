import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectStatus } from 'app/core/models/projects/project.models';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import {
  normalizeProjectStatus,
  normalizeServiceRequestStatus,
  serviceRequestStatusKey,
} from 'app/core/utils/enum-status.util';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
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
export class AdminRequestsListComponent implements OnInit {
  @ViewChild('requestDetail', { static: true }) requestDetail!: TemplateRef<unknown>;

  columns = ADMIN_REQUEST_COLUMNS;
  data: ServiceRequestDto[] = [];
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
    status: [
      { id: 'Pending', name: 'Pending' },
      { id: 'InProgress', name: 'In Progress' },
      { id: 'Completed', name: 'Completed' },
      { id: 'Cancelled', name: 'Cancelled' },
    ],
  };

  constructor(
    private serviceRequestsService: ServiceRequestsService,
    private modalService: NgbModal,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
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
      normalizeServiceRequestStatus(item.status) === ServiceRequestStatus.InProgress
    );
  }

  showConvertBanner(item: ServiceRequestDto): boolean {
    return this.canConvert(item);
  }

  statusBadgeClass(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.text ?? String(status ?? '');
  }

  requestSteps(item: ServiceRequestDto): { key: string; label: string; state: StepState }[] {
    const status = normalizeServiceRequestStatus(item.status);
    const cancelled = status === ServiceRequestStatus.Cancelled;
    const completed = status === ServiceRequestStatus.Completed;
    const inProgress = status === ServiceRequestStatus.InProgress || completed || this.hasLinkedProject(item);
    const pendingReview =
      status === ServiceRequestStatus.Pending || inProgress || completed;

    const step = (key: string, label: string, index: number): { key: string; label: string; state: StepState } => {
      let activeIndex = 0;
      if (cancelled) {
        activeIndex = 1;
      } else if (completed) {
        activeIndex = 3;
      } else if (inProgress) {
        activeIndex = 2;
      } else if (pendingReview) {
        activeIndex = 1;
      }

      let state: StepState = 'pending';
      if (index < activeIndex) state = 'done';
      else if (index === activeIndex) state = 'active';
      return { key, label, state };
    };

    return [
      step('submitted', 'Submitted', 0),
      step('review', cancelled ? 'Cancelled' : 'Pending review', 1),
      step('progress', 'In progress', 2),
      step('done', 'Completed', 3),
    ];
  }

  activityLog(item: ServiceRequestDto): { text: string; date?: string }[] {
    const entries: { text: string; date?: string }[] = [
      { text: `Submitted by ${item.clientName}`, date: item.requestedDate },
    ];
    const status = normalizeServiceRequestStatus(item.status);
    if (status === ServiceRequestStatus.InProgress || this.hasLinkedProject(item)) {
      entries.push({ text: 'Accepted by admin', date: item.requestedDate });
    }
    if (this.hasLinkedProject(item)) {
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

  acceptRequest(item: ServiceRequestDto): void {
    this.serviceRequestsService.updateStatus(item.id, { status: ServiceRequestStatus.InProgress }).subscribe({
      next: () => {
        this.toastr.success('Request accepted.');
        item.status = ServiceRequestStatus.InProgress;
        this.loadRequests();
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to accept request.'),
    });
  }

  rejectRequest(item: ServiceRequestDto): void {
    if (!confirm('Reject this request? The client will see it as cancelled.')) {
      return;
    }
    this.serviceRequestsService.updateStatus(item.id, { status: ServiceRequestStatus.Cancelled }).subscribe({
      next: () => {
        this.toastr.success('Request rejected.');
        this.loadRequests();
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to reject request.'),
    });
  }

  convertToProject(item: ServiceRequestDto): void {
    if (this.hasLinkedProject(item)) {
      this.toastr.info('This request already has a linked project.');
      return;
    }

    if (normalizeServiceRequestStatus(item.status) !== ServiceRequestStatus.InProgress) {
      this.toastr.warning('Accept the request before converting to a project.');
      return;
    }

    const modalRef = this.modalService.open(AdminConvertProjectComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
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
        },
      });
  }
}
