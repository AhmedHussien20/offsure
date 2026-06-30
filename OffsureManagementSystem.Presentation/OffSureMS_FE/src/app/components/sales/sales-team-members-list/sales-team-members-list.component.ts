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
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { SalesService } from 'app/core/services/sales.service';
import { ProjectFilterRequest } from 'app/core/models/projects/project.models';
import { SharedModule } from 'app/shared/shared.module';
import { ToolbarSelectComponent } from 'app/shared/components/toolbar-select/toolbar-select.component';
import { ToolbarSelectLoader, ToolbarSelectOption } from 'app/shared/components/toolbar-select/toolbar-select.models';
import { Subject } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';
import { TeamMemberProfileModalComponent } from 'app/shared/components/team-member-profile-modal/team-member-profile-modal.component';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 12;
const PROJECT_PAGE_SIZE = 20;

@Component({
  selector: 'app-sales-team-members-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, NgbPaginationModule, ToolbarSelectComponent],
  templateUrl: './sales-team-members-list.component.html',
  styleUrl: './sales-team-members-list.component.scss',
})
export class SalesTeamMembersListComponent implements OnInit, OnDestroy {
  readonly experienceOptions: ToolbarSelectOption<ClientTeamExperienceBand>[] =
    CLIENT_TEAM_EXPERIENCE_BANDS.map(b => ({ label: b.label, value: b.value }));

  members: ClientTeamMemberCardDto[] = [];
  loading = false;

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

  constructor(
    private salesService: SalesService,
    private modalService: NgbModal
  ) {}

  loadProjectsPage: ToolbarSelectLoader = (search, pageIndex) => {
    const request: ProjectFilterRequest = { pageIndex, pageSize: PROJECT_PAGE_SIZE };
    const trimmed = search?.trim();
    if (trimmed) {
      request.searchKey = trimmed;
    }
    return this.salesService.getMyProjects(request).pipe(
      map(res => ({
        items: (res.data?.data ?? []).map(p => ({ label: p.name, value: p.id })),
        totalCount: res.data?.totalCount ?? 0,
      }))
    );
  };

  ngOnInit(): void {
    this.nameSearch$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadMembers();
      });

    this.skillSearch$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadMembers();
      });

    this.loadMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get showPagination(): boolean {
    return this.totalCount > this.pageSize;
  }

  onNameSearchInput(): void {
    this.nameSearch$.next(this.nameSearch);
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
    modalRef.componentInstance.source = 'sales';
  }

  private loadMembers(): void {
    this.loading = true;

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

    this.salesService.browseTeamMembers(request).subscribe({
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
