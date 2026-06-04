import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AddPortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import {
  PaginatedSelectComponent,
  PaginatedSelectLoader,
} from 'app/shared/components/paginated-select/paginated-select.component';
import { ToastrService } from 'ngx-toastr';
import { concatMap, forkJoin, map, Observable, of, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-portfolio-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, PaginatedSelectComponent],
  templateUrl: './admin-portfolio-create.component.html',
  styleUrl: './admin-portfolio-create.component.scss',
})
export class AdminPortfolioCreateComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  creating = false;
  serviceResetToken = 0;
  pendingImages: { file: File; previewUrl: string; altText: string }[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private portfoliosService: PortfoliosService,
    private categoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private toastr: ToastrService
  ) {}

  get serviceCategoryId(): number | null {
    const v = this.form?.get('serviceCategoryId')?.value;
    return v != null ? Number(v) : null;
  }

  loadCategories: PaginatedSelectLoader = (search, pageIndex) =>
    this.categoriesService
      .getAll({ pageIndex, pageSize: 10, isActive: true, searchKey: search.trim() || undefined })
      .pipe(
        map(res => ({
          items: (res.data?.data ?? []).map(c => ({ label: c.name, value: c.id })),
          totalCount: res.data?.totalCount ?? 0,
        }))
      );

  loadServices: PaginatedSelectLoader = (search, pageIndex) => {
    const categoryId = this.serviceCategoryId;
    if (!categoryId) {
      return of({ items: [], totalCount: 0 });
    }
    return this.servicesService
      .getAll({
        pageIndex,
        pageSize: 10,
        serviceCategoryId: categoryId,
        searchKey: search.trim() || undefined,
      })
      .pipe(
        map(res => ({
          items: (res.data?.data ?? []).map(s => ({ label: s.name, value: s.id })),
          totalCount: res.data?.totalCount ?? 0,
        }))
      );
  };

  ngOnInit(): void {
    this.form = this.fb.group({
      serviceCategoryId: [null, Validators.required],
      serviceId: [null, Validators.required],
      title: ['', Validators.required],
      description: [''],
      clientName: [''],
      completedDate: [new Date().toISOString().split('T')[0]],
      projectValue: [null],
      isPublished: [false],
    });

    this.formConfig = [
      {
        type: 'input',
        inputType: 'text',
        name: 'title',
        label: 'Title',
        icon: 'fe fe-edit-2',
        validations: { required: true },
      },
      {
        type: 'textarea',
        name: 'description',
        label: 'Description',
        icon: 'fe fe-file-text',
      },
      {
        type: 'input',
        inputType: 'text',
        name: 'clientName',
        label: 'Client name',
        icon: 'fe fe-user',
      },
      {
        type: 'date',
        name: 'completedDate',
        label: 'Completed date',
        icon: 'fe fe-calendar',
      },
      {
        type: 'input',
        inputType: 'number',
        name: 'projectValue',
        label: 'Project value',
        icon: 'fe fe-dollar-sign',
      },
      {
        type: 'checkbox',
        name: 'isPublished',
        label: 'Published',
      },
    ];

    this.form
      .get('serviceCategoryId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.patchValue({ serviceId: null }, { emitEvent: false });
        this.serviceResetToken++;
      });
  }

  ngOnDestroy(): void {
    this.revokePreviews();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      this.pendingImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
        altText: file.name.replace(/\.[^.]+$/, ''),
      });
    }
    input.value = '';
  }

  removePendingImage(index: number): void {
    const removed = this.pendingImages.splice(index, 1)[0];
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
  }

  save(): void {
    if (this.form.invalid || this.creating || this.pendingImages.length === 0) {
      this.form.markAllAsTouched();
      if (!this.pendingImages.length) {
        this.toastr.warning('Add at least one project photo.');
      }
      return;
    }

    const raw = this.form.getRawValue();
    const dto: AddPortfolioDto = {
      serviceId: Number(raw.serviceId),
      title: String(raw.title).trim(),
      description: raw.description || undefined,
      clientName: (raw.clientName && String(raw.clientName).trim()) || '—',
      completedDate: raw.completedDate || undefined,
      projectValue: raw.projectValue != null ? Number(raw.projectValue) : undefined,
      isPublished: !!raw.isPublished,
    };

    this.creating = true;
    this.portfoliosService
      .create(dto)
      .pipe(
        concatMap(res => {
          const id = res.data?.id;
          if (!id) {
            return of(res);
          }
          return forkJoin(
            this.pendingImages.map((img, order) =>
              this.portfoliosService.uploadImage(id, img.file, img.altText || undefined, order)
            )
          ).pipe(map(() => res));
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Portfolio created with photos.');
          this.activeModal.close(true);
        },
        error: err => {
          this.creating = false;
          this.toastr.error(err?.error?.message || 'Failed to create portfolio.');
        },
      });
  }

  private revokePreviews(): void {
    for (const img of this.pendingImages) {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    }
  }
}
