import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_PORTFOLIO_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-portfolios-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './admin-portfolios-list.component.html',
})
export class AdminPortfoliosListComponent implements OnInit {
  columns = ADMIN_PORTFOLIO_COLUMNS;
  data: Array<PortfolioDto & { publishedLabel?: string }> = [];
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

  constructor(private portfoliosService: PortfoliosService) {}

  ngOnInit(): void {
    this.loadPortfolios();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadPortfolios();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadPortfolios();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadPortfolios();
  }

  private loadPortfolios(): void {
    this.portfoliosService
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        searchKey: this.searchCriteria.searchKey,
      } as any)
      .subscribe(res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(p => ({
          ...p,
          publishedLabel: p.isPublished ? 'Published' : 'Draft',
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      });
  }
}
