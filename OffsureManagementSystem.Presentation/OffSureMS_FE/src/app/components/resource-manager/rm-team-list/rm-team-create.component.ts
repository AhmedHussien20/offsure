import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { UpsertTeamMemberSkillDto } from 'app/core/models/team-members/team-member.models';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamMemberSkillsEditorComponent } from 'app/shared/components/team-member-skills-editor/team-member-skills-editor.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-rm-team-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, TeamMemberSkillsEditorComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Team Member</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
      <hr class="my-3" />
      <h6 class="mb-1">Skills</h6>
      <p class="text-muted small mb-2">Select skills and set proficiency for this member.</p>
      <app-team-member-skills-editor mode="draft" (assignmentsChange)="onSkillsChange($event)" />
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Member' }}
      </button>
    </div>
  `,
})
export class RmTeamCreateComponent {
  saving = false;
  skillAssignments: UpsertTeamMemberSkillDto[] = [];
  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'firstName', label: 'First Name', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'lastName', label: 'Last Name', validations: { required: true } },
    { type: 'input', inputType: 'email', name: 'email', label: 'Email', validations: { required: true } },
    { type: 'input', inputType: 'password', name: 'password', label: 'Password', validations: { required: true, minlength: 8 } },
    { type: 'input', inputType: 'text', name: 'title', label: 'Job Title', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'phoneNumber', label: 'Phone' },
    { type: 'input', inputType: 'number', name: 'yearsOfExperience', label: 'Years of Experience' },
  ];

  constructor(
    private fb: FormBuilder,
    private portal: ResourceManagerPortalService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      title: ['', Validators.required],
      phoneNumber: [''],
      yearsOfExperience: [null],
      isAvailable: [true],
    });
  }

  onSkillsChange(skills: UpsertTeamMemberSkillDto[]): void {
    this.skillAssignments = skills;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.portal
      .createTeamMember({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        title: raw.title.trim(),
        phoneNumber: raw.phoneNumber?.trim(),
        yearsOfExperience: raw.yearsOfExperience != null ? Number(raw.yearsOfExperience) : undefined,
        isAvailable: true,
        skillAssignments: this.skillAssignments.length ? this.skillAssignments : undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Team member created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.saving = false;
        },
      });
  }
}
