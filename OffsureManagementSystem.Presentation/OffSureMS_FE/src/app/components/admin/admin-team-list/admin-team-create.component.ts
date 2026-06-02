import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-team-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Team Member</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Member' }}
      </button>
    </div>
  `,
})
export class AdminTeamCreateComponent {
  saving = false;
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'firstName', label: 'First Name', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'lastName', label: 'Last Name', validations: { required: true } },
    { type: 'input', inputType: 'email', name: 'email', label: 'Email', validations: { required: true } },
    { type: 'input', inputType: 'password', name: 'password', label: 'Password', validations: { required: true, minlength: 8 } },
    { type: 'input', inputType: 'text', name: 'title', label: 'Job Title' },
    { type: 'input', inputType: 'text', name: 'phoneNumber', label: 'Phone' },
    { type: 'input', inputType: 'number', name: 'yearsOfExperience', label: 'Years of Experience' },
  ];

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      title: [''],
      phoneNumber: [''],
      yearsOfExperience: [null],
      isAvailable: [true],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.teamMembersService
      .create({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        title: raw.title?.trim(),
        phoneNumber: raw.phoneNumber?.trim(),
        yearsOfExperience: raw.yearsOfExperience != null ? Number(raw.yearsOfExperience) : undefined,
        isAvailable: true,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Team member created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create team member.');
          this.saving = false;
        },
      });
  }
}
