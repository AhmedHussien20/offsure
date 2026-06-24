import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import {
  CLIENT_TEAM_EXPERIENCE_BANDS,
  ClientTeamExperienceBand,
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
} from 'app/core/models/clients/client-team-member.models';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { TeamMemberProfileModalComponent } from 'app/shared/components/team-member-profile-modal/team-member-profile-modal.component';

const SKILL_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 12;

@Component({
  selector: 'app-client-team-members-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, NgbPaginationModule],
  templateUrl: './client-team-members-list.component.html',
  styleUrl: './client-team-members-list.component.scss',
})
export class ClientTeamMembersListComponent implements OnInit, OnDestroy {
  readonly experienceBands = CLIENT_TEAM_EXPERIENCE_BANDS;

  members: ClientTeamMemberCardDto[] = [];
  projects: ProjectDto[] = [];
  loading = false;
  loadingProjects = false;

  skillSearch = '';
  experienceBand: ClientTeamExperienceBand = '';
  projectId: number | null = null;

  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  totalCount = 0;

  private readonly destroy$ = new Subject<void>();
  private readonly skillSearch$ = new Subject<string>();

  constructor(
    private clientsService: ClientsService,
    private projectsService: ProjectsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.skillSearch$
      .pipe(debounceTime(SKILL_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadMembers();
      });

    this.loadProjects();
    this.loadMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get showPagination(): boolean {
    return this.totalCount > this.pageSize;
  }

  onSkillSearchInput(): void {
    this.skillSearch$.next(this.skillSearch);
  }

  onExperienceBandChange(): void {
    this.page = 1;
    this.loadMembers();
  }

  onProjectChange(): void {
    this.page = 1;
    this.loadMembers();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadMembers();
  }

  photoUrl(member: ClientTeamMemberCardDto): string | null {
    return resolveStorageAssetUrl(member.profilePhotoUrl);
  }

  initials(member: ClientTeamMemberCardDto): string {
    const parts = member.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return member.fullName.charAt(0).toUpperCase() || '?';
  }

  openMemberDetail(member: ClientTeamMemberCardDto): void {
    const modalRef = this.modalService.open(TeamMemberProfileModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.memberId = member.id;
    modalRef.componentInstance.source = 'client';
  }

  private loadProjects(): void {
    this.loadingProjects = true;
    this.projectsService
      .getMy({ pageIndex: 1, pageSize: 200 })
      .subscribe({
        next: res => {
          this.projects = res.data?.data ?? [];
          this.loadingProjects = false;
        },
        error: () => {
          this.loadingProjects = false;
        },
      });
  }

  private loadMembers(): void {
    this.loading = true;

    const request: ClientTeamMemberBrowseRequest = {
      pageIndex: this.page,
      pageSize: this.pageSize,
    };

    const trimmedSkill = this.skillSearch.trim();
    if (trimmedSkill) {
      request.skillSearch = trimmedSkill;
    }
    if (this.experienceBand) {
      request.experienceBand = this.experienceBand;
    }
    if (this.projectId != null) {
      request.projectId = this.projectId;
    }

    this.clientsService.browseTeamMembers(request).subscribe({
      next: res => {
        const paged = res.data;
        this.members = paged?.data ?? [];
        this.totalCount = paged?.totalCount ?? 0;
        this.loading = false;
      },
      error: () => {
        this.members = [];
        this.totalCount = 0;
        this.loading = false;
      },
    });
  }
}
