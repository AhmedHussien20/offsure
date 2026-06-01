import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ServiceCategoryDto, ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_CATEGORY_COLUMNS, ADMIN_SERVICE_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [CommonModule, SharedModule, NgbNavModule, GenericTableComponent],
  templateUrl: './admin-services.component.html',
})
export class AdminServicesComponent implements OnInit {
  @ViewChild('serviceActions', { static: true }) serviceActions!: TemplateRef<unknown>;

  activeTab: 'categories' | 'services' = 'categories';

  categoryColumns = ADMIN_CATEGORY_COLUMNS;
  serviceColumns = ADMIN_SERVICE_COLUMNS;
  categories: Array<ServiceCategoryDto & { activeLabel?: string }> = [];
  services: Array<ServiceDto & { visibleLabel?: string }> = [];

  catPage = 1;
  catEntries = 10;
  catTotal = 0;
  catTotalPages = 1;
  catSearch = new SearchCriteria({ pageIndex: 1, pageSize: 10 });

  svcPage = 1;
  svcEntries = 10;
  svcTotal = 0;
  svcTotalPages = 1;
  svcSearch = new SearchCriteria({ pageIndex: 1, pageSize: 10 });

  constructor(
    private categoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadServices();
  }

  onCatSearch = (): void => {
    this.catPage = 1;
    this.catSearch.pageIndex = 1;
    this.loadCategories();
  };

  onSvcSearch = (): void => {
    this.svcPage = 1;
    this.svcSearch.pageIndex = 1;
    this.loadServices();
  };

  onCatPageChange(page: number): void {
    this.catPage = page;
    this.catSearch.pageIndex = page;
    this.loadCategories();
  }

  onCatEntriesChange(size: number): void {
    this.catEntries = size;
    this.catSearch.pageSize = size;
    this.catPage = 1;
    this.catSearch.pageIndex = 1;
    this.loadCategories();
  }

  onSvcPageChange(page: number): void {
    this.svcPage = page;
    this.svcSearch.pageIndex = page;
    this.loadServices();
  }

  onSvcEntriesChange(size: number): void {
    this.svcEntries = size;
    this.svcSearch.pageSize = size;
    this.svcPage = 1;
    this.svcSearch.pageIndex = 1;
    this.loadServices();
  }

  toggleVisibility(service: ServiceDto): void {
    this.servicesService.setVisibility(service.id, { isVisible: !service.isVisible }).subscribe({
      next: () => {
        this.toastr.success('Service visibility updated.');
        this.loadServices();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update visibility.');
      },
    });
  }

  private loadCategories(): void {
    this.categoriesService
      .getAll({
        pageIndex: this.catSearch.pageIndex,
        pageSize: this.catSearch.pageSize,
        searchKey: this.catSearch.searchKey,
      } as any)
      .subscribe(res => {
        const paged = res.data;
        this.categories = (paged?.data ?? []).map(c => ({
          ...c,
          activeLabel: c.isActive ? 'Yes' : 'No',
        }));
        this.catTotal = paged?.totalCount ?? 0;
        this.catTotalPages = Math.max(1, Math.ceil(this.catTotal / this.catEntries));
      });
  }

  private loadServices(): void {
    this.servicesService
      .getAll({
        pageIndex: this.svcSearch.pageIndex,
        pageSize: this.svcSearch.pageSize,
        searchKey: this.svcSearch.searchKey,
      } as any)
      .subscribe(res => {
        const paged = res.data;
        this.services = (paged?.data ?? []).map(s => ({
          ...s,
          visibleLabel: s.isVisible ? 'Visible' : 'Hidden',
        }));
        this.svcTotal = paged?.totalCount ?? 0;
        this.svcTotalPages = Math.max(1, Math.ceil(this.svcTotal / this.svcEntries));
      });
  }
}
