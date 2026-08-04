import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import {
  CLIENT_TEAM_EXPERIENCE_BANDS,
  ClientTeamExperienceBand,
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
} from 'app/core/models/clients/client-team-member.models';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectFilterRequest } from 'app/core/models/projects/project.models';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ToolbarSelectComponent } from 'app/shared/components/toolbar-select/toolbar-select.component';
import { ToolbarSelectLoader, ToolbarSelectOption } from 'app/shared/components/toolbar-select/toolbar-select.models';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';
import { TeamMemberProfileModalComponent } from 'app/shared/components/team-member-profile-modal/team-member-profile-modal.component';

const SKILL_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 12;
const PROJECT_PAGE_SIZE = 20;

@Component({
  selector: 'app-client-team-members-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, NgbPaginationModule, ToolbarSelectComponent],
  templateUrl: './client-team-members-list.component.html',
  styleUrl: './client-team-members-list.component.scss',
})
export class ClientTeamMembersListComponent implements OnInit, OnDestroy {
  readonly experienceOptions: ToolbarSelectOption<ClientTeamExperienceBand>[] =
    CLIENT_TEAM_EXPERIENCE_BANDS.map(b => ({ label: b.label, value: b.value }));

  members: ClientTeamMemberCardDto[] = [];
  loading = false;
  hasLoadedOnce = false;

  nameSearch = '';
  skillSearch = '';
  experienceBand: ClientTeamExperienceBand = '';
  projectId: number | null = null;

  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  totalCount = 0;

  private readonly destroy$ = new Subject<void>();
  private readonly nameSearch$ = new Subject<string>();
  private readonly skillSearch$ = new Subject<string>();
  private loadRequestId = 0;

  constructor(
    private clientsService: ClientsService,
    private projectsService: ProjectsService,
    private modalService: NgbModal,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  loadProjectsPage: ToolbarSelectLoader = (search, pageIndex) => {
    const request: ProjectFilterRequest = { pageIndex, pageSize: PROJECT_PAGE_SIZE };
    const trimmed = search?.trim();
    if (trimmed) {
      request.searchKey = trimmed;
    }
    return this.projectsService.getMy(request).pipe(
      map(res => ({
        items: (res.data?.data ?? []).map(p => ({ label: p.name, value: p.id })),
        totalCount: res.data?.totalCount ?? 0,
      }))
    );
  };

  ngOnInit(): void {
    this.nameSearch$
      .pipe(debounceTime(SKILL_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadMembers();
      });

    this.skillSearch$
      .pipe(debounceTime(SKILL_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadMembers();
      });

    const restored = this.viewState.restorePageIfPop(this.router.url);
    if (restored) {
      this.page = restored.page;
      if (restored.pageSize) {
        this.pageSize = restored.pageSize;
      }
    } else {
      this.viewState.savePage(this.router.url, this.page, this.pageSize);
    }

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

  onNameSearchInput(): void {
    this.nameSearch$.next(this.nameSearch);
  }

  onExperienceBandChange(): void {
    this.page = 1;
    this.viewState.savePage(this.router.url, this.page, this.pageSize);
    this.loadMembers();
  }

  onProjectChange(): void {
    this.page = 1;
    this.viewState.savePage(this.router.url, this.page, this.pageSize);
    this.loadMembers();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.viewState.savePage(this.router.url, this.page, this.pageSize);
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

  private loadMembers(): void {
    const isInitial = !this.hasLoadedOnce;
    if (isInitial) {
      this.loading = true;
    }

    const request: ClientTeamMemberBrowseRequest = {
      pageIndex: this.page,
      pageSize: this.pageSize,
    };

    const trimmedName = this.nameSearch.trim();
    if (trimmedName) {
      request.nameSearch = trimmedName;
    }
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

    const requestId = ++this.loadRequestId;

    this.clientsService.browseTeamMembers(request).subscribe({
      next: res => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        const paged = res.data;
        this.members = paged?.data ?? [];
        this.totalCount = paged?.totalCount ?? 0;
        this.loading = false;
        this.hasLoadedOnce = true;
      },
      error: () => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        if (isInitial) {
          this.members = [];
          this.totalCount = 0;
        }
        this.loading = false;
        this.hasLoadedOnce = true;
      },
    });
  }
}
