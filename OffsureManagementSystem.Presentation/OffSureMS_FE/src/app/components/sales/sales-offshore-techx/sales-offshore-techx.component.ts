import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { SERVICE_PROVIDER_NAME } from 'app/core/constants/branding.constants';
import {
  CLIENT_TEAM_EXPERIENCE_BANDS,
  ClientTeamExperienceBand,
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
} from 'app/core/models/clients/client-team-member.models';
import { PortfolioDto } from 'app/core/models/portfolios/portfolio.models';
import {
  ServiceCatalogCategoryDto,
  ServiceCategoryRequest,
} from 'app/core/models/services/service.models';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { SalesService } from 'app/core/services/sales.service';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { LandingPortfolioCard } from 'app/components/landingpage/landing-page/landing-portfolio.models';
import { LandingPortfolioDetailModalComponent } from 'app/components/landingpage/landing-page/landing-portfolio-detail-modal.component';
import { TeamMemberProfileModalComponent } from 'app/shared/components/team-member-profile-modal/team-member-profile-modal.component';
import { ToolbarSelectComponent } from 'app/shared/components/toolbar-select/toolbar-select.component';
import { ToolbarSelectOption } from 'app/shared/components/toolbar-select/toolbar-select.models';
import { SharedModule } from 'app/shared/shared.module';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

interface ShowcaseService {
  id: number;
  name: string;
  description?: string | null;
  projectCount: number;
}

interface ShowcaseCategory {
  id: number;
  name: string;
  description?: string | null;
  services: ShowcaseService[];
  totalProjects: number;
}

const SEARCH_DEBOUNCE_MS = 400;
const CATEGORY_PAGE_SIZE = 8;
const PROJECT_PAGE_SIZE = 12;
const TEAM_PAGE_SIZE = 12;

@Component({
  selector: 'app-sales-offshore-techx',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    NgbNavModule,
    ToolbarSelectComponent,
  ],
  templateUrl: './sales-offshore-techx.component.html',
  styleUrl: './sales-offshore-techx.component.scss',
})
export class SalesOffshoreTechxComponent implements OnInit, OnDestroy {
  readonly providerName = SERVICE_PROVIDER_NAME;
  readonly experienceOptions: ToolbarSelectOption<ClientTeamExperienceBand>[] =
    CLIENT_TEAM_EXPERIENCE_BANDS.map(b => ({ label: b.label, value: b.value }));

  activeTab: 'services' | 'team' | 'projects' = 'services';
  loading = true;
  loadError: string | null = null;

  private projectCountByServiceId = new Map<number, number>();
  visibleCategories: ShowcaseCategory[] = [];
  expandedCategoryIds = new Set<number>();
  serviceSearch = '';
  categoryPage = 1;
  categoryPageSize = CATEGORY_PAGE_SIZE;
  categoryTotalCount = 0;
  categoriesLoading = false;
  categoriesHasLoaded = false;
  categoriesHasMore = false;

  publishedProjects: PortfolioDto[] = [];
  projectSearch = '';
  projectPage = 1;
  projectPageSize = PROJECT_PAGE_SIZE;
  projectTotalCount = 0;
  projectsLoading = false;
  projectsHasLoaded = false;
  projectsHasMore = false;

  teamMembers: ClientTeamMemberCardDto[] = [];
  teamLoading = false;
  teamHasLoaded = false;
  teamNameSearch = '';
  teamSkillSearch = '';
  teamExperienceBand: ClientTeamExperienceBand = '';
  teamPage = 1;
  teamPageSize = TEAM_PAGE_SIZE;
  teamTotalCount = 0;
  teamHasMore = false;

  private readonly destroy$ = new Subject<void>();
  private readonly serviceSearch$ = new Subject<string>();
  private readonly projectSearch$ = new Subject<string>();
  private readonly teamNameSearch$ = new Subject<string>();
  private readonly teamSkillSearch$ = new Subject<string>();
  private teamLoadRequestId = 0;
  private projectLoadRequestId = 0;
  private categoryLoadRequestId = 0;
  private categoriesObserver: IntersectionObserver | null = null;
  private projectsObserver: IntersectionObserver | null = null;
  private teamObserver: IntersectionObserver | null = null;
  private categoriesSentinelEl: HTMLElement | null = null;
  private projectsSentinelEl: HTMLElement | null = null;
  private teamSentinelEl: HTMLElement | null = null;

  @ViewChild('categoriesSentinel')
  set categoriesSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.categoriesSentinelEl = ref?.nativeElement ?? null;
    this.bindCategoriesObserver();
  }

  @ViewChild('projectsSentinel')
  set projectsSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.projectsSentinelEl = ref?.nativeElement ?? null;
    this.bindProjectsObserver();
  }

  @ViewChild('teamSentinel')
  set teamSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.teamSentinelEl = ref?.nativeElement ?? null;
    this.bindTeamObserver();
  }

  constructor(
    private portfoliosService: PortfoliosService,
    private serviceCategoriesService: ServiceCategoriesService,
    private salesService: SalesService,
    private modalService: NgbModal,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.serviceSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.serviceSearch.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadCategories(true));

    this.projectSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.projectSearch.trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadProjects(true));

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

    this.restoreBrowseTabIfNeeded();
    this.persistBrowseTab();
    this.loadShowcase();
  }

  ngOnDestroy(): void {
    this.categoriesObserver?.disconnect();
    this.projectsObserver?.disconnect();
    this.teamObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get categoriesRefreshing(): boolean {
    return this.categoriesLoading && this.categoriesHasLoaded && this.categoryPage === 1;
  }

  get projectsRefreshing(): boolean {
    return this.projectsLoading && this.projectsHasLoaded && this.projectPage === 1;
  }

  get teamRefreshing(): boolean {
    return this.teamLoading && this.teamHasLoaded && this.teamPage === 1;
  }

  onTabChange(tab: string | number | null | undefined): void {
    const next = String(tab ?? 'services') as 'services' | 'team' | 'projects';
    this.activeTab = next;
    this.persistBrowseTab();
    if (next === 'team' && !this.teamHasLoaded) {
      this.loadTeamMembers(true);
    }
    if (next === 'projects' && !this.projectsHasLoaded) {
      this.loadProjects(true);
    }
  }

  goToTab(tab: 'services' | 'team' | 'projects'): void {
    if (this.activeTab === tab) return;
    this.onTabChange(tab);
  }

  private persistBrowseTab(): void {
    this.viewState.patch(this.router.url, {
      extras: { techxTab: this.activeTab },
    });
  }

  private restoreBrowseTabIfNeeded(): void {
    if (!this.viewState.isPopRestore() && !this.viewState.hasReturnFor(this.router.url)) {
      return;
    }
    const tab = this.viewState.get(this.router.url)?.extras?.['techxTab'];
    if (tab === 'services' || tab === 'team' || tab === 'projects') {
      this.onTabChange(tab);
    }
  }

  onServiceSearchInput(): void {
    this.serviceSearch$.next(this.serviceSearch);
  }

  onProjectSearchInput(): void {
    this.projectSearch$.next(this.projectSearch);
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

  serviceCountLabel(count: number): string {
    return count === 1 ? '1 service' : `${count} services`;
  }

  projectCountLabel(count: number): string {
    return count === 1 ? '1 project' : `${count} projects`;
  }

  toggleCategory(categoryId: number): void {
    if (this.expandedCategoryIds.has(categoryId)) {
      this.expandedCategoryIds.delete(categoryId);
    } else {
      this.expandedCategoryIds.add(categoryId);
    }
  }

  isCategoryExpanded(categoryId: number): boolean {
    return this.expandedCategoryIds.has(categoryId);
  }

  openMemberProfile(member: ClientTeamMemberCardDto): void {
    const modalRef = this.modalService.open(TeamMemberProfileModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.memberId = member.id;
    modalRef.componentInstance.source = 'sales';
  }

  openProjectDetail(project: PortfolioDto): void {
    const modalRef = this.modalService.open(LandingPortfolioDetailModalComponent, {
      centered: true,
      size: 'xl',
      scrollable: true,
    });
    modalRef.componentInstance.portfolio = this.toLandingCard(project);
  }

  photoUrl(member: ClientTeamMemberCardDto): string | null {
    return resolveStorageAssetUrl(member.profilePhotoUrl);
  }

  memberInitials(member: ClientTeamMemberCardDto): string {
    const parts = member.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }

  projectThumb(project: PortfolioDto): string | null {
    const raw =
      project.thumbnailUrl ||
      project.images?.find(i => i.isActive)?.imageUrl ||
      project.images?.[0]?.imageUrl ||
      null;
    return resolveStorageAssetUrl(raw);
  }

  private loadShowcase(): void {
    this.loading = true;
    this.loadError = null;

    this.portfoliosService.getServiceSummary().subscribe({
      next: summaries => {
        this.projectCountByServiceId = new Map(
          (summaries.data ?? []).map(s => [s.serviceId, s.projectCount])
        );
        this.loading = false;
        this.loadCategories(true);
      },
      error: () => {
        this.loadError = 'Unable to load Offshore TechX content right now.';
        this.loading = false;
      },
    });
  }

  private loadCategories(reset: boolean): void {
    const keepStale = reset && this.categoriesHasLoaded;
    if (reset) {
      this.categoryPage = 1;
      this.categoriesHasMore = false;
      if (!keepStale) {
        this.visibleCategories = [];
        this.expandedCategoryIds = new Set();
      }
    }

    const requestId = ++this.categoryLoadRequestId;
    this.categoriesLoading = true;

    const request: ServiceCategoryRequest = {
      pageIndex: this.categoryPage,
      pageSize: this.categoryPageSize,
    };
    const term = this.serviceSearch.trim();
    if (term) {
      request.searchKey = term;
    }

    this.serviceCategoriesService.getPublicCatalog(request).subscribe({
      next: res => {
        if (requestId !== this.categoryLoadRequestId) return;
        const pageItems = (res.data?.data ?? []).map(c => this.mapCatalogCategory(c));
        this.visibleCategories = reset ? pageItems : [...this.visibleCategories, ...pageItems];
        this.categoryTotalCount = res.data?.totalCount ?? 0;
        this.categoriesHasMore = this.visibleCategories.length < this.categoryTotalCount;
        this.categoriesLoading = false;
        this.categoriesHasLoaded = true;

        if (term) {
          this.expandedCategoryIds = new Set(this.visibleCategories.map(c => c.id));
        } else if (reset) {
          this.expandedCategoryIds = new Set();
        }

        if (!keepStale) {
          queueMicrotask(() => this.loadMoreCategoriesIfNeeded());
        }
      },
      error: () => {
        if (requestId !== this.categoryLoadRequestId) return;
        if (reset && !keepStale) {
          this.visibleCategories = [];
          this.categoryTotalCount = 0;
        }
        this.categoriesHasMore = false;
        this.categoriesLoading = false;
        this.categoriesHasLoaded = true;
      },
    });
  }

  private mapCatalogCategory(category: ServiceCatalogCategoryDto): ShowcaseCategory {
    const services = (category.services ?? [])
      .map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        projectCount: this.projectCountByServiceId.get(service.id) ?? 0,
      }))
      .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      services,
      totalProjects: services.reduce((sum, s) => sum + s.projectCount, 0),
    };
  }

  private bindCategoriesObserver(): void {
    this.categoriesObserver?.disconnect();
    this.categoriesObserver = null;
    const el = this.categoriesSentinelEl;
    if (!el) return;

    this.categoriesObserver = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        this.loadMoreCategoriesIfNeeded();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );
    this.categoriesObserver.observe(el);
  }

  private loadMoreCategoriesIfNeeded(): void {
    if (!this.categoriesHasMore || this.categoriesLoading || this.categoriesRefreshing) return;
    if (!this.categoriesSentinelEl || !this.isNearViewport(this.categoriesSentinelEl)) return;
    this.categoryPage += 1;
    this.loadCategories(false);
  }

  private bindProjectsObserver(): void {
    this.projectsObserver?.disconnect();
    this.projectsObserver = null;
    const el = this.projectsSentinelEl;
    if (!el) return;

    this.projectsObserver = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        this.loadMoreProjectsIfNeeded();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );
    this.projectsObserver.observe(el);
  }

  private loadMoreProjectsIfNeeded(): void {
    if (!this.projectsHasMore || this.projectsLoading || this.projectsRefreshing) return;
    if (!this.projectsSentinelEl || !this.isNearViewport(this.projectsSentinelEl)) return;
    this.projectPage += 1;
    this.loadProjects(false);
  }

  private isNearViewport(el: HTMLElement, marginPx = 240): boolean {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight + marginPx;
  }

  private loadProjects(reset: boolean): void {
    const keepStale = reset && this.projectsHasLoaded;
    if (reset) {
      this.projectPage = 1;
      this.projectsHasMore = false;
      if (!keepStale) {
        this.publishedProjects = [];
      }
    }

    const requestId = ++this.projectLoadRequestId;
    this.projectsLoading = true;

    const request: {
      pageIndex: number;
      pageSize: number;
      searchKey?: string;
    } = {
      pageIndex: this.projectPage,
      pageSize: this.projectPageSize,
    };
    const term = this.projectSearch.trim();
    if (term) {
      request.searchKey = term;
    }

    this.portfoliosService.getAll(request).subscribe({
      next: res => {
        if (requestId !== this.projectLoadRequestId) return;
        const pageItems = res.data?.data ?? [];
        this.publishedProjects = reset ? pageItems : [...this.publishedProjects, ...pageItems];
        this.projectTotalCount = res.data?.totalCount ?? 0;
        this.projectsHasMore = this.publishedProjects.length < this.projectTotalCount;
        this.projectsLoading = false;
        this.projectsHasLoaded = true;
        if (!keepStale) {
          queueMicrotask(() => this.loadMoreProjectsIfNeeded());
        }
      },
      error: () => {
        if (requestId !== this.projectLoadRequestId) return;
        if (reset && !keepStale) {
          this.publishedProjects = [];
          this.projectTotalCount = 0;
        }
        this.projectsHasMore = false;
        this.projectsLoading = false;
        this.projectsHasLoaded = true;
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

  private loadTeamMembers(reset: boolean): void {
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
      pageSize: this.teamPageSize,
    };
    const name = this.teamNameSearch.trim();
    const skill = this.teamSkillSearch.trim();
    if (name) request.nameSearch = name;
    if (skill) request.skillSearch = skill;
    if (this.teamExperienceBand) request.experienceBand = this.teamExperienceBand;

    this.salesService.browseTeamMembers(request).subscribe({
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

  private toLandingCard(project: PortfolioDto): LandingPortfolioCard {
    const imageUrls = (project.images ?? [])
      .filter(i => i.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(i => resolveStorageAssetUrl(i.imageUrl))
      .filter((url): url is string => !!url);

    const thumb = resolveStorageAssetUrl(project.thumbnailUrl);
    if (thumb && !imageUrls.includes(thumb)) {
      imageUrls.unshift(thumb);
    }

    return {
      id: project.id,
      serviceId: project.serviceId,
      title: project.title,
      summary: project.description?.slice(0, 140) ?? '',
      description: project.description ?? '',
      categoryName: project.serviceCategoryName ?? '',
      serviceName: project.serviceName ?? '',
      clientName: project.clientName ?? '',
      year: project.completedDate
        ? new Date(project.completedDate).getFullYear().toString()
        : '',
      icon: 'ti ti-briefcase',
      cardClass: '',
      imageUrls,
    };
  }
}
