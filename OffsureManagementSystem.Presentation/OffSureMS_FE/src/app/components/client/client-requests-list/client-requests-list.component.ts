import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientContextService } from 'app/core/services/client-context.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { ServiceRequestDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { CLIENT_REQUEST_COLUMNS } from '../client.constants';
import { ClientRequestCreateComponent } from '../client-request-form/client-request-create.component';

@Component({
  selector: 'app-client-requests-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './client-requests-list.component.html',
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
      { id: 'InProgress', name: 'In Progress' },
      { id: 'Completed', name: 'Completed' },
      { id: 'Cancelled', name: 'Cancelled' },
    ],
  };

  constructor(
    private clientContext: ClientContextService,
    private serviceRequestsService: ServiceRequestsService,
    private modalService: NgbModal,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clientContext.loadProfile().subscribe(profile => {
      this.clientId = profile?.id ?? null;
      if (this.clientId) {
        this.loadRequests();
      }
    });

    if (this.route.snapshot.queryParamMap.get('new') === '1') {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { new: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.openCreateModal();
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
    this.openCreateModal();
  }

  private openCreateModal(): void {
    const modalRef = this.modalService.open(ClientRequestCreateComponent, {
      centered: true,
      size: 'lg',
    });
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
          this.data = paged?.data ?? [];
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
