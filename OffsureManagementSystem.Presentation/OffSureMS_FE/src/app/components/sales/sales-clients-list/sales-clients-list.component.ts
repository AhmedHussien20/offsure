import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto } from 'app/core/models/clients/client.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { SalesService } from 'app/core/services/sales.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import {
  ACTIVE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
} from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ToastrService } from 'ngx-toastr';
import { SALES_CLIENT_COLUMNS } from '../sales.constants';
import { SalesClientCreateComponent } from '../sales-client-create/sales-client-create.component';

@Component({
  selector: 'app-sales-clients-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './sales-clients-list.component.html',
})
export class SalesClientsListComponent implements OnInit {
  columns = SALES_CLIENT_COLUMNS;
  data: Array<
    ClientDto & { contactName?: string; accountStatusLabel?: string }
  > = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { isActive: 'dropdown' },
  });

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions = { isActive: ACTIVE_FILTER_OPTIONS };

  constructor(
    private salesService: SalesService,
    private modalService: NgbModal,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.load();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.load();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.load();
  }

  onAdd(): void {
    const modalRef = this.modalService.open(SalesClientCreateComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.load();
      }
    });
  }

  private load(): void {
    this.salesService.getClients(buildPagedListQuery(this.searchCriteria) as any).subscribe({
      next: res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(client => ({
          ...client,
          contactName: `${client.firstName} ${client.lastName}`.trim(),
          accountStatusLabel: client.isActive ? 'Active' : 'Inactive',
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to load clients.'),
    });
  }
}
