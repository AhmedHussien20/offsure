import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import {
  resolveStorageAssetUrl,
  TeamMemberCertificateDto,
  TeamMemberDto,
  TeamMemberExperienceDto,
  TeamMemberSkillDto,
  teamMemberDisplayName,
  UpsertTeamMemberCertificateDto,
  UpsertTeamMemberExperienceDto,
} from 'app/core/models/team-members/team-member.models';
import { TeamContextService } from 'app/core/services/team-context.service';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { ChangePasswordCardComponent } from 'app/shared/components/change-password-card/change-password-card.component';
import { TeamMemberSkillsEditorComponent } from 'app/shared/components/team-member-skills-editor/team-member-skills-editor.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

const CV_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export type TeamProfileTab = 'personal' | 'skills' | 'documents';

@Component({
  selector: 'app-team-profile',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    RouterModule,
    NgbNavModule,
    TeamMemberSkillsEditorComponent,
    ChangePasswordCardComponent,
  ],
  templateUrl: './team-profile.component.html',
  styleUrl: './team-profile.component.scss',
})
export class TeamProfileComponent implements OnInit {
  profile: TeamMemberDto | null = null;
  loading = true;
  activeTab: TeamProfileTab = 'personal';

  editingPersonalInfo = false;
  savingProfile = false;
  photoUploading = false;

  cvBusy = false;
  cvDragOver = false;

  showCertificateForm = false;
  editingCertificateId: number | null = null;
  savingCertificate = false;
  certificateForm!: FormGroup;

  showExperienceForm = false;
  editingExperienceId: number | null = null;
  savingExperience = false;
  experienceForm!: FormGroup;

  profileForm!: FormGroup;

  constructor(
    private teamContext: TeamContextService,
    private teamPortal: TeamPortalService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      title: ['', Validators.required],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      phoneNumber: [''],
    });

    this.certificateForm = this.fb.group({
      name: ['', Validators.required],
      issuer: ['', Validators.required],
      issuedDate: ['', Validators.required],
      expiryDate: [''],
    });

    this.experienceForm = this.fb.group({
      jobTitle: ['', Validators.required],
      company: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      description: [''],
    });

    this.loadProfile();
  }

  get displayName(): string {
    return teamMemberDisplayName(this.profile);
  }

  get initials(): string {
    if (!this.profile) return '';
    const first = this.profile.firstName?.charAt(0) ?? '';
    const last = this.profile.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }

  get photoUrl(): string | null {
    if (!this.profile) return null;
    return resolveStorageAssetUrl(this.profile.profilePhotoUrl ?? this.profile.profilePhoto);
  }

  get skills(): TeamMemberSkillDto[] {
    return this.profile?.skillAssignments ?? [];
  }

  get certificates(): TeamMemberCertificateDto[] {
    return [...(this.profile?.certificates ?? [])].sort(
      (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
    );
  }

  get experiences(): TeamMemberExperienceDto[] {
    return [...(this.profile?.experiences ?? [])].sort((a, b) => {
      const aStart = new Date(a.startDate).getTime();
      const bStart = new Date(b.startDate).getTime();
      if (bStart !== aStart) return bStart - aStart;
      return (b.displayOrder ?? 0) - (a.displayOrder ?? 0);
    });
  }

  get cvFileName(): string | null {
    if (!this.profile) return null;
    if (this.profile.cvFileName) return this.profile.cvFileName;
    if (!this.profile.cv) return null;
    const parts = this.profile.cv.split(/[/\\]/);
    return parts[parts.length - 1] || this.profile.cv;
  }

  get hasCv(): boolean {
    return !!(this.profile?.cv || this.profile?.cvFileName);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateRange(start: string, end?: string | null): string {
    const startLabel = this.formatDate(start);
    const endLabel = end ? this.formatDate(end) : 'Present';
    return `${startLabel} – ${endLabel}`;
  }

  toggleEditPersonalInfo(): void {
    if (this.editingPersonalInfo) {
      this.cancelPersonalInfoEdit();
      return;
    }
    this.activeTab = 'personal';
    this.patchProfileForm();
    this.editingPersonalInfo = true;
  }

  cancelPersonalInfoEdit(): void {
    this.editingPersonalInfo = false;
    this.patchProfileForm();
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
          this.applyProfile(res.data);
          this.teamContext.loadProfile(true).subscribe();
          this.toastr.success('Profile updated.');
          this.savingProfile = false;
          this.editingPersonalInfo = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update profile.');
          this.savingProfile = false;
        },
      });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Please choose an image file.');
      input.value = '';
      return;
    }

    if (file.size > PHOTO_MAX_BYTES) {
      this.toastr.error('Profile photo must be 2MB or smaller.');
      input.value = '';
      return;
    }

    this.photoUploading = true;
    this.teamPortal.uploadProfilePhoto(file).subscribe({
      next: res => {
        this.applyProfile(res.data);
        this.teamContext.loadProfile(true).subscribe();
        this.toastr.success('Profile photo updated.');
        this.photoUploading = false;
        input.value = '';
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to upload photo.');
        this.photoUploading = false;
        input.value = '';
      },
    });
  }

  onSkillsProfileChange(profile: TeamMemberDto): void {
    this.profile = profile;
  }

  downloadCv(): void {
    if (!this.hasCv) return;

    this.cvBusy = true;
    this.teamPortal.downloadCv().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = this.cvFileName ?? 'cv.pdf';
        anchor.click();
        URL.revokeObjectURL(url);
        this.cvBusy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to download CV.');
        this.cvBusy = false;
      },
    });
  }

  async deleteCv(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Remove CV',
      message: 'Remove your uploaded CV? You can upload a new one later.',
      confirmLabel: 'Remove CV',
      variant: 'danger',
    });
    if (!confirmed) return;

    this.cvBusy = true;
    this.teamPortal.deleteCv().subscribe({
      next: () => {
        this.loadProfile();
        this.toastr.success('CV removed.');
        this.cvBusy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to remove CV.');
        this.cvBusy = false;
      },
    });
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadCvFile(file);
    }
    input.value = '';
  }

  onCvDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cvDragOver = true;
  }

  onCvDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cvDragOver = false;
  }

  onCvDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cvDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.uploadCvFile(file);
    }
  }

  openCertificateForm(certificate?: TeamMemberCertificateDto): void {
    this.showCertificateForm = true;
    if (certificate) {
      this.editingCertificateId = certificate.id;
      this.certificateForm.patchValue({
        name: certificate.name,
        issuer: certificate.issuer,
        issuedDate: this.toDateInputValue(certificate.issuedDate),
        expiryDate: certificate.expiryDate ? this.toDateInputValue(certificate.expiryDate) : '',
      });
    } else {
      this.editingCertificateId = null;
      this.certificateForm.reset({ name: '', issuer: '', issuedDate: '', expiryDate: '' });
    }
  }

  cancelCertificateForm(): void {
    this.showCertificateForm = false;
    this.editingCertificateId = null;
    this.certificateForm.reset({ name: '', issuer: '', issuedDate: '', expiryDate: '' });
  }

  saveCertificate(): void {
    if (this.certificateForm.invalid) {
      this.certificateForm.markAllAsTouched();
      return;
    }

    const raw = this.certificateForm.getRawValue();
    const dto: UpsertTeamMemberCertificateDto = {
      name: String(raw.name).trim(),
      issuer: String(raw.issuer).trim(),
      issuedDate: raw.issuedDate,
      expiryDate: raw.expiryDate ? String(raw.expiryDate) : undefined,
    };

    this.savingCertificate = true;
    const request =
      this.editingCertificateId != null
        ? this.teamPortal.updateCertificate(this.editingCertificateId, dto)
        : this.teamPortal.addCertificate(dto);

    request.subscribe({
      next: res => {
        this.applyProfile(res.data);
        this.toastr.success(this.editingCertificateId != null ? 'Certificate updated.' : 'Certificate added.');
        this.savingCertificate = false;
        this.cancelCertificateForm();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to save certificate.');
        this.savingCertificate = false;
      },
    });
  }

  async deleteCertificate(certificate: TeamMemberCertificateDto): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete certificate',
      message: `Remove "${certificate.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    this.teamPortal.deleteCertificate(certificate.id).subscribe({
      next: res => {
        this.applyProfile(res.data);
        this.toastr.success('Certificate removed.');
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to delete certificate.');
      },
    });
  }

  openExperienceForm(experience?: TeamMemberExperienceDto): void {
    this.showExperienceForm = true;
    if (experience) {
      this.editingExperienceId = experience.id;
      this.experienceForm.patchValue({
        jobTitle: experience.jobTitle,
        company: experience.company,
        startDate: this.toDateInputValue(experience.startDate),
        endDate: experience.endDate ? this.toDateInputValue(experience.endDate) : '',
        description: experience.description ?? '',
      });
    } else {
      this.editingExperienceId = null;
      this.experienceForm.reset({
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
      });
    }
  }

  cancelExperienceForm(): void {
    this.showExperienceForm = false;
    this.editingExperienceId = null;
    this.experienceForm.reset({
      jobTitle: '',
      company: '',
      startDate: '',
      endDate: '',
      description: '',
    });
  }

  saveExperience(): void {
    if (this.experienceForm.invalid) {
      this.experienceForm.markAllAsTouched();
      return;
    }

    const raw = this.experienceForm.getRawValue();
    const dto: UpsertTeamMemberExperienceDto = {
      jobTitle: String(raw.jobTitle).trim(),
      company: String(raw.company).trim(),
      startDate: raw.startDate,
      endDate: raw.endDate ? String(raw.endDate) : undefined,
      description: raw.description ? String(raw.description).trim() : undefined,
    };

    this.savingExperience = true;
    const request =
      this.editingExperienceId != null
        ? this.teamPortal.updateExperience(this.editingExperienceId, dto)
        : this.teamPortal.addExperience(dto);

    request.subscribe({
      next: res => {
        this.applyProfile(res.data);
        this.toastr.success(this.editingExperienceId != null ? 'Experience updated.' : 'Experience added.');
        this.savingExperience = false;
        this.cancelExperienceForm();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to save experience.');
        this.savingExperience = false;
      },
    });
  }

  async deleteExperience(experience: TeamMemberExperienceDto): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete experience',
      message: `Remove "${experience.jobTitle}" at ${experience.company}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    this.teamPortal.deleteExperience(experience.id).subscribe({
      next: res => {
        this.applyProfile(res.data);
        this.toastr.success('Experience removed.');
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to delete experience.');
      },
    });
  }

  private uploadCvFile(file: File): void {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.toastr.error('CV must be a PDF file.');
      return;
    }

    if (file.size > CV_MAX_BYTES) {
      this.toastr.error('CV must be 5MB or smaller.');
      return;
    }

    this.cvBusy = true;
    this.teamPortal.uploadCv(file).subscribe({
      next: () => {
        this.loadProfile();
        this.toastr.success('CV uploaded.');
        this.cvBusy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to upload CV.');
        this.cvBusy = false;
      },
    });
  }

  private loadProfile(): void {
    this.teamContext.loadProfile(true).subscribe({
      next: profile => {
        this.applyProfile(profile);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private applyProfile(profile: TeamMemberDto | null | undefined): void {
    if (!profile) return;
    this.profile = profile;
    this.patchProfileForm();
  }

  private patchProfileForm(): void {
    if (!this.profile) return;
    this.profileForm.patchValue({
      title: this.profile.title,
      yearsOfExperience: this.profile.yearsOfExperience,
      phoneNumber: this.profile.phoneNumber,
    });
  }

  private toDateInputValue(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
}
