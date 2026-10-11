import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamMemberOptionDto, topTeamSkills } from 'app/core/models/teams/team.models';
import { TeamsService } from 'app/core/services/teams.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamCardComponent } from 'app/shared/components/team-card/team-card.component';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ADMIN_TEAM_FORM_CONFIG, adminTeamFormValue, buildAdminTeamForm } from './admin-team-form.config';
import { AdminTeamMemberPickerComponent } from './admin-team-member-picker.component';
import { AdminTeamSettingsFieldsComponent } from './admin-team-settings-fields.component';

const ALLOWED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Two steps: 1) details and cover, 2) members. The team is created on the last step. */
@Component({
  selector: 'app-admin-team-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, TeamCardComponent, AdminTeamMemberPickerComponent, AdminTeamSettingsFieldsComponent],
  templateUrl: './admin-team-create.component.html',
  styleUrl: './admin-team-create.component.scss',
})
export class AdminTeamCreateComponent implements OnInit, OnDestroy {
  readonly formConfig = ADMIN_TEAM_FORM_CONFIG;

  step: 1 | 2 = 1;
  form: FormGroup;
  saving = false;

  coverFile: File | null = null;
  coverPreviewUrl: string | null = null;
  coverError: string | null = null;

  memberOptions: TeamMemberOptionDto[] = [];
  membersLoading = true;
  selectedMemberIds = new Set<number>();

  constructor(
    fb: FormBuilder,
    private teamsService: TeamsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = buildAdminTeamForm(fb);
  }

  ngOnInit(): void {
    this.teamsService.getMemberOptions().subscribe({
      next: res => {
        this.memberOptions = res.data ?? [];
        this.membersLoading = false;
      },
      error: () => {
        this.membersLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.revokeCoverPreview();
  }

  get previewName(): string {
    return String(this.form.get('name')?.value ?? '').trim();
  }

  get previewDescription(): string {
    return String(this.form.get('description')?.value ?? '').trim();
  }

  get selectedMembers(): TeamMemberOptionDto[] {
    return this.memberOptions.filter(m => this.selectedMemberIds.has(m.id));
  }

  get previewSkills(): string[] {
    return topTeamSkills(this.selectedMembers);
  }

  get previewFaces() {
    return this.selectedMembers.slice(0, 4);
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      this.coverError = 'Choose a JPG, PNG, or WEBP image.';
      return;
    }

    this.coverError = null;
    this.revokeCoverPreview();
    this.coverFile = file;
    this.coverPreviewUrl = URL.createObjectURL(file);
  }

  clearCover(): void {
    this.revokeCoverPreview();
    this.coverFile = null;
    this.coverError = null;
  }

  next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  back(): void {
    this.step = 1;
  }

  create(): void {
    if (this.form.invalid) {
      this.step = 1;
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.teamsService
      .create(adminTeamFormValue(this.form))
      .pipe(
        switchMap(res => {
          const teamId = res.data?.id;
          if (!teamId) return of(null);
          return this.afterCreate(teamId);
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Team created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: () => {
          // The team may already exist even if the cover or members step failed; refresh the list either way.
          this.saving = false;
          this.toastr.warning('The team was saved, but some details could not be added. Open it to finish.');
          this.activeModal.close(true);
        },
      });
  }

  private afterCreate(teamId: number): Observable<unknown> {
    const cover$: Observable<unknown> = this.coverFile
      ? this.teamsService.uploadCover(teamId, this.coverFile)
      : of(null);

    return cover$.pipe(
      switchMap(() =>
        this.selectedMemberIds.size
          ? this.teamsService.setMembers(teamId, [...this.selectedMemberIds])
          : of(null)
      )
    );
  }

  private revokeCoverPreview(): void {
    if (this.coverPreviewUrl) {
      URL.revokeObjectURL(this.coverPreviewUrl);
      this.coverPreviewUrl = null;
    }
  }
}
