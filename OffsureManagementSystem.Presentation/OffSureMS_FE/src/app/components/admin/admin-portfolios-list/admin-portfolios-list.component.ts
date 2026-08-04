import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import { ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { LIST_FILTER_LABELS } from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_PORTFOLIO_COLUMNS } from '../admin.constants';
import { AdminPortfolioCreateComponent } from './admin-portfolio-create.component';
import { AdminPortfolioDetailPanelComponent } from './admin-portfolio-detail-panel.component';

type PortfolioRow = PortfolioDto & {
  publishedLabel?: string;
  completedDateLabel?: string;
};

@Component({
  selector: 'app-admin-portfolios-list',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    GenericTableComponent,
    AdminPortfolioDetailPanelComponent,
  ],
  templateUrl: './admin-portfolios-list.component.html',
})
export class AdminPortfoliosListComponent implements OnInit {
  columns = ADMIN_PORTFOLIO_COLUMNS;
  data: PortfolioRow[] = [];
  serviceOptions: { id: number; name: string }[] = [];

  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { serviceId: 'dropdown' },
  });

  labels = { ...LIST_FILTER_LABELS };
  dropdownOptions: Record<string, { id: number; name: string }[]> = {
    serviceId: [],
  };

  constructor(private portfoliosService: PortfoliosService,
    private servicesService: ServicesService,
    private modalService: NgbModal,
    private router: Router,
    private viewState: RouteViewStateService) {}

  ngOnInit(): void {
    this.viewState.seedListPaging(this.router.url, this);
    this.loadServices();
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

  onPortfolioChanged(): void {
    this.loadPortfolios();
  }

  openForm(): void {
    const modalRef = this.modalService.open(AdminPortfolioCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadPortfolios();
      }
    });
  }

  private loadServices(): void {
    this.servicesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = (res.data?.data ?? []) as ServiceDto[];
      this.serviceOptions = list.map(s => ({ id: s.id, name: s.name }));
      this.dropdownOptions = { serviceId: this.serviceOptions };
    });
  }

  private loadPortfolios(): void {
    this.portfoliosService
      .getAll(
        buildPagedListQuery(this.searchCriteria, {
          extra: { includeUnpublished: true },
        }) as any
      )
      .subscribe(res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(p => this.mapRow(p));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      });
  }

  private mapRow(p: PortfolioDto): PortfolioRow {
    return {
      ...p,
      publishedLabel: p.isPublished ? 'Published' : 'Draft',
      completedDateLabel: this.formatDate(p.completedDate),
    };
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
}
