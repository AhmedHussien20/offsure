import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ServiceDto, UpdateServiceDto } from 'app/core/models/services/service.models';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-service-detail-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-service-detail-panel.component.html',
  styleUrl: './admin-service-detail-panel.component.scss',
})
export class AdminServiceDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) serviceId!: number;
  @Input() categoryOptions: { id: number; name: string }[] = [];
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  saving = false;
  editing = false;
  loadError: string | null = null;
  service: ServiceDto | null = null;
  form!: FormGroup;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private servicesService: ServicesService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      serviceCategoryId: [null, Validators.required],
      isVisible: [true],
    });
  }

  get formConfig(): FormFieldConfig[] {
    return [
      { type: 'input', inputType: 'text', name: 'name', label: 'Service Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      {
        type: 'select',
        name: 'serviceCategoryId',
        label: 'Category',
        selectType: 'simple',
        options: this.categoryOptions.map(c => ({ label: c.name, value: c.id })),
        validations: { required: true },
      },
      { type: 'checkbox', name: 'isVisible', label: 'Visible on landing page' },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serviceId'] && this.serviceId) {
      this.editing = false;
      this.loadService();
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
    if (!this.service) {
      return;
    }
    this.patchForm(this.service);
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.service) {
      this.patchForm(this.service);
    }
  }

  saveEdit(): void {
    if (!this.service || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: UpdateServiceDto = {
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description).trim() : undefined,
      serviceCategoryId: Number(raw.serviceCategoryId),
      isVisible: !!raw.isVisible,
    };

    this.saving = true;
    this.servicesService
      .update(this.service.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Service updated.');
          this.saving = false;
          this.editing = false;
          this.changed.emit();
          this.loadService();
        },
        error: err => {
          this.saving = false;
        },
      });
  }

  toggleVisibility(): void {
    if (!this.service || this.editing) {
      return;
    }

    const willBeVisible = !this.service.isVisible;
    this.updating = true;
    this.servicesService
      .setVisibility(this.service.id, { isVisible: willBeVisible })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            willBeVisible ? 'Service shown on landing.' : 'Service hidden from landing.'
          );
          this.updating = false;
          this.changed.emit();
          this.loadService();
        },
        error: err => {
          this.updating = false;
        },
      });
  }

  private patchForm(service: ServiceDto): void {
    this.form.patchValue({
      name: service.name,
      description: service.description ?? '',
      serviceCategoryId: service.serviceCategoryId,
      isVisible: service.isVisible,
    });
  }

  private loadService(): void {
    this.loading = true;
    this.loadError = null;
    this.service = null;

    this.servicesService
      .getById(this.serviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.service = res.data ?? null;
          if (!this.service) {
            this.loadError = 'Service not found.';
          } else {
            this.patchForm(this.service);
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load service.';
          this.loading = false;
        },
      });
  }
}
