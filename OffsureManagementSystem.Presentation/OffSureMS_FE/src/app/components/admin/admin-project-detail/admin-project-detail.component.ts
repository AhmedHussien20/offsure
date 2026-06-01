import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { TeamMemberDto } from 'app/core/models/team-members/team-member.models';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { PROJECT_STATUS_BADGES } from '../admin.constants';

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-project-detail.component.html',
})
export class AdminProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  loading = true;
  teamMembers: TeamMemberDto[] = [];
  assignForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private teamMembersService: TeamMembersService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.assignForm = this.fb.group({
      teamMemberId: [null, Validators.required],
      role: ['', Validators.required],
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading = false;
      return;
    }

    this.teamMembersService
      .getAll({ pageIndex: 1, pageSize: 200, isAvailable: true } as any)
      .subscribe(res => {
        this.teamMembers = res.data?.data ?? [];
      });

    this.projectsService.getById(id).subscribe({
      next: res => {
        this.project = res.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusBadgeClass(status: string): string {
    return PROJECT_STATUS_BADGES[status]?.class ?? 'bg-light';
  }

  statusLabel(status: string): string {
    return PROJECT_STATUS_BADGES[status]?.text ?? status;
  }

  assignMember(): void {
    if (!this.project || this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const raw = this.assignForm.getRawValue();
    this.projectsService
      .assignTeamMember(this.project.id, {
        teamMemberId: Number(raw.teamMemberId),
        role: String(raw.role).trim(),
      })
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.toastr.success('Team member assigned.');
          this.assignForm.reset();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to assign team member.');
        },
      });
  }

  removeMember(teamMemberId: number): void {
    if (!this.project) return;

    this.projectsService.removeTeamMember(this.project.id, teamMemberId).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.toastr.success('Team member removed.');
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to remove team member.');
      },
    });
  }
}
