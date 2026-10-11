import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  CLIENT_TEAM_EXPERIENCE_BANDS,
  ClientTeamExperienceBand,
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
} from 'app/core/models/clients/client-team-member.models';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamCatalogCardDto, TeamCatalogDto } from 'app/core/models/teams/team.models';
import { ClientsService } from 'app/core/services/clients.service';
import { SalesService } from 'app/core/services/sales.service';
import { TeamsService } from 'app/core/services/teams.service';
import { TeamCardComponent } from 'app/shared/components/team-card/team-card.component';
import { TeamCoverComponent } from 'app/shared/components/team-cover/team-cover.component';
import { TeamMemberProfileModalComponent } from 'app/shared/components/team-member-profile-modal/team-member-profile-modal.component';
import { ToolbarSelectComponent } from 'app/shared/components/toolbar-select/toolbar-select.component';
import { ToolbarSelectOption } from 'app/shared/components/toolbar-select/toolbar-select.models';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

export type TeamCatalogBrowserSource = 'sales' | 'client-showcase';

/** Which members the list shows: one team, the unassigned ones, or everyone (no teams set up yet). */
type MemberScope =
  | { kind: 'team'; team: TeamCatalogCardDto }
  | { kind: 'other' }
  | { kind: 'all' };

const SEARCH_DEBOUNCE_MS = 400;
const TEAM_PAGE_SIZE = 12;

/**
 * "Offshore team" tab of the Offshore TechX page: team folders first, then the
 * specialists of the chosen team with the usual name / skill / experience filters.
 */
@Component({
  selector: 'app-team-catalog-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolbarSelectComponent, TeamCardComponent, TeamCoverComponent],
  templateUrl: './team-catalog-browser.component.html',
  styleUrl: './team-catalog-browser.component.scss',
})
export class TeamCatalogBrowserComponent implements OnInit, OnDestroy {
  @Input({ required: true }) source!: TeamCatalogBrowserSource;

  readonly experienceOptions: ToolbarSelectOption<ClientTeamExperienceBand>[] =
    CLIENT_TEAM_EXPERIENCE_BANDS.map(b => ({ label: b.label, value: b.value }));

  catalog: TeamCatalogDto | null = null;
  catalogLoading = false;
  catalogError: string | null = null;
  teamSearch = '';

  /** null while the team folders are shown. */
  scope: MemberScope | null = null;
  /** True when no teams exist yet, so the tab falls back to the flat specialists list. */
  flatMode = false;

  teamMembers: ClientTeamMemberCardDto[] = [];
  teamLoading = false;
  teamHasLoaded = false;
  teamNameSearch = '';
  teamSkillSearch = '';
  teamExperienceBand: ClientTeamExperienceBand = '';
  teamPage = 1;
  teamTotalCount = 0;
  teamHasMore = false;

  private readonly destroy$ = new Subject<void>();
  private readonly teamSearch$ = new Subject<string>();
  private readonly teamNameSearch$ = new Subject<string>();
  private readonly teamSkillSearch$ = new Subject<string>();
  private catalogRequestId = 0;
  private teamLoadRequestId = 0;
  private teamObserver: IntersectionObserver | null = null;
  private teamSentinelEl: HTMLElement | null = null;

  @ViewChild('teamSentinel')
  set teamSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.teamSentinelEl = ref?.nativeElement ?? null;
    this.bindTeamObserver();
  }

  constructor(
    private teamsService: TeamsService,
    private salesService: SalesService,
    private clientsService: ClientsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.teamSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.teamSearch.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadCatalog());

    this.teamNameSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.teamNameSearch.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadTeamMembers(true));

    this.teamSkillSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.teamSkillSearch.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadTeamMembers(true));

    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.teamObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get catalogRefreshing(): boolean {
    return this.catalogLoading && !!this.catalog;
  }

  get teamRefreshing(): boolean {
    return this.teamLoading && this.teamHasLoaded && this.teamPage === 1;
  }

  get selectedTeam(): TeamCatalogCardDto | null {
    return this.scope?.kind === 'team' ? this.scope.team : null;
  }

  get showOtherCard(): boolean {
    return !!this.catalog && this.catalog.unassignedCount > 0 && !this.teamSearch.trim();
  }

  onTeamSearchInput(): void {
    this.teamSearch$.next(this.teamSearch);
  }

  onTeamNameSearchInput(): void {
    this.teamNameSearch$.next(this.teamNameSearch);
  }

  onTeamSkillSearchInput(): void {
    this.teamSkillSearch$.next(this.teamSkillSearch);
  }

  onTeamExperienceChange(): void {
    this.loadTeamMembers(true);
  }

  openTeam(team: TeamCatalogCardDto): void {
    // Searching "Azure" and opening the matching team should land on the Azure people.
    this.openScope({ kind: 'team', team }, team.matchedSkill ?? '');
  }

  openOtherSpecialists(): void {
    this.openScope({ kind: 'other' }, '');
  }

  /** From the "no team matches" state: search every specialist by the same term. */
  searchAllSpecialists(): void {
    this.openScope({ kind: 'all' }, this.teamSearch.trim());
  }

  backToTeams(): void {
    this.scope = null;
    this.teamMembers = [];
    this.teamHasLoaded = false;
  }

  /** Focus chips on the team banner filter the list by that skill; clicking again clears it. */
  toggleSkillFilter(skill: string): void {
    this.teamSkillSearch = this.teamSkillSearch === skill ? '' : skill;
    this.teamSkillSearch$.next(this.teamSkillSearch);
  }

  specialistsLabel(count: number): string {
    return count === 1 ? '1 specialist' : `${count} specialists`;
  }

  openMemberProfile(member: ClientTeamMemberCardDto): void {
    const modalRef = this.modalService.open(TeamMemberProfileModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.memberId = member.id;
    modalRef.componentInstance.source = this.source;
  }

  photoUrl(url: string | null | undefined): string | null {
    return resolveStorageAssetUrl(url);
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }

  private openScope(scope: MemberScope, skillFilter: string): void {
    this.scope = scope;
    this.teamNameSearch = '';
    this.teamSkillSearch = skillFilter;
    this.teamExperienceBand = '';
    this.teamMembers = [];
    this.teamHasLoaded = false;
    this.loadTeamMembers(true);
  }

  private loadCatalog(): void {
    const requestId = ++this.catalogRequestId;
    const term = this.teamSearch.trim();
    this.catalogLoading = true;
    this.catalogError = null;

    this.teamsService.getCatalog(term || undefined).subscribe({
      next: res => {
        if (requestId !== this.catalogRequestId) return;
        this.catalog = res.data ?? { teams: [], unassignedCount: 0, totalSpecialists: 0 };
        this.catalogLoading = false;

        // No teams set up yet: keep the tab useful by listing everyone, as before.
        if (!term && this.catalog.teams.length === 0 && !this.scope) {
          this.flatMode = true;
          this.openScope({ kind: 'all' }, '');
        }
      },
      error: () => {
        if (requestId !== this.catalogRequestId) return;
        this.catalogLoading = false;
        this.catalogError = 'Unable to load teams right now.';
      },
    });
  }

  private bindTeamObserver(): void {
    this.teamObserver?.disconnect();
    this.teamObserver = null;
    const el = this.teamSentinelEl;
    if (!el) return;

    this.teamObserver = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        this.loadMoreTeamIfNeeded();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );
    this.teamObserver.observe(el);
  }

  private loadMoreTeamIfNeeded(): void {
    if (!this.teamHasMore || this.teamLoading || this.teamRefreshing) return;
    if (!this.teamSentinelEl || !this.isNearViewport(this.teamSentinelEl)) return;
    this.teamPage += 1;
    this.loadTeamMembers(false);
  }

  private isNearViewport(el: HTMLElement, marginPx = 240): boolean {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight + marginPx;
  }

  private loadTeamMembers(reset: boolean): void {
    if (!this.scope) return;

    const keepStale = reset && this.teamHasLoaded;
    if (reset) {
      this.teamPage = 1;
      this.teamHasMore = false;
      if (!keepStale) {
        this.teamMembers = [];
      }
    }

    const requestId = ++this.teamLoadRequestId;
    this.teamLoading = true;

    const request: ClientTeamMemberBrowseRequest = {
      pageIndex: this.teamPage,
      pageSize: TEAM_PAGE_SIZE,
    };
    if (this.scope.kind === 'team') request.teamId = this.scope.team.id;
    if (this.scope.kind === 'other') request.withoutTeam = true;
    const name = this.teamNameSearch.trim();
    const skill = this.teamSkillSearch.trim();
    if (name) request.nameSearch = name;
    if (skill) request.skillSearch = skill;
    if (this.teamExperienceBand) request.experienceBand = this.teamExperienceBand;

    const browse$ =
      this.source === 'sales'
        ? this.salesService.browseTeamMembers(request)
        : this.clientsService.browseShowcaseTeamMembers(request);

    browse$.subscribe({
      next: res => {
        if (requestId !== this.teamLoadRequestId) return;
        const pageItems = res.data?.data ?? [];
        this.teamMembers = reset ? pageItems : [...this.teamMembers, ...pageItems];
        this.teamTotalCount = res.data?.totalCount ?? 0;
        this.teamHasMore = this.teamMembers.length < this.teamTotalCount;
        this.teamLoading = false;
        this.teamHasLoaded = true;
        if (!keepStale) {
          queueMicrotask(() => this.loadMoreTeamIfNeeded());
        }
      },
      error: () => {
        if (requestId !== this.teamLoadRequestId) return;
        if (reset && !keepStale) {
          this.teamMembers = [];
          this.teamTotalCount = 0;
        }
        this.teamHasMore = false;
        this.teamLoading = false;
        this.teamHasLoaded = true;
      },
    });
  }
}
