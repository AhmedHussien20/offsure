import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { UpsertTeamMemberSkillDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamMemberSkillsEditorComponent } from 'app/shared/components/team-member-skills-editor/team-member-skills-editor.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-team-form',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    GenericFormComponent,
    TeamMemberSkillsEditorComponent,
  ],
  templateUrl: './admin-team-form.component.html',
})
export class AdminTeamFormComponent implements OnInit {
  formGroup!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  skillAssignments: UpsertTeamMemberSkillDto[] = [];

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      title: [''],
      phoneNumber: [''],
      yearsOfExperience: [null],
      hourlySalary: [null],
      isAvailable: [true],
    });

    this.formConfig = [
      { type: 'input', inputType: 'text', name: 'firstName', label: 'First Name', validations: { required: true } },
      { type: 'input', inputType: 'text', name: 'lastName', label: 'Last Name', validations: { required: true } },
      { type: 'input', inputType: 'email', name: 'email', label: 'Email', validations: { required: true } },
      { type: 'input', inputType: 'password', name: 'password', label: 'Password', validations: { required: true, minlength: 8 } },
      { type: 'input', inputType: 'text', name: 'title', label: 'Job Title' },
      { type: 'input', inputType: 'text', name: 'phoneNumber', label: 'Phone' },
      { type: 'input', inputType: 'number', name: 'yearsOfExperience', label: 'Years of Experience' },
      {
        type: 'input',
        inputType: 'number',
        name: 'hourlySalary',
        label: 'Hourly salary ($)',
        placeholder: 'Default rate per hour',
      },
    ];
  }

  onSkillsChange(skills: UpsertTeamMemberSkillDto[]): void {
    this.skillAssignments = skills;
  }

  onSubmit(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const raw = this.formGroup.getRawValue();
    this.teamMembersService
      .create({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        title: raw.title?.trim(),
        phoneNumber: raw.phoneNumber?.trim(),
        yearsOfExperience: raw.yearsOfExperience != null ? Number(raw.yearsOfExperience) : undefined,
        hourlySalary: raw.hourlySalary != null && raw.hourlySalary !== '' ? Number(raw.hourlySalary) : undefined,
        isAvailable: true,
        skillAssignments: this.skillAssignments.length ? this.skillAssignments : undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Team member created.');
          this.router.navigate(['/admin/team']);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create team member.');
        },
      });
  }
}
