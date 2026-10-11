import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamDto, TeamMemberOptionDto, topTeamSkills } from 'app/core/models/teams/team.models';
import { TeamsService } from 'app/core/services/teams.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamCardComponent } from 'app/shared/components/team-card/team-card.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ADMIN_TEAM_FORM_CONFIG, adminTeamFormValue, buildAdminTeamForm } from './admin-team-form.config';
import { AdminTeamMemberPickerComponent } from './admin-team-member-picker.component';

const ALLOWED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Component({
  selector: 'app-admin-team-detail-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, TeamCardComponent, AdminTeamMemberPickerComponent],
  templateUrl: './admin-team-detail-panel.component.html',
  styleUrl: './admin-team-detail-panel.component.scss',
})
export class AdminTeamDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) teamId!: number;
  @Output() changed = new EventEmitter<void>();

  readonly formConfig = ADMIN_TEAM_FORM_CONFIG;

  loading = false;
  loadError: string | null = null;
  team: TeamDto | null = null;

  editing = false;
  saving = false;
  deleting = false;
  form: FormGroup;

  memberOptions: TeamMemberOptionDto[] = [];
  selectedMemberIds = new Set<number>();

  pendingCoverFile: File | null = null;
  pendingCoverPreviewUrl: string | null = null;
  coverError: string | null = null;

  private readonly brokenPhotos = new Set<number>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private teamsService: TeamsService,
    private confirmDialog: ConfirmDialogService,
    private toastr: ToastrService
  ) {
    this.form = buildAdminTeamForm(fb);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teamId'] && this.teamId) {
      this.cancelEdit();
      this.loadTeam();
      this.loadMemberOptions();
    }
  }

  ngOnDestroy(): void {
    this.revokePendingCoverPreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentMembers(): TeamMemberOptionDto[] {
    return this.memberOptions.filter(m => m.teamId === this.teamId);
  }

  private get previewMembers(): TeamMemberOptionDto[] {
    return this.editing
      ? this.memberOptions.filter(m => this.selectedMemberIds.has(m.id))
      : this.currentMembers;
  }

  get previewName(): string {
    return this.editing ? String(this.form.get('name')?.value ?? '').trim() : this.team?.name ?? '';
  }

  get previewDescription(): string {
    return this.editing ? String(this.form.get('description')?.value ?? '').trim() : this.team?.description ?? '';
  }

  get previewCoverImageUrl(): string | null {
    return this.pendingCoverPreviewUrl ?? this.team?.coverImageUrl ?? null;
  }

  get previewSkills(): string[] {
    return this.editing ? topTeamSkills(this.previewMembers) : this.team?.topSkills ?? [];
  }

  get previewMemberCount(): number {
    return this.editing ? this.selectedMemberIds.size : this.team?.memberCount ?? 0;
  }

  get previewFaces(): TeamMemberOptionDto[] {
    return this.previewMembers.slice(0, 4);
  }

  display(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }

  photoSrc(member: TeamMemberOptionDto): string | null {
    return this.brokenPhotos.has(member.id) ? null : resolveStorageAssetUrl(member.profilePhotoUrl);
  }

  onPhotoError(member: TeamMemberOptionDto): void {
    this.brokenPhotos.add(member.id);
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }

  avatarColor(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #4f46e5)',
      'linear-gradient(135deg, #0ea5e9, #0284c7)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ec4899, #db2777)',
      'linear-gradient(135deg, #14b8a6, #0d9488)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  startEdit(): void {
    if (!this.team) return;
    this.form = buildAdminTeamForm(this.fb, this.team);
    this.selectedMemberIds = new Set(this.currentMembers.map(m => m.id));
    this.pendingCoverFile = null;
    this.coverError = null;
    this.revokePendingCoverPreview();
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    this.pendingCoverFile = null;
    this.coverError = null;
    this.revokePendingCoverPreview();
    if (this.team) {
      this.form = buildAdminTeamForm(this.fb, this.team);
      this.selectedMemberIds = new Set(this.currentMembers.map(m => m.id));
    }
  }

  saveEdit(): void {
    if (!this.team || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = {
      ...adminTeamFormValue(this.form),
      teamMemberIds: Array.from(this.selectedMemberIds),
    };

    this.teamsService
      .update(this.team.id, payload)
      .pipe(
        switchMap(res => {
          this.team = res.data ?? this.team;
          if (this.pendingCoverFile) {
            return this.teamsService.uploadCover(this.team!.id, this.pendingCoverFile);
          }
          return of(res);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: res => {
          this.toastr.success('Team updated.');
          this.saving = false;
          this.editing = false;
          this.pendingCoverFile = null;
          this.coverError = null;
          this.revokePendingCoverPreview();
          this.team = res.data ?? this.team;
          this.changed.emit();
          this.loadMemberOptions();
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  async deleteTeam(): Promise<void> {
    if (!this.team) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete team',
      message: `Delete ${this.team.name}? Its members stay in the system and move to "Other specialists".`,
      confirmLabel: 'Delete',
      icon: 'ti-trash',
    });
    if (!confirmed) return;

    this.deleting = true;
    this.teamsService
      .delete(this.team.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Team deleted.');
          this.deleting = false;
          this.changed.emit();
        },
        error: () => {
          this.deleting = false;
        },
      });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      this.coverError = 'Choose a JPG, PNG, or WEBP image.';
      this.toastr.warning(this.coverError);
      return;
    }

    this.coverError = null;
    this.revokePendingCoverPreview();
    this.pendingCoverFile = file;
    this.pendingCoverPreviewUrl = URL.createObjectURL(file);
  }

  clearPendingCover(): void {
    this.revokePendingCoverPreview();
    this.pendingCoverFile = null;
    this.coverError = null;
  }

  private revokePendingCoverPreview(): void {
    if (this.pendingCoverPreviewUrl) {
      URL.revokeObjectURL(this.pendingCoverPreviewUrl);
      this.pendingCoverPreviewUrl = null;
    }
  }

  private loadTeam(): void {
    this.loading = true;
    this.loadError = null;
    this.team = null;

    this.teamsService
      .getById(this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.team = res.data ?? null;
          if (!this.team) {
            this.loadError = 'Team not found.';
          } else {
            this.form = buildAdminTeamForm(this.fb, this.team);
            this.selectedMemberIds = new Set(this.currentMembers.map(m => m.id));
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load team.';
          this.loading = false;
        },
      });
  }

  private loadMemberOptions(): void {
    this.teamsService
      .getMemberOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.memberOptions = res.data ?? [];
        if (this.team && !this.editing) {
          this.selectedMemberIds = new Set(this.currentMembers.map(m => m.id));
        }
      });
  }
}
