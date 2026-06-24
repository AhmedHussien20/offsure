import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ClientTeamMemberDetailDto } from 'app/core/models/clients/client-team-member.models';
import {
  TeamMemberDto,
  resolveStorageAssetUrl,
  teamMemberDisplayName,
} from 'app/core/models/team-members/team-member.models';
import { AuthService } from 'app/core/services/auth.service';
import { ClientsService } from 'app/core/services/clients.service';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { Observable, map } from 'rxjs';

export type TeamMemberProfileSource = 'client' | 'admin' | 'resource-manager';

export interface TeamMemberProfileView {
  fullName: string;
  title: string;
  yearsOfExperience: number;
  profilePhotoUrl?: string | null;
  skills: string[];
  projectNames: string[];
  certificates: ClientTeamMemberDetailDto['certificates'];
  experiences: ClientTeamMemberDetailDto['experiences'];
}

@Component({
  selector: 'app-team-member-profile-modal',
  standalone: true,
  imports: [CommonModule, NgbNavModule],
  templateUrl: './team-member-profile-modal.component.html',
  styleUrl: './team-member-profile-modal.component.scss',
})
export class TeamMemberProfileModalComponent implements OnInit {
  @Input({ required: true }) memberId!: number;
  @Input() source?: TeamMemberProfileSource;

  activeTab: 'overview' | 'skills' | 'certificates' = 'overview';
  loading = true;
  loadError: string | null = null;
  member: TeamMemberProfileView | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private authService: AuthService,
    private clientsService: ClientsService,
    private teamMembersService: TeamMembersService,
    private rmPortalService: ResourceManagerPortalService
  ) {}

  ngOnInit(): void {
    this.loadMember();
  }

  get photoUrl(): string | null {
    return resolveStorageAssetUrl(this.member?.profilePhotoUrl);
  }

  get initials(): string {
    if (!this.member?.fullName) {
      return '?';
    }
    const parts = this.member.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return this.member.fullName.charAt(0).toUpperCase();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  experiencePeriod(exp: { startDate: string; endDate?: string | null }): string {
    const start = this.formatDate(exp.startDate);
    const end = exp.endDate ? this.formatDate(exp.endDate) : 'Present';
    return `${start} – ${end}`;
  }

  private loadMember(): void {
    this.loading = true;
    this.loadError = null;

    this.resolveLoader().subscribe({
      next: member => {
        this.member = member;
        if (!member) {
          this.loadError = 'Team member not found.';
        }
        this.loading = false;
      },
      error: err => {
        this.loadError = err?.error?.message || 'Failed to load team member profile.';
        this.loading = false;
      },
    });
  }

  private resolveLoader(): Observable<TeamMemberProfileView | null> {
    const source = this.source ?? this.inferSource();
    switch (source) {
      case 'admin':
        return this.teamMembersService.getById(this.memberId).pipe(
          map(res => (res.data ? this.mapTeamMember(res.data) : null))
        );
      case 'resource-manager':
        return this.rmPortalService.getTeamMemberById(this.memberId).pipe(
          map(res => (res.data ? this.mapTeamMember(res.data) : null))
        );
      default:
        return this.clientsService.getTeamMemberDetail(this.memberId).pipe(
          map(res => (res.data ? this.mapClientMember(res.data) : null))
        );
    }
  }

  private inferSource(): TeamMemberProfileSource {
    if (this.authService.isAdministrator()) {
      return 'admin';
    }
    if (this.authService.isResourceManager()) {
      return 'resource-manager';
    }
    return 'client';
  }

  private mapClientMember(dto: ClientTeamMemberDetailDto): TeamMemberProfileView {
    return {
      fullName: dto.fullName,
      title: dto.title,
      yearsOfExperience: dto.yearsOfExperience,
      profilePhotoUrl: dto.profilePhotoUrl,
      skills: dto.skills ?? [],
      projectNames: dto.projectNames ?? [],
      certificates: dto.certificates ?? [],
      experiences: dto.experiences ?? [],
    };
  }

  private mapTeamMember(dto: TeamMemberDto): TeamMemberProfileView {
    return {
      fullName: teamMemberDisplayName(dto),
      title: dto.title,
      yearsOfExperience: dto.yearsOfExperience,
      profilePhotoUrl: dto.profilePhotoUrl ?? dto.profilePhoto,
      skills: (dto.skillAssignments ?? []).map(s => s.skillName).filter(Boolean),
      projectNames: [],
      certificates: (dto.certificates ?? []).map(cert => ({
        name: cert.name,
        issuer: cert.issuer,
        issuedDate: cert.issuedDate,
        expiryDate: cert.expiryDate,
      })),
      experiences: (dto.experiences ?? []).map(exp => ({
        jobTitle: exp.jobTitle,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description ?? '',
      })),
    };
  }
}
