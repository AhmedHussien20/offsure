import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ClientsService } from 'app/core/services/clients.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-client-member-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add organization user</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">
        @if (selectCompany) {
          Choose a company, then create a member login for that organization.
        } @else {
          Creates a member login under
          <strong>{{ companyName || 'this organization' }}</strong>.
        }
        Members use the client portal and only see their own projects and requests.
      </p>
      @if (loadingCompanies) {
        <p class="text-muted small mb-0">Loading companies…</p>
      } @else {
        <app-generic-form
          [formGroup]="form"
          [formConfig]="formConfig"
          [showSubmit]="false"
          class="generic-form"></app-generic-form>
      }
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="saving || loadingCompanies"
        (click)="submit()">
        {{ saving ? 'Saving...' : 'Save user' }}
      </button>
    </div>
  `,
})
export class AdminClientMemberCreateComponent implements OnInit {
  /** When set, company is fixed (e.g. opened from organization detail). */
  @Input() ownerClientId?: number;
  @Input() companyName = '';
  /** When true (or ownerClientId missing), show company dropdown. */
  @Input() selectCompany = false;

  saving = false;
  loadingCompanies = false;
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];

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
    { type: 'input', inputType: 'text', name: 'contactPersonPhone', label: 'Phone', icon: 'fe fe-phone' },
  ];

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      ownerClientId: [null as number | null],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      contactPersonPhone: [''],
    });
  }

  ngOnInit(): void {
    const needsCompanySelect = this.selectCompany || !this.ownerClientId;
    if (needsCompanySelect) {
      this.selectCompany = true;
      this.form.get('ownerClientId')?.setValidators([Validators.required]);
      this.form.get('ownerClientId')?.updateValueAndValidity();
      this.loadCompanies();
    } else {
      this.form.patchValue({ ownerClientId: this.ownerClientId });
      this.formConfig = [...this.personalFields];
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const ownerId = Number(raw.ownerClientId || this.ownerClientId);
    if (!ownerId) {
      this.toastr.error('Please select a company.');
      return;
    }

    this.saving = true;
    this.clientsService
      .createOrganizationMember(ownerId, {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        contactPersonPhone: raw.contactPersonPhone?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Organization user created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  private loadCompanies(): void {
    this.loadingCompanies = true;
    this.clientsService
      .getAll({
        pageIndex: 1,
        pageSize: 200,
        ownersOnly: true,
        isActive: true,
        sortColumn: 'CompanyName',
        sortDirection: 'ASC',
      } as any)
      .subscribe({
        next: res => {
          const options = (res.data?.data ?? []).map(c => ({
            label: c.companyName,
            value: c.id,
          }));
          this.formConfig = [
            {
              type: 'select',
              name: 'ownerClientId',
              label: 'Company',
              icon: 'fe fe-briefcase',
              placeholder: 'Select company',
              validations: { required: true },
              options,
            },
            ...this.personalFields,
          ];
          this.loadingCompanies = false;
        },
        error: () => {
          this.loadingCompanies = false;
          this.toastr.error('Unable to load companies.');
          this.formConfig = [...this.personalFields];
        },
      });
  }
}
