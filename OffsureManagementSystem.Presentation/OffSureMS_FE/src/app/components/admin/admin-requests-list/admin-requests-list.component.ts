import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectStatus } from 'app/core/models/projects/project.models';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import { normalizeProjectStatus, normalizeServiceRequestStatus } from 'app/core/utils/enum-status.util';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_REQUEST_COLUMNS } from '../admin.constants';
import { AdminConvertProjectComponent } from './admin-convert-project.component';

@Component({
  selector: 'app-admin-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, FormsModule, RouterModule],
  templateUrl: './admin-requests-list.component.html',
})
export class AdminRequestsListComponent implements OnInit {
  @ViewChild('requestActions', { static: true }) requestActions!: TemplateRef<unknown>;

  columns = ADMIN_REQUEST_COLUMNS;
  data: ServiceRequestDto[] = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  statusOptions = [
    ServiceRequestStatus.Pending,
    ServiceRequestStatus.InProgress,
    ServiceRequestStatus.Completed,
    ServiceRequestStatus.Cancelled,
  ];

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

  canShowConvertToProject(item: ServiceRequestDto): boolean {
    return !this.hasLinkedProject(item);
  }

  isStatusChangeDisabled(item: ServiceRequestDto): boolean {
    return normalizeServiceRequestStatus(item.status) === ServiceRequestStatus.Completed;
  }

  canCompleteRequest(item: ServiceRequestDto): boolean {
    if (!this.hasLinkedProject(item)) {
      return true;
    }
    return normalizeProjectStatus(item.projectStatus) === ProjectStatus.Completed;
  }

  statusOptionsFor(item: ServiceRequestDto): ServiceRequestStatus[] {
    if (this.canCompleteRequest(item)) {
      return this.statusOptions;
    }
    return this.statusOptions.filter(s => s !== ServiceRequestStatus.Completed);
  }

  updateStatus(item: ServiceRequestDto, status: ServiceRequestStatus): void {
    if (this.isStatusChangeDisabled(item)) {
      return;
    }

    if (status === ServiceRequestStatus.Completed && !this.canCompleteRequest(item)) {
      this.toastr.warning('Complete the linked project before marking this request as Completed.');
      this.loadRequests();
      return;
    }

    this.serviceRequestsService.updateStatus(item.id, { status }).subscribe({
      next: () => {
        this.toastr.success('Request status updated.');
        this.loadRequests();
      },
      error: err => {
        this.loadRequests();
        this.toastr.error(err?.error?.message || 'Failed to update status.');
      },
    });
  }

  convertToProject(item: ServiceRequestDto): void {
    if (this.hasLinkedProject(item)) {
      this.toastr.info('This request already has a linked project.');
      return;
    }

    if (normalizeServiceRequestStatus(item.status) !== ServiceRequestStatus.InProgress) {
      this.toastr.warning('Set request status to In Progress before creating a project.');
      return;
    }

    const modalRef = this.modalService.open(AdminConvertProjectComponent, {
      centered: true,
      size: 'md',
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
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        sortColumn: this.searchCriteria.sortColumn,
        sortDirection: this.searchCriteria.sortDirection,
        status: this.searchCriteria['status'],
        searchKey: this.searchCriteria.searchKey,
      } as any)
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
