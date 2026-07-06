import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ServiceCategoryDto, UpdateServiceCategoryDto } from 'app/core/models/services/service.models';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-service-category-detail-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-service-category-detail-panel.component.html',
  styleUrl: './admin-service-category-detail-panel.component.scss',
})
export class AdminServiceCategoryDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) categoryId!: number;
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  saving = false;
  editing = false;
  loadError: string | null = null;
  category: ServiceCategoryDto | null = null;
  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'name', label: 'Category Name', validations: { required: true } },
    { type: 'textarea', name: 'description', label: 'Description' },
    { type: 'checkbox', name: 'isActive', label: 'Active' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private categoriesService: ServiceCategoriesService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] && this.categoryId) {
      this.editing = false;
      this.loadCategory();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  startEdit(): void {
    if (!this.category) {
      return;
    }
    this.patchForm(this.category);
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.category) {
      this.patchForm(this.category);
    }
  }

  saveEdit(): void {
    if (!this.category || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: UpdateServiceCategoryDto = {
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description).trim() : undefined,
      isActive: !!raw.isActive,
    };

    this.saving = true;
    this.categoriesService
      .update(this.category.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Category updated.');
          this.saving = false;
          this.editing = false;
          this.changed.emit();
          this.loadCategory();
        },
        error: err => {
          this.saving = false;
        },
      });
  }

  toggleActive(): void {
    if (!this.category || this.editing) {
      return;
    }

    const dto: UpdateServiceCategoryDto = {
      name: this.category.name,
      description: this.category.description,
      isActive: !this.category.isActive,
    };

    this.updating = true;
    this.categoriesService
      .update(this.category.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(dto.isActive ? 'Category activated.' : 'Category deactivated.');
          this.updating = false;
          this.changed.emit();
          this.loadCategory();
        },
        error: err => {
          this.updating = false;
        },
      });
  }

  private patchForm(category: ServiceCategoryDto): void {
    this.form.patchValue({
      name: category.name,
      description: category.description ?? '',
      isActive: category.isActive,
    });
  }

  private loadCategory(): void {
    this.loading = true;
    this.loadError = null;
    this.category = null;

    this.categoriesService
      .getById(this.categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.category = res.data ?? null;
          if (!this.category) {
            this.loadError = 'Category not found.';
          } else {
            this.patchForm(this.category);
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load category.';
          this.loading = false;
        },
      });
  }
}
