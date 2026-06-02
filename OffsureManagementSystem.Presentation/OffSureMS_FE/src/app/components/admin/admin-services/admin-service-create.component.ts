import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-service-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Service</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (categoryOptions.length === 0) {
        <div class="alert alert-warning mb-3">Create at least one service category before adding services.</div>
      }
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving || categoryOptions.length === 0" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Service' }}
      </button>
    </div>
  `,
})
export class AdminServiceCreateComponent {
  @Input() categoryOptions: { id: number; name: string }[] = [];

  saving = false;
  form!: FormGroup;

  formConfig: FormFieldConfig[] = [
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

  constructor(
    private fb: FormBuilder,
    private servicesService: ServicesService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      serviceCategoryId: [null, Validators.required],
      isVisible: [false],
    });
  }

  ngOnInit(): void {
    const options = this.categoryOptions.map(c => ({ label: c.name, value: c.id }));
    this.formConfig = this.formConfig.map(field =>
      field.name === 'serviceCategoryId' ? { ...field, options } : field
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
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
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create service.');
          this.saving = false;
        },
      });
  }
}
