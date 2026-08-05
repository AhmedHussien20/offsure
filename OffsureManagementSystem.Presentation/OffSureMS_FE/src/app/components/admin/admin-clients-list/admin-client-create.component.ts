import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ClientsService } from 'app/core/services/clients.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

interface CreateStep {
  id: number;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-admin-client-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-client-create.component.html',
  styleUrl: './admin-client-create.component.scss',
})
export class AdminClientCreateComponent {
  saving = false;
  currentStep = 0;
  form!: FormGroup;

  readonly steps: CreateStep[] = [
    { id: 0, label: 'Company Information', shortLabel: 'Company' },
    { id: 1, label: 'Personal Information', shortLabel: 'Personal' },
  ];

  private readonly companyFields: FormFieldConfig[] = [
    {
      type: 'input',
      inputType: 'text',
      name: 'companyName',
      label: 'Company name',
      icon: 'fe fe-briefcase',
      validations: { required: true },
    },
    { type: 'input', inputType: 'text', name: 'companyAddress', label: 'Address', icon: 'fe fe-map-pin' },
    { type: 'input', inputType: 'text', name: 'city', label: 'City', icon: 'fe fe-map' },
    { type: 'input', inputType: 'text', name: 'country', label: 'Country', icon: 'fe fe-globe' },
    { type: 'input', inputType: 'text', name: 'postalCode', label: 'Postal code', icon: 'fe fe-hash' },
  ];

  private readonly personalFields: FormFieldConfig[] = [
    {
      type: 'input',
      inputType: 'text',
      name: 'firstName',
      label: 'First name',
      icon: 'fe fe-user',
      validations: { required: true },
    },
    {
      type: 'input',
      inputType: 'text',
      name: 'lastName',
      label: 'Last name',
      icon: 'fe fe-user',
      validations: { required: true },
    },
    {
      type: 'input',
      inputType: 'email',
      name: 'email',
      label: 'Email',
      icon: 'fe fe-mail',
      validations: { required: true },
    },
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
      name: 'contactPersonPhone',
      label: 'Phone',
      icon: 'fe fe-phone',
      validations: { required: true },
    },
  ];

  private readonly stepFieldNames: string[][] = [
    ['companyName', 'companyAddress', 'city', 'country', 'postalCode'],
    ['firstName', 'lastName', 'email', 'password', 'contactPersonPhone'],
  ];

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      companyAddress: [''],
      city: [''],
      country: [''],
      postalCode: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      contactPersonPhone: ['', Validators.required],
    });
  }

  get activeStep(): CreateStep {
    return this.steps[this.currentStep];
  }

  get formConfig(): FormFieldConfig[] {
    return this.currentStep === 0 ? this.companyFields : this.personalFields;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }
    if (!this.isLastStep) {
      this.currentStep += 1;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
    }
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length || index === this.currentStep) {
      return;
    }
    if (index < this.currentStep) {
      this.currentStep = index;
      return;
    }
    while (this.currentStep < index) {
      if (!this.validateCurrentStep()) {
        return;
      }
      this.currentStep += 1;
    }
  }

  submit(): void {
    if (!this.validateCurrentStep() || this.form.invalid) {
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
        error: () => {
          this.saving = false;
        },
      });
  }

  private validateCurrentStep(): boolean {
    let valid = true;
    for (const name of this.stepFieldNames[this.currentStep]) {
      const control = this.form.get(name);
      if (!control) {
        continue;
      }
      control.markAsTouched();
      if (control.invalid) {
        valid = false;
      }
    }
    return valid;
  }
}
