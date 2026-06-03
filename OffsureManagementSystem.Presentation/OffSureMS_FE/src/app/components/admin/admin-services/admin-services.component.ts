import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ServiceCategoryDto, ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import {
  ACTIVE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
  VISIBILITY_FILTER_OPTIONS,
} from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_CATEGORY_COLUMNS, ADMIN_SERVICE_COLUMNS } from '../admin.constants';
import { AdminServiceCategoryCreateComponent } from './admin-service-category-create.component';
import { AdminServiceCreateComponent } from './admin-service-create.component';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NgbNavModule,
    GenericTableComponent,
  ],
  templateUrl: './admin-services.component.html',
})
export class AdminServicesComponent implements OnInit {
  @ViewChild('categoryActions', { static: true }) categoryActions!: TemplateRef<unknown>;
  @ViewChild('serviceActions', { static: true }) serviceActions!: TemplateRef<unknown>;

  activeTab: 'categories' | 'services' = 'categories';

  categoryColumns = ADMIN_CATEGORY_COLUMNS;
  serviceColumns = ADMIN_SERVICE_COLUMNS;
  categories: Array<ServiceCategoryDto & { activeLabel?: string }> = [];
  services: Array<ServiceDto & { visibleLabel?: string }> = [];
  categoryOptions: { id: number; name: string }[] = [];

  catPage = 1;
  catEntries = 10;
  catTotal = 0;
  catTotalPages = 1;
  catSearch = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: { isActive: 'dropdown' },
  });

  svcPage = 1;
  svcEntries = 10;
  svcTotal = 0;
  svcTotalPages = 1;
  svcSearch = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: {
      serviceCategoryId: 'dropdown',
      isVisible: 'dropdown',
    },
  });

  catLabels = { ...LIST_FILTER_LABELS };
  svcLabels = { ...LIST_FILTER_LABELS };
  catDropdownOptions = { isActive: ACTIVE_FILTER_OPTIONS };
  svcDropdownOptions: Record<string, { id: number | boolean; name: string }[]> = {
    serviceCategoryId: [],
    isVisible: VISIBILITY_FILTER_OPTIONS,
  };

  constructor(
    private categoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private toastr: ToastrService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadCategoryOptions();
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

  openCategoryForm(): void {
    const modalRef = this.modalService.open(AdminServiceCategoryCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadCategoryOptions();
        this.loadCategories();
      }
    });
  }

  openServiceForm(): void {
    this.loadCategoryOptions();
    const modalRef = this.modalService.open(AdminServiceCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.categoryOptions = this.categoryOptions;
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadServices();
        this.loadCategories();
      }
    });
  }

  toggleCategoryActive(category: ServiceCategoryDto): void {
    this.categoriesService
      .update(category.id, {
        name: category.name,
        description: category.description,
        isActive: !category.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success(category.isActive ? 'Category deactivated.' : 'Category activated.');
          this.loadCategoryOptions();
          this.loadCategories();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update category.');
        },
      });
  }

  toggleVisibility(service: ServiceDto): void {
    this.servicesService.setVisibility(service.id, { isVisible: !service.isVisible }).subscribe({
      next: () => {
        this.toastr.success(service.isVisible ? 'Service hidden from landing.' : 'Service shown on landing.');
        this.loadServices();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update visibility.');
      },
    });
  }

  private loadCategoryOptions(): void {
    this.categoriesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = res.data?.data ?? [];
      this.categoryOptions = list.map(c => ({ id: c.id, name: c.name }));
      this.svcDropdownOptions = {
        serviceCategoryId: this.categoryOptions,
        isVisible: VISIBILITY_FILTER_OPTIONS,
      };
    });
  }

  private loadCategories(): void {
    this.categoriesService
      .getAll(buildPagedListQuery(this.catSearch) as any)
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
      .getAll(buildPagedListQuery(this.svcSearch) as any)
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
