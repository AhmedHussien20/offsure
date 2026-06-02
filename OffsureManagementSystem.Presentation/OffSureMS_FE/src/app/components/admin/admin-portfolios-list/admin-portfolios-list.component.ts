import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PortfolioDto, UpdatePortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import { ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_PORTFOLIO_COLUMNS } from '../admin.constants';
import { AdminPortfolioCreateComponent } from './admin-portfolio-create.component';

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
    FormsModule,
    GenericTableComponent,
  ],
  templateUrl: './admin-portfolios-list.component.html',
})
export class AdminPortfoliosListComponent implements OnInit {
  @ViewChild('portfolioActions', { static: true }) portfolioActions!: TemplateRef<unknown>;

  columns = ADMIN_PORTFOLIO_COLUMNS;
  data: PortfolioRow[] = [];
  serviceOptions: { id: number; name: string }[] = [];

  uploadAltText: Record<number, string> = {};
  uploadFiles: Record<number, File | null> = {};
  uploadingId: number | null = null;

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

  constructor(
    private portfoliosService: PortfoliosService,
    private servicesService: ServicesService,
    private toastr: ToastrService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
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

  openForm(): void {
    this.loadServices();
    const modalRef = this.modalService.open(AdminPortfolioCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.serviceOptions = this.serviceOptions;
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadPortfolios();
      }
    });
  }

  togglePublished(item: PortfolioRow): void {
    const dto: UpdatePortfolioDto = {
      title: item.title,
      description: item.description,
      clientName: item.clientName,
      thumbnailUrl: item.thumbnailUrl,
      completedDate: item.completedDate ?? this.todayIsoDate(),
      projectValue: item.projectValue ?? undefined,
      isPublished: !item.isPublished,
    };

    this.portfoliosService.update(item.id, dto).subscribe({
      next: () => {
        this.toastr.success(dto.isPublished ? 'Portfolio published.' : 'Portfolio unpublished.');
        this.loadPortfolios();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update portfolio.');
      },
    });
  }

  deletePortfolio(item: PortfolioRow): void {
    if (!confirm(`Delete portfolio "${item.title}"?`)) {
      return;
    }

    this.portfoliosService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Portfolio deleted.');
        this.loadPortfolios();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to delete portfolio.');
      },
    });
  }

  onUploadFileSelected(item: PortfolioRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFiles[item.id] = input.files?.[0] ?? null;
  }

  uploadImage(item: PortfolioRow): void {
    const file = this.uploadFiles[item.id];
    if (!file) {
      this.toastr.warning('Choose an image file first.');
      return;
    }

    this.uploadingId = item.id;
    this.portfoliosService
      .uploadImage(item.id, file, this.uploadAltText[item.id]?.trim() || undefined, 0)
      .subscribe({
        next: () => {
          this.toastr.success('Image uploaded.');
          this.uploadFiles[item.id] = null;
          this.uploadAltText[item.id] = '';
          this.uploadingId = null;
          this.loadPortfolios();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to upload image.');
          this.uploadingId = null;
        },
      });
  }

  imageCount(item: PortfolioRow): number {
    return item.images?.length ?? 0;
  }

  private loadServices(): void {
    this.servicesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = (res.data?.data ?? []) as ServiceDto[];
      this.serviceOptions = list.map(s => ({ id: s.id, name: s.name }));
    });
  }

  private loadPortfolios(): void {
    this.portfoliosService
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        searchKey: this.searchCriteria.searchKey,
        includeUnpublished: true,
      } as any)
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

  private todayIsoDate(): string {
    return new Date().toISOString();
  }

}
