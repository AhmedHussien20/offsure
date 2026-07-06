import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SalesService } from 'app/core/services/sales.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sales-client-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Client</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">
        Creates an active client account linked to you. Their service requests will carry your sales ID automatically.
      </p>
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Client' }}
      </button>
    </div>
  `,
})
export class SalesClientCreateComponent {
  saving = false;
  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'firstName', label: 'First name', icon: 'fe fe-user', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'lastName', label: 'Last name', icon: 'fe fe-user', validations: { required: true } },
    { type: 'input', inputType: 'email', name: 'email', label: 'Email', icon: 'fe fe-mail', validations: { required: true } },
    {
      type: 'input',
      inputType: 'password',
      name: 'password',
      label: 'Password',
      icon: 'fe fe-lock',
      validations: { required: true, minlength: 8 },
    },
    {
      type: 'input',
      inputType: 'text',
      name: 'companyName',
      label: 'Company name',
      icon: 'fe fe-briefcase',
      validations: { required: true },
    },
    { type: 'input', inputType: 'text', name: 'contactPersonPhone', label: 'Phone', icon: 'fe fe-phone', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'companyAddress', label: 'Address', icon: 'fe fe-map-pin' },
    { type: 'input', inputType: 'text', name: 'city', label: 'City', icon: 'fe fe-map' },
    { type: 'input', inputType: 'text', name: 'country', label: 'Country', icon: 'fe fe-globe' },
    { type: 'input', inputType: 'text', name: 'postalCode', label: 'Postal code', icon: 'fe fe-hash' },
  ];

  constructor(
    private fb: FormBuilder,
    private salesService: SalesService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      companyName: ['', Validators.required],
      contactPersonPhone: ['', Validators.required],
      companyAddress: [''],
      city: [''],
      country: [''],
      postalCode: [''],
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.salesService
      .createClient({
        firstName: String(raw.firstName).trim(),
        lastName: String(raw.lastName).trim(),
        email: String(raw.email).trim(),
        password: String(raw.password),
        companyName: String(raw.companyName).trim(),
        contactPersonPhone: String(raw.contactPersonPhone).trim(),
        companyAddress: raw.companyAddress || undefined,
        city: raw.city || undefined,
        country: raw.country || undefined,
        postalCode: raw.postalCode || undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Client created successfully.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.saving = false;
        },
      });
  }
}
