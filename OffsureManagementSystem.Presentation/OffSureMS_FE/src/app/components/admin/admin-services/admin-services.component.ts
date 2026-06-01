import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ServiceCategoryDto, ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_CATEGORY_COLUMNS, ADMIN_SERVICE_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NgbNavModule,
    ReactiveFormsModule,
    GenericTableComponent,
    GenericFormComponent,
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

  showCategoryForm = false;
  showServiceForm = false;
  savingCategory = false;
  savingService = false;

  categoryForm!: FormGroup;
  serviceForm!: FormGroup;
  categoryFormConfig: FormFieldConfig[] = [];
  serviceFormConfig: FormFieldConfig[] = [];

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
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.buildForms();
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
    this.showCategoryForm = true;
    this.categoryForm.reset({ isActive: true });
  }

  openServiceForm(): void {
    this.loadCategoryOptions();
    this.updateServiceCategorySelect();
    this.showServiceForm = true;
    this.serviceForm.reset({ serviceCategoryId: null, isVisible: false });
  }

  cancelCategoryForm(): void {
    this.showCategoryForm = false;
  }

  cancelServiceForm(): void {
    this.showServiceForm = false;
  }

  submitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const raw = this.categoryForm.getRawValue();
    this.savingCategory = true;
    this.categoriesService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        isActive: !!raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Service category created.');
          this.showCategoryForm = false;
          this.loadCategoryOptions();
          this.loadCategories();
          this.savingCategory = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create category.');
          this.savingCategory = false;
        },
      });
  }

  submitService(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const raw = this.serviceForm.getRawValue();
    this.savingService = true;
    this.servicesService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        serviceCategoryId: Number(raw.serviceCategoryId),
        isVisible: !!raw.isVisible,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Service created.');
          this.showServiceForm = false;
          this.loadServices();
          this.loadCategories();
          this.savingService = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create service.');
          this.savingService = false;
        },
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

  private buildForms(): void {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });

    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      serviceCategoryId: [null, Validators.required],
      isVisible: [false],
    });

    this.categoryFormConfig = [
      { type: 'input', inputType: 'text', name: 'name', label: 'Category Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      { type: 'checkbox', name: 'isActive', label: 'Active' },
    ];

    this.serviceFormConfig = [
      { type: 'input', inputType: 'text', name: 'name', label: 'Service Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      {
        type: 'select',
        name: 'serviceCategoryId',
        label: 'Category',
        selectType: 'simple',
        options: [],
        validations: { required: true },
      },
      { type: 'checkbox', name: 'isVisible', label: 'Visible on landing page' },
    ];
  }

  private updateServiceCategorySelect(): void {
    const options = this.categoryOptions.map(c => ({ label: c.name, value: c.id }));
    this.serviceFormConfig = this.serviceFormConfig.map(f =>
      f.name === 'serviceCategoryId' ? { ...f, options } : f
    );
  }

  private loadCategoryOptions(): void {
    this.categoriesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = res.data?.data ?? [];
      this.categoryOptions = list.map(c => ({ id: c.id, name: c.name }));
      this.updateServiceCategorySelect();
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
