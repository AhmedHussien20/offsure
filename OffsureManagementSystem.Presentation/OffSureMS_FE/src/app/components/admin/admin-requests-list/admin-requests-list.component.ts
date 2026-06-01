import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceRequestDto, ServiceRequestStatus } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_REQUEST_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, FormsModule],
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
    private projectsService: ProjectsService,
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

  updateStatus(item: ServiceRequestDto, status: ServiceRequestStatus): void {
    this.serviceRequestsService.updateStatus(item.id, { status }).subscribe({
      next: () => {
        this.toastr.success('Request status updated.');
        this.loadRequests();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update status.');
      },
    });
  }

  convertToProject(item: ServiceRequestDto): void {
    if (item.status !== ServiceRequestStatus.InProgress) {
      this.toastr.warning('Set request status to In Progress before creating a project.');
      return;
    }

    this.projectsService
      .create({
        serviceRequestId: item.id,
        name: item.title,
        description: item.description,
        budget: item.budget ?? undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Project created from request.');
          this.loadRequests();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create project.');
        },
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
