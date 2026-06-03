import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ClientsService } from 'app/core/services/clients.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-client-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Client</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">
        Creates an active client account with login credentials. Email is marked verified so they can sign in immediately.
      </p>
      <app-generic-form
        [formGroup]="form"
        [formConfig]="formConfig"
        [showSubmit]="false"
        class="generic-form"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Client' }}
      </button>
    </div>
  `,
})
export class AdminClientCreateComponent {
  saving = false;
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [
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
    { type: 'input', inputType: 'text', name: 'contactPersonPhone', label: 'Phone', icon: 'fe fe-phone' },
    { type: 'input', inputType: 'text', name: 'companyAddress', label: 'Address', icon: 'fe fe-map-pin' },
    { type: 'input', inputType: 'text', name: 'city', label: 'City', icon: 'fe fe-map' },
    { type: 'input', inputType: 'text', name: 'country', label: 'Country', icon: 'fe fe-globe' },
    { type: 'input', inputType: 'text', name: 'postalCode', label: 'Postal code', icon: 'fe fe-hash' },
  ];

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      companyName: ['', Validators.required],
      contactPersonPhone: [''],
      companyAddress: [''],
      city: [''],
      country: [''],
      postalCode: [''],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.clientsService
      .create({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        companyName: raw.companyName.trim(),
        contactPersonPhone: raw.contactPersonPhone?.trim() || undefined,
        companyAddress: raw.companyAddress?.trim() || undefined,
        city: raw.city?.trim() || undefined,
        country: raw.country?.trim() || undefined,
        postalCode: raw.postalCode?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Client created and activated.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create client.');
          this.saving = false;
        },
      });
  }
}
