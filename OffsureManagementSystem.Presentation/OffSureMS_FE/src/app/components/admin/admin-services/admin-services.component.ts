import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  categoryColumns = ADMIN_CATEGORY_COLUMNS;
  categories: Array<ServiceCategoryDto & { activeLabel?: string }> = [];
  services: Array<ServiceDto & { visibleLabel?: string }> = [];

  catPage = 1;
  catEntries = 10;
  catTotal = 0;
  catSearch = new SearchCriteria({ pageIndex: 1, pageSize: 10 });

  svcPage = 1;
  svcEntries = 10;
  svcTotal = 0;
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
      });
  }
}
