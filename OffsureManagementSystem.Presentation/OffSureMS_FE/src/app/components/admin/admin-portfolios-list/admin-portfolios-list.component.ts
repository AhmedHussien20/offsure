import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { PortfolioDto, UpdatePortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import { ServiceDto } from 'app/core/models/services/service.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_PORTFOLIO_COLUMNS } from '../admin.constants';

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
    ReactiveFormsModule,
    FormsModule,
    GenericTableComponent,
    GenericFormComponent,
  ],
  templateUrl: './admin-portfolios-list.component.html',
})
export class AdminPortfoliosListComponent implements OnInit {
  @ViewChild('portfolioActions', { static: true }) portfolioActions!: TemplateRef<unknown>;

  columns = ADMIN_PORTFOLIO_COLUMNS;
  data: PortfolioRow[] = [];
  serviceOptions: { id: number; name: string }[] = [];

  showForm = false;
  saving = false;
  portfolioForm!: FormGroup;
  formConfig: FormFieldConfig[] = [];

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
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.buildForm();
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
    this.updateServiceSelect();
    this.showForm = true;
    this.portfolioForm.reset({
      isPublished: true,
      completedDate: this.todayIsoDate(),
    });
  }

  cancelForm(): void {
    this.showForm = false;
  }

  submitPortfolio(): void {
    if (this.portfolioForm.invalid) {
      this.portfolioForm.markAllAsTouched();
      return;
    }

    const raw = this.portfolioForm.getRawValue();
    const completedDate = this.toApiDate(raw.completedDate);
    if (!completedDate) {
      this.toastr.warning('Completed date is required.');
      return;
    }

    this.saving = true;
    this.portfoliosService
      .create({
        serviceId: Number(raw.serviceId),
        title: String(raw.title).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        clientName: String(raw.clientName).trim(),
        thumbnailUrl: raw.thumbnailUrl ? String(raw.thumbnailUrl).trim() : undefined,
        completedDate,
        projectValue: raw.projectValue != null && raw.projectValue !== '' ? Number(raw.projectValue) : undefined,
        isPublished: !!raw.isPublished,
        images: [],
      })
      .subscribe({
        next: () => {
          this.toastr.success('Portfolio project created. Expand the row to upload gallery images.');
          this.showForm = false;
          this.loadPortfolios();
          this.saving = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create portfolio.');
          this.saving = false;
        },
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

  private buildForm(): void {
    this.portfolioForm = this.fb.group({
      serviceId: [null, Validators.required],
      title: ['', Validators.required],
      description: [''],
      clientName: ['', Validators.required],
      thumbnailUrl: [''],
      completedDate: [this.todayIsoDate(), Validators.required],
      projectValue: [null, [Validators.min(0)]],
      isPublished: [true],
    });

    this.formConfig = [
      {
        type: 'select',
        name: 'serviceId',
        label: 'Service',
        selectType: 'simple',
        options: [],
        validations: { required: true },
      },
      { type: 'input', inputType: 'text', name: 'title', label: 'Project Title', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      { type: 'input', inputType: 'text', name: 'clientName', label: 'Client Name', validations: { required: true } },
      { type: 'input', inputType: 'text', name: 'thumbnailUrl', label: 'Thumbnail URL (optional)' },
      { type: 'date', name: 'completedDate', label: 'Completed Date', validations: { required: true } },
      { type: 'input', inputType: 'number', name: 'projectValue', label: 'Project Value (optional)' },
      { type: 'checkbox', name: 'isPublished', label: 'Published on landing page' },
    ];
  }

  private updateServiceSelect(): void {
    const options = this.serviceOptions.map(s => ({ label: s.name, value: s.id }));
    this.formConfig = this.formConfig.map(f => (f.name === 'serviceId' ? { ...f, options } : f));
  }

  private loadServices(): void {
    this.servicesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = (res.data?.data ?? []) as ServiceDto[];
      this.serviceOptions = list.map(s => ({ id: s.id, name: s.name }));
      this.updateServiceSelect();
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
    return new Date().toISOString().slice(0, 10);
  }

  private toApiDate(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `${text}T00:00:00.000Z`;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
}
