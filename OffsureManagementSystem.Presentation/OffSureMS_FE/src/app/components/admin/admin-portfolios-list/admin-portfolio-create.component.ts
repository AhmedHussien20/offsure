import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-portfolio-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Portfolio Project</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (serviceOptions.length === 0) {
        <div class="alert alert-warning mb-3">Create at least one service before adding portfolio projects.</div>
      }
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving || serviceOptions.length === 0" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Portfolio' }}
      </button>
    </div>
  `,
})
export class AdminPortfolioCreateComponent {
  @Input() serviceOptions: { id: number; name: string }[] = [];

  saving = false;
  form!: FormGroup;

  formConfig: FormFieldConfig[] = [
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

  constructor(
    private fb: FormBuilder,
    private portfoliosService: PortfoliosService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      serviceId: [null, Validators.required],
      title: ['', Validators.required],
      description: [''],
      clientName: ['', Validators.required],
      thumbnailUrl: [''],
      completedDate: [this.todayIsoDate(), Validators.required],
      projectValue: [null, [Validators.min(0)]],
      isPublished: [true],
    });
  }

  ngOnInit(): void {
    const options = this.serviceOptions.map(s => ({ label: s.name, value: s.id }));
    this.formConfig = this.formConfig.map(field => (field.name === 'serviceId' ? { ...field, options } : field));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
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
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create portfolio.');
          this.saving = false;
        },
      });
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
