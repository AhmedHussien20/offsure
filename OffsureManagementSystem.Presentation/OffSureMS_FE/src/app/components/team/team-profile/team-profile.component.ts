import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { TeamMemberDto, TeamMemberSkillDto } from 'app/core/models/team-members/team-member.models';
import { SkillsService } from 'app/core/services/skills.service';
import { TeamContextService } from 'app/core/services/team-context.service';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { PROFICIENCY_LABELS } from '../team.constants';

@Component({
  selector: 'app-team-profile',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule],
  templateUrl: './team-profile.component.html',
  styleUrl: './team-profile.component.scss',
})
export class TeamProfileComponent implements OnInit {
  profile: TeamMemberDto | null = null;
  skillCatalog: SkillDto[] = [];
  loading = true;
  savingProfile = false;
  savingSkill = false;
  cvBusy = false;

  profileForm!: FormGroup;
  skillForm!: FormGroup;
  proficiencyLabels = PROFICIENCY_LABELS;

  constructor(
    private teamContext: TeamContextService,
    private teamPortal: TeamPortalService,
    private skillsService: SkillsService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      title: ['', Validators.required],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      phoneNumber: [''],
    });

    this.skillForm = this.fb.group({
      skillId: [null, Validators.required],
      proficiencyLevel: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
    });

    this.skillsService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe({
      next: res => {
        this.skillCatalog = res.data?.data ?? [];
      },
    });

    this.loadProfile();
  }

  get skills(): TeamMemberSkillDto[] {
    return this.profile?.skillAssignments ?? [];
  }

  proficiencyLabel(level: number): string {
    return this.proficiencyLabels[level] ?? `Level ${level}`;
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

  addSkill(): void {
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      return;
    }

    const raw = this.skillForm.getRawValue();
    this.savingSkill = true;
    this.teamPortal
      .assignSkill({
        skillId: Number(raw.skillId),
        proficiencyLevel: Number(raw.proficiencyLevel),
        yearsOfExperience: Number(raw.yearsOfExperience),
      })
      .subscribe({
        next: res => {
          this.profile = res.data ?? this.profile;
          this.skillForm.reset({ skillId: null, proficiencyLevel: 3, yearsOfExperience: 0 });
          this.toastr.success('Skill added.');
          this.savingSkill = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to add skill.');
          this.savingSkill = false;
        },
      });
  }

  removeSkill(skillId: number): void {
    this.teamPortal.removeSkill(skillId).subscribe({
      next: res => {
        this.profile = res.data ?? this.profile;
        this.toastr.success('Skill removed.');
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to remove skill.');
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
