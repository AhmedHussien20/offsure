import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeamMemberDto, TeamMemberSkillDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { TeamContextService } from 'app/core/services/team-context.service';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { ChangePasswordCardComponent } from 'app/shared/components/change-password-card/change-password-card.component';
import { TeamMemberSkillsEditorComponent } from 'app/shared/components/team-member-skills-editor/team-member-skills-editor.component';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-team-profile',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NgbNavModule,
    ReactiveFormsModule,
    RouterModule,
    TeamMemberSkillsEditorComponent,
    ChangePasswordCardComponent,
  ],
  templateUrl: './team-profile.component.html',
  styleUrl: './team-profile.component.scss',
})
export class TeamProfileComponent implements OnInit {
  profile: TeamMemberDto | null = null;
  loading = true;
  savingProfile = false;
  cvBusy = false;

  profileForm!: FormGroup;

  constructor(
    private teamContext: TeamContextService,
    private teamPortal: TeamPortalService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      title: ['', Validators.required],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      phoneNumber: [''],
    });

    this.loadProfile();
  }

  get displayName(): string {
    return teamMemberDisplayName(this.profile);
  }

  get skills(): TeamMemberSkillDto[] {
    return this.profile?.skillAssignments ?? [];
  }

  onSkillsProfileChange(profile: TeamMemberDto): void {
    this.profile = profile;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    const raw = this.profileForm.getRawValue();
    this.teamPortal
      .updateProfile({
        title: String(raw.title).trim(),
        yearsOfExperience: Number(raw.yearsOfExperience),
        phoneNumber: raw.phoneNumber ? String(raw.phoneNumber).trim() : undefined,
      })
      .subscribe({
        next: res => {
          this.profile = res.data ?? this.profile;
          this.teamContext.loadProfile(true).subscribe();
          this.toastr.success('Profile updated.');
          this.savingProfile = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update profile.');
          this.savingProfile = false;
        },
      });
  }

  generateCv(): void {
    this.cvBusy = true;
    this.teamPortal.generateCv().subscribe({
      next: () => {
        this.loadProfile();
        this.toastr.success('CV generated.');
        this.cvBusy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to generate CV.');
        this.cvBusy = false;
      },
    });
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.cvBusy = true;
    this.teamPortal.uploadCv(file).subscribe({
      next: () => {
        this.loadProfile();
        this.toastr.success('CV uploaded.');
        this.cvBusy = false;
        input.value = '';
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to upload CV.');
        this.cvBusy = false;
        input.value = '';
      },
    });
  }

  private loadProfile(): void {
    this.teamContext.loadProfile(true).subscribe({
      next: profile => {
        this.profile = profile;
        if (profile) {
          this.profileForm.patchValue({
            title: profile.title,
            yearsOfExperience: profile.yearsOfExperience,
            phoneNumber: profile.phoneNumber,
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
