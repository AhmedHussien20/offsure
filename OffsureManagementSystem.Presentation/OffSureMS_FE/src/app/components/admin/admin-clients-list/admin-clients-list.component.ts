import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClientDto } from 'app/core/models/clients/client.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ClientsService } from 'app/core/services/clients.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_CLIENT_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-clients-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './admin-clients-list.component.html',
})
export class AdminClientsListComponent implements OnInit {
  columns = ADMIN_CLIENT_COLUMNS;
  data: ClientDto[] = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
  });

  constructor(private clientsService: ClientsService) {}

  ngOnInit(): void {
    this.loadClients();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadClients();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadClients();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadClients();
  }

  private loadClients(): void {
    this.clientsService
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        searchKey: this.searchCriteria.searchKey,
      } as any)
      .subscribe(res => {
        const paged = res.data;
        this.data = paged?.data ?? [];
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      });
  }
}
