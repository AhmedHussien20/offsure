import { pagination1 } from './../../../shared/prismData/pagination';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import {
  ChangeDetectorRef,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule, OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';
import { SpkFeatureCardsComponent } from '../../../@spk/reusable-landingpage/spk-feature-cards/spk-feature-cards.component';
import { NgbAccordionComponent } from '../../../@spk/reusable-ui-elements/ngb-accordion/ngb-accordion.component';
import { TapToTopComponent } from '../../../shared/components/tap-to-top/tap-to-top.component';
import { SharedModule } from '../../../shared/shared.module';
import { PortfolioDto } from '../../../core/models/portfolios/portfolio.models';
import { portfolioImageUrl } from '../../../core/utils/portfolio-image.util';
import { LandingPortfolioCard } from './landing-portfolio.models';
import { LandingPortfolioDetailModalComponent } from './landing-portfolio-detail-modal.component';
import { ServiceCategoryDto, ServiceDto } from '../../../core/models/services/service.models';
import { ContactService } from '../../../core/services/contact.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppStateService } from '../../../shared/services/app-state.service';
import { PortfoliosService } from '../../../core/services/portfolios.service';
import { ServiceCategoriesService } from '../../../core/services/service-categories.service';
import { ServicesService } from '../../../core/services/services.service';
import { ToastrService } from 'ngx-toastr';
import {
  LANDING_CAROUSEL_AUTOPLAY_MS,
  LANDING_CAROUSEL_PARAMS,
  LANDING_FEATURE_CAROUSEL_PAGE_SIZE,
  LANDING_FEATURE_CAROUSEL_PARAMS,
  LandingCarouselInitHooks,
  LandingSwiperHost,
  countLandingCarouselSlides,
  handleLandingCarouselReachEnd,
  initLandingSwiperCarousel,
  readLandingCarouselNavState,
  setupLandingCarouselSentinel,
  slideLandingCarouselNext,
  slideLandingCarouselPrev,
  tryLoadMoreAtCarouselEnd,
  unbindLandingSwiperCarouselEvents,
} from './landing-swiper.util';

interface LandingServiceCategoryCard {
  id: number;
  icon: string;
  title: string;
  cardClass: string;
  description: string;
  servicesCount: number;
}

interface LandingServiceCard {
  id: number;
  icon: string;
  title: string;
  cardClass: string;
  description: string;
}

interface LandingSuccessStory {
  icon: string;
  title: string;
  sector: string;
  summary: string;
  highlight: string;
}

interface LandingWhatWeOffer {
  icon: string;
  title: string;
  description: string;
}

interface LandingWhyChooseUs {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule,SharedModule,
     CommonModule, NgbModule, CarouselModule, RouterModule, SpkFeatureCardsComponent,
     NgbAccordionComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  @ViewChild('swiperContainer1') swiperContainer1!: ElementRef;
  @ViewChild('swiperContainerPortfolio') swiperContainerPortfolio?: ElementRef;
  @ViewChild('swiperContainerCategories') swiperContainerCategories?: ElementRef;
  @ViewChild('swiperContainerServices') swiperContainerServices?: ElementRef;
  @ViewChild('portfolioLoadSentinel') portfolioLoadSentinel?: ElementRef<HTMLElement>;
  @ViewChild('categoryLoadSentinel') categoryLoadSentinel?: ElementRef<HTMLElement>;
  @ViewChild('serviceLoadSentinel') serviceLoadSentinel?: ElementRef<HTMLElement>;
  @ViewChild('serviceCategories') serviceCategoriesSection?: ElementRef<HTMLElement>;
  accodionClass: any;
  private portfolioLoadObserver?: IntersectionObserver;
  private categoryLoadObserver?: IntersectionObserver;
  private serviceLoadObserver?: IntersectionObserver;
  private portfolioSwiperEl?: LandingSwiperHost;
  private categorySwiperEl?: LandingSwiperHost;
  private serviceSwiperEl?: LandingSwiperHost;
  private readonly onPortfolioReachEnd = (): void => {
    if (this.portfolioLoadingMore) {
      return;
    }
    handleLandingCarouselReachEnd(
      this.getPortfolioSwiperHost(),
      this.portfolioItems.length,
      this.portfolioHasMore && !this.portfolioLoading && !this.portfolioLoadingMore,
      () => this.loadMorePortfolios()
    );
  };
  private readonly onPortfolioSlideChange = (): void => {
    this.syncPortfolioNav();
    this.tryLoadMorePortfoliosAtEnd();
  };
  private readonly onPortfolioResize = (): void => this.syncPortfolioNav();
  private readonly onPortfolioAfterInit = (): void => this.schedulePortfolioNavSync();
  private readonly onCategoryReachEnd = (): void => {
    if (this.categoryLoadingMore) {
      return;
    }
    handleLandingCarouselReachEnd(
      this.getCategorySwiperHost(),
      this.serviceCategoryCards.length,
      this.categoryHasMore && !this.categoryLoading && !this.categoryLoadingMore,
      () => this.loadMoreCategories()
    );
  };
  private readonly onCategorySlideChange = (): void => {
    this.syncCategoryNav();
    this.tryLoadMoreCategoriesAtEnd();
  };
  private readonly onCategoryResize = (): void => this.syncCategoryNav();
  private readonly onCategoryAfterInit = (): void => this.scheduleCategoryNavSync();
  private readonly onServiceReachEnd = (): void => {
    if (this.serviceLoadingMore) {
      return;
    }
    handleLandingCarouselReachEnd(
      this.getServiceSwiperHost(),
      this.categoryServiceCards.length,
      this.serviceHasMore && !this.serviceLoading && !this.serviceLoadingMore && !!this.selectedCategoryId,
      () => this.loadMoreCategoryServices()
    );
  };
  private readonly onServiceSlideChange = (): void => {
    this.syncServiceNav();
    this.tryLoadMoreServicesAtEnd();
  };
  private readonly onServiceResize = (): void => this.syncServiceNav();
  private readonly onServiceAfterInit = (): void => this.scheduleServiceNavSync();

  portfolioCanGoPrev = false;
  portfolioCanGoNext = false;
  categoryCanGoPrev = false;
  categoryCanGoNext = false;
  serviceCanGoPrev = false;
  serviceCanGoNext = false;
  private readonly serviceCategoryIcons = [
    'fe fe-package',
    'fe fe-code',
    'fe fe-layers',
    'fe fe-book-open',
    'fe fe-file',
    'fe fe-aperture',
    'fe fe-box',
    'fe fe-file-text',
  ];
  private readonly serviceCategoryCardClasses = [
    'main-features-1',
    'main-features-2',
    'main-features-3',
    'main-features-4',
    'main-features-5',
    'main-features-6',
    'main-features-7',
    'main-features-8',
  ];
  ngAfterViewInit() {
    const swiperE2 = this.swiperContainer1.nativeElement;

    Object.assign(swiperE2, {
      slidesPerView: 3,
      spaceBetween: 10,
      loop: true,
      pagination:{
        clickable:true
      },
      breakpoints: {
        320: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
          700:{
            slidesPerView: 2,
            spaceBetween: 20,
          } ,       
        1110: {
          slidesPerView: 3,
          spaceBetween: 20,
        },
        1300: {
          slidesPerView: 3,
          spaceBetween: 20,
        },

      },
    }
    );
  }
  serviceCategoryCards: LandingServiceCategoryCard[] = [];
  categoryPageIndex = 1;
  readonly categoryPageSize = LANDING_FEATURE_CAROUSEL_PAGE_SIZE;
  categoryTotalCount = 0;
  categoryLoading = false;
  categoryLoadingMore = false;
  selectedCategoryId: number | null = null;
  selectedCategoryTitle = '';
  categoryServiceCards: LandingServiceCard[] = [];
  servicePageIndex = 1;
  readonly servicePageSize = LANDING_FEATURE_CAROUSEL_PAGE_SIZE;
  serviceTotalCount = 0;
  serviceLoading = false;
  serviceLoadingMore = false;
  loadingCategoryServices = false;
  portfolioItems: LandingPortfolioCard[] = [];
  portfolioPageIndex = 1;
  readonly portfolioPageSize = 10;
  portfolioTotalCount = 0;
  portfolioLoading = false;
  portfolioLoadingMore = false;
  readonly carouselAutoplayDelayMs = LANDING_CAROUSEL_AUTOPLAY_MS;
  contactSubmitting = false;
  private readonly fb = inject(FormBuilder);
  readonly contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    subject: ['', Validators.maxLength(200)],
    message: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  serviceCategoriesCount = 0;
  publicServicesCount = 0;
  publishedProjectsCount = 0;
  readonly companyProfile = {
    legalName: 'Offshore TechX',
    platformName: 'Offsure Management System',
    tagline: 'Remote networking expertise, delivered worldwide.',
    heroSubtitle: 'Enterprise networking, security, and digital solutions — supported globally since 2018.',
    foundedYear: 2018,
    email: 'info@offshoretechx.net',
    phone: '+1 (702) 605-8569',
    website: 'https://offshoretechx.net/',
    globalProjectsDelivered: 100,
    yearsNetworkingExperience: 15,
    supportHours: '24/7 deployment and support with SLA-backed response.',
  };

  readonly whatWeOffer: LandingWhatWeOffer[] = [
    {
      icon: 'fe fe-users',
      title: 'Vendor Partnership',
      description:
        'We help companies improve their partnership with vendors and align technology decisions with business outcomes.',
    },
    {
      icon: 'fe fe-book-open',
      title: 'Technical Training',
      description:
        'Specialized training programs that empower your teams to adopt and operate the latest networking technologies effectively.',
    },
    {
      icon: 'fe fe-compass',
      title: 'Consultation',
      description:
        'Comprehensive network solution consultation to optimize infrastructure design, operations, and long-term roadmaps.',
    },
    {
      icon: 'fe fe-layers',
      title: 'Design / Presales',
      description:
        'Expert design services including BOM, HLD, LLD, and complete documentation for enterprise network projects.',
    },
    {
      icon: 'fe fe-headphones',
      title: 'Deployment / Support / SLA',
      description:
        'Dedicated 24/7 support to resolve issues promptly, minimize downtime, and keep your operations productive.',
    },
  ];

  readonly whyChooseUs: LandingWhyChooseUs[] = [
    {
      icon: 'fe fe-award',
      title: 'Unmatched Expertise',
      description:
        '15+ years of multi-vendor networking experience with expert certifications including CCIE (Cisco), PCNSE (Palo Alto), and NSE7 (Fortinet).',
    },
    {
      icon: 'fe fe-globe',
      title: 'Proven Global Success',
      description:
        'A track record of 100+ successfully completed projects worldwide, delivering reliable remote support across locations and complexity levels.',
    },
    {
      icon: 'fe fe-trending-up',
      title: 'Cost-Effective',
      description:
        'Access top-tier expertise without the overhead of maintaining a full in-house team — reducing cost while maintaining quality.',
    },
    {
      icon: 'fe fe-sliders',
      title: 'Scalable & Flexible Team',
      description:
        'We scale quickly to match your evolving needs and deploy dedicated teams tailored to each project requirement.',
    },
  ];

  readonly successStories: LandingSuccessStory[] = [
    {
      icon: 'fe fe-phone',
      title: 'Unified Communications Deployment',
      sector: 'Insurance · 500 employees',
      summary:
        'Implemented a comprehensive Cisco IP Telephony solution that transformed communication infrastructure and enabled seamless unified communication with strong mobility support.',
      highlight: 'Cisco IP Telephony',
    },
    {
      icon: 'fe fe-shield',
      title: 'Secure SD-WAN for a Leading Bank',
      sector: 'Financial Services · 63 branches',
      summary:
        'Designed and deployed a Cisco SD-WAN solution and migrated 63 branches from traditional WAN to a modern SD-WAN infrastructure.',
      highlight: 'Cisco SD-WAN',
    },
    {
      icon: 'fe fe-lock',
      title: 'Secure Firewall Migration',
      sector: 'Enterprise · 100 branches',
      summary:
        'Executed a security infrastructure upgrade and migrated firewalls across 100 branches from Cisco appliances to next-generation Palo Alto Networks firewalls.',
      highlight: 'Palo Alto NGFW',
    },
  ];

  basicAccordions2 = [
    {
      title: ' <span class="me-3 fs-18 fw-bold">01.</span>Who is Offshore TechX?',
      body: `<p>Founded in <strong>2018</strong>, Offshore TechX specializes in remote support for networking solutions worldwide. Our team combines deep industry knowledge with a portfolio of <strong>100+ successfully completed projects</strong>.</p><p class="mt-2 mb-3"><span class="fw-bold">Mission:</span> Provide unparalleled remote support that enhances client productivity while fostering innovation in digital communications.</p>
             <a href="#about" class="btn btn-outline-primary fs-13">About Us</a>`,
      headingId: 'headingcustomicon20Five',
      collapseId: 'collapsecustomicon20Five',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-primary',
    },
    {
      title: ' <span class="me-3 fs-18 fw-bold">02.</span>What services does Offshore TechX offer?',
      body: `<p>We deliver vendor partnership support, technical training, consultation, design/presales (BOM, HLD, LLD), and 24/7 deployment/support with SLA coverage across enterprise networking, unified communications, security, wireless, data center, cybersecurity, and digital solutions.</p><p class="mt-2 mb-3"><span class="fw-bold">Tip:</span> Browse live <strong>Service Categories</strong> on this page to see offerings currently published in the system.</p>
      <a href="#service-categories" class="btn btn-outline-danger fs-13">Browse Categories</a>`,
      headingId: 'headingcustomiconFaqTwo',
      collapseId: 'collapsecustomiconFaqTwo',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-danger',
      accodionClass: 'accordion accordion-customicon1 accordion-danger accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">03.</span>Why choose remote / offshore support?',
      body: `<p>Our model gives you certified multi-vendor expertise (CCIE, PCNSE, NSE7), proven global delivery, flexible team scaling, and significant cost efficiency compared with building and maintaining equivalent in-house capacity.</p><p class="mt-2 mb-3"><span class="fw-bold">Note:</span> We support Cisco, Fortinet, Palo Alto, F5, NetApp, Microsoft, and more across LAN/WAN, SD-WAN, SD-Access, UC, and data center platforms.</p>
      <a href="#Clients" class="btn btn-outline-success fs-13">Success Stories</a>`,
      headingId: 'headingcustomiconFaqThree',
      collapseId: 'collapsecustomiconFaqThree',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-success',
      accodionClass: 'accordion accordion-customicon1 accordion-success accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">04.</span>How do I get started with a project?',
      body: `<p>Share your business goal, target timeline, environment details (sites, vendors, current stack), and the outcome you need. If you already reviewed a category or portfolio example, reference it in your message so our team can respond faster.</p><p class="mt-2 mb-3"><span class="fw-bold">Contact:</span> info@offshoretechx.net · +1 (702) 605-8569</p>
      <a href="#contact" class="btn btn-outline-secondary fs-13">Contact Us</a>`,
      headingId: 'headingcustomiconFaqFour',
      collapseId: 'collapsecustomiconFaqFour',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-secondary',
      accodionClass: 'accordion accordion-customicon1 accordion-secondary accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">05.</span>Are portfolio projects on this site real work?',
      body: `<p>Yes. The <strong>Our Work</strong> section presents published portfolio projects from the system. Only approved, published projects appear publicly so visitors can review real delivery examples.</p><p class="mt-2 mb-3"><span class="fw-bold">Website:</span> <a href="https://offshoretechx.net/" target="_blank" rel="noopener noreferrer">https://offshoretechx.net/</a></p>
      <a href="#highlights" class="btn btn-outline-info fs-13">View Our Work</a>`,
      headingId: 'headingcustomiconFaqFive',
      collapseId: 'collapsecustomiconFaqFive',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-info',
      accodionClass: 'accordion accordion-customicon1 accordion-info accordions-items-seperate'
    },
  ];
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private el: ElementRef,
    private elementRef: ElementRef,
    private viewScroller: ViewportScroller,
    public renderer: Renderer2,
    private serviceCategoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private portfoliosService: PortfoliosService,
    private contactService: ContactService,
    private toastr: ToastrService,
    private appStateService: AppStateService,
    private authService: AuthService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef
  ) {
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    const bodyElement = document.body;
    this.renderer.setAttribute(htmlElement, 'data-toggled', 'close');
    // this.renderer.setAttribute(htmlElement, 'data-theme-mode', 'light');
    this.renderer.removeClass(bodyElement, 'sidebar-mini');
    this.renderer.setAttribute(htmlElement, 'data-nav-layout', 'horizontal');
    this.renderer.setAttribute(htmlElement, 'data-nav-style', 'menu-click');
    this.renderer.removeAttribute(htmlElement, 'data-width');
    this.renderer.setAttribute(htmlElement, 'data-theme-mode', 'light');
    this.renderer.setAttribute(htmlElement, 'data-menu-styles', 'light');
    this.renderer.setAttribute(htmlElement, 'data-header-styles', 'light');
    this.renderer.removeAttribute(htmlElement, 'loader');
    this.renderer.removeAttribute(htmlElement, 'data-width');
    this.renderer.removeAttribute(htmlElement, 'data-bg-img');
    this.renderer.removeAttribute(htmlElement, 'data-vertical-style');

    this.renderer.removeAttribute(htmlElement, 'data-nav-style', 'icon-click');
    htmlElement.removeAttribute('style');


  }
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get dashboardRoute(): string {
    if (this.authService.isClient()) {
      return '/client/dashboard';
    }
    if (this.authService.isAdministrator()) {
      return '/admin/dashboard';
    }
    if (this.authService.isTeamMember()) {
      return '/team/dashboard';
    }
    if (this.authService.isResourceManager()) {
      return '/resource-manager/dashboard';
    }
    return '/';
  }

  get logoLink(): string {
    return this.isLoggedIn ? this.dashboardRoute : '/';
  }

  isCollapsed: any = true;
  isCollapsed1: boolean = true;
  isCollapsed2: boolean = true;
  isHorizontalCollapsed: boolean = true;
  toggleSidebar() {
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    const currentToggleValue = htmlElement.getAttribute('data-toggled');

    if (currentToggleValue !== 'open') {
      this.renderer.setAttribute(htmlElement, 'data-toggled', 'open');
    } else {
      this.renderer.setAttribute(htmlElement, 'data-toggled', 'close');
    }
  }
  expande = false;
  expande1 = false;
  expande2 = false;
  bodyclick() {
    this.expande1 = false;
    this.expande2 = false;
    this.expande = false;
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    this.renderer.setAttribute(htmlElement, 'data-toggled', 'close');
    document.querySelector('.offcanvas-end')?.classList.remove('show')
  }
  ngOnInit(): void {
    // this.menuResizeFn()
    this.renderer.addClass(this.document.body, 'landing-body');
    this.loadServiceCategories();
    this.loadPublicServices();
    this.loadPortfolioHighlights();
    // switcher.localStorageBackUp();

    const ltr = this.elementRef.nativeElement.querySelectorAll('#switcher-ltr');
    const rtl = this.elementRef.nativeElement.querySelectorAll('#switcher-rtl');

    // fromEvent(ltr, 'click').subscribe(() => {
    //   this.customOptions = { ...this.customOptions, rtl: false };
    // });

    // fromEvent(rtl, 'click').subscribe(() => {
    //   this.customOptions = { ...this.customOptions, rtl: true, autoplay: true };
    // });

  }
  get categoryHasMore(): boolean {
    return this.serviceCategoryCards.length < this.categoryTotalCount;
  }

  get serviceHasMore(): boolean {
    return this.categoryServiceCards.length < this.serviceTotalCount;
  }

  loadMoreCategories(): void {
    if (!this.categoryHasMore || this.categoryLoading || this.categoryLoadingMore) {
      return;
    }
    this.loadCategoryPage(false);
  }

  private tryLoadMoreCategoriesAtEnd(): void {
    tryLoadMoreAtCarouselEnd(
      this.getCategorySwiperHost(),
      this.serviceCategoryCards.length,
      this.categoryHasMore,
      () => this.loadMoreCategories()
    );
  }

  private tryLoadMoreServicesAtEnd(): void {
    tryLoadMoreAtCarouselEnd(
      this.getServiceSwiperHost(),
      this.categoryServiceCards.length,
      this.serviceHasMore,
      () => this.loadMoreCategoryServices()
    );
  }

  private tryLoadMorePortfoliosAtEnd(): void {
    tryLoadMoreAtCarouselEnd(
      this.getPortfolioSwiperHost(),
      this.portfolioItems.length,
      this.portfolioHasMore,
      () => this.loadMorePortfolios()
    );
  }

  loadMoreCategoryServices(): void {
    if (!this.serviceHasMore || this.serviceLoading || this.serviceLoadingMore || !this.selectedCategoryId) {
      return;
    }
    this.loadCategoryServicesPage(false);
  }

  private loadServiceCategories(): void {
    this.loadCategoryPage(true);
  }

  private loadCategoryPage(reset: boolean): void {
    if (reset) {
      if (this.categoryLoading) return;
      this.categoryLoading = true;
      this.categoryPageIndex = 1;
      this.serviceCategoryCards = [];
    } else {
      if (this.categoryLoadingMore || !this.categoryHasMore) return;
      this.categoryLoadingMore = true;
      this.categoryPageIndex += 1;
    }

    this.serviceCategoriesService
      .getPublic({
        pageIndex: this.categoryPageIndex,
        pageSize: this.categoryPageSize,
        isActive: true,
      })
      .subscribe({
        next: response => {
          const categories = [...(response.data?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
          this.categoryTotalCount = response.data?.totalCount ?? 0;
          this.serviceCategoriesCount = this.categoryTotalCount;
          const startIndex = reset ? 0 : this.serviceCategoryCards.length;
          const mapped = categories.map((category, index) =>
            this.mapServiceCategoryToCard(category, startIndex + index)
          );
          this.serviceCategoryCards = reset ? mapped : [...this.serviceCategoryCards, ...mapped];
          this.categoryLoading = false;
          this.categoryLoadingMore = false;
          this.initCategorySwiper();
        },
        error: error => {
          console.error('Failed to load public service categories for landing page.', error);
          this.categoryLoading = false;
          this.categoryLoadingMore = false;
          if (reset) {
            this.serviceCategoriesCount = 0;
            this.serviceCategoryCards = [];
            this.categoryTotalCount = 0;
          }
        },
      });
  }

  private loadCategoryServicesPage(reset: boolean): void {
    if (!this.selectedCategoryId) {
      return;
    }

    if (reset) {
      if (this.serviceLoading) return;
      this.serviceLoading = true;
      this.loadingCategoryServices = true;
      this.servicePageIndex = 1;
      this.categoryServiceCards = [];
    } else {
      if (this.serviceLoadingMore || !this.serviceHasMore) return;
      this.serviceLoadingMore = true;
      this.servicePageIndex += 1;
    }

    this.servicesService
      .getPublic({
        serviceCategoryId: this.selectedCategoryId,
        pageIndex: this.servicePageIndex,
        pageSize: this.servicePageSize,
      })
      .subscribe({
        next: response => {
          const services = response.data?.data ?? [];
          this.serviceTotalCount = response.data?.totalCount ?? 0;
          const startIndex = reset ? 0 : this.categoryServiceCards.length;
          const mapped = services.map((service, index) =>
            this.mapServiceToCard(service, startIndex + index)
          );
          this.categoryServiceCards = reset ? mapped : [...this.categoryServiceCards, ...mapped];
          this.serviceLoading = false;
          this.serviceLoadingMore = false;
          this.loadingCategoryServices = false;
          this.initServiceSwiper();
          if (reset) {
            setTimeout(() => {
              document.getElementById('category-services-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
          }
        },
        error: error => {
          console.error('Failed to load services for category.', error);
          this.categoryServiceCards = [];
          this.serviceTotalCount = 0;
          this.serviceLoading = false;
          this.serviceLoadingMore = false;
          this.loadingCategoryServices = false;
        },
      });
  }

  private loadPublicServices(): void {
    this.servicesService.getPublic({ pageIndex: 1, pageSize: 1 }).subscribe({
      next: (response) => {
        this.publicServicesCount = response.data?.totalCount ?? 0;
      },
      error: (error) => {
        console.error('Failed to load public services for landing page.', error);
        this.publicServicesCount = 0;
      }
    });
  }

  get portfolioHasMore(): boolean {
    return this.portfolioItems.length < this.portfolioTotalCount;
  }

  get portfolioShowCarouselNav(): boolean {
    return this.portfolioItems.length > 1 || this.portfolioHasMore;
  }

  get categoryShowCarouselNav(): boolean {
    return this.serviceCategoryCards.length > 1 || this.categoryHasMore;
  }

  get serviceShowCarouselNav(): boolean {
    return this.categoryServiceCards.length > 1 || this.serviceHasMore;
  }

  portfolioSlidePrev(): void {
    slideLandingCarouselPrev(this.getPortfolioSwiperHost(), this.portfolioItems.length);
    this.schedulePortfolioNavSync();
  }

  portfolioSlideNext(): void {
    slideLandingCarouselNext(
      this.getPortfolioSwiperHost(),
      this.portfolioItems.length,
      this.portfolioHasMore,
      () => this.loadMorePortfolios()
    );
    this.schedulePortfolioNavSync();
  }

  categorySlidePrev(): void {
    slideLandingCarouselPrev(this.getCategorySwiperHost(), this.serviceCategoryCards.length);
    this.scheduleCategoryNavSync();
  }

  categorySlideNext(): void {
    slideLandingCarouselNext(
      this.getCategorySwiperHost(),
      this.serviceCategoryCards.length,
      this.categoryHasMore,
      () => this.loadMoreCategories()
    );
    this.scheduleCategoryNavSync();
  }

  serviceSlidePrev(): void {
    slideLandingCarouselPrev(this.getServiceSwiperHost(), this.categoryServiceCards.length);
    this.scheduleServiceNavSync();
  }

  serviceSlideNext(): void {
    slideLandingCarouselNext(
      this.getServiceSwiperHost(),
      this.categoryServiceCards.length,
      this.serviceHasMore,
      () => this.loadMoreCategoryServices()
    );
    this.scheduleServiceNavSync();
  }

  openPortfolioDetail(card: LandingPortfolioCard): void {
    const modalRef = this.modalService.open(LandingPortfolioDetailModalComponent, {
      centered: true,
      size: 'xl',
      scrollable: true,
    });
    modalRef.componentInstance.portfolio = card;
    modalRef.closed.subscribe(() => undefined);
  }

  portfolioCoverUrl(card: LandingPortfolioCard): string {
    return card.imageUrls[0] ?? '';
  }

  loadMorePortfolios(): void {
    if (!this.portfolioHasMore || this.portfolioLoading || this.portfolioLoadingMore) {
      return;
    }
    this.loadPortfolioPage(false);
  }

  private loadPortfolioHighlights(): void {
    this.loadPortfolioPage(true);
  }

  private loadPortfolioPage(reset: boolean): void {
    if (reset) {
      if (this.portfolioLoading) return;
      this.portfolioLoading = true;
      this.portfolioPageIndex = 1;
      this.portfolioItems = [];
    } else {
      if (this.portfolioLoadingMore || !this.portfolioHasMore) return;
      this.portfolioLoadingMore = true;
      this.portfolioPageIndex += 1;
    }

    this.portfoliosService
      .getAll({ pageIndex: this.portfolioPageIndex, pageSize: this.portfolioPageSize })
      .subscribe({
        next: response => {
          const portfolios = response.data?.data ?? [];
          this.portfolioTotalCount = response.data?.totalCount ?? 0;
          this.publishedProjectsCount = this.portfolioTotalCount;
          const startIndex = reset ? 0 : this.portfolioItems.length;
          const mapped = portfolios.map((portfolio, index) =>
            this.mapPortfolioCard(portfolio, startIndex + index)
          );
          this.portfolioItems = reset ? mapped : [...this.portfolioItems, ...mapped];
          this.portfolioLoading = false;
          this.portfolioLoadingMore = false;
          this.initPortfolioSwiper();
        },
        error: error => {
          console.error('Failed to load portfolio highlights for landing page.', error);
          this.portfolioLoading = false;
          this.portfolioLoadingMore = false;
          if (reset) {
            this.publishedProjectsCount = 0;
            this.portfolioItems = [];
            this.portfolioTotalCount = 0;
          }
        },
      });
  }

  private initPortfolioSwiper(): void {
    this.initCarouselAfterView(
      () => this.swiperContainerPortfolio,
      this.portfolioItems.length,
      el => {
        this.portfolioSwiperEl = el;
        this.portfolioLoadObserver = setupLandingCarouselSentinel(
          this.portfolioLoadSentinel?.nativeElement,
          this.portfolioLoadObserver,
          () => this.portfolioHasMore && !this.portfolioLoading && !this.portfolioLoadingMore,
          () => this.loadMorePortfolios()
        );
        this.schedulePortfolioNavSync();
      },
      LANDING_CAROUSEL_PARAMS,
      this.createPortfolioCarouselHooks()
    );
  }

  private initCategorySwiper(): void {
    this.initCarouselAfterView(
      () => this.swiperContainerCategories,
      this.serviceCategoryCards.length,
      el => {
        this.categorySwiperEl = el;
        this.categoryLoadObserver = setupLandingCarouselSentinel(
          this.categoryLoadSentinel?.nativeElement,
          this.categoryLoadObserver,
          () => this.categoryHasMore && !this.categoryLoading && !this.categoryLoadingMore,
          () => this.loadMoreCategories()
        );
        this.scheduleCategoryNavSync();
      },
      LANDING_FEATURE_CAROUSEL_PARAMS,
      this.createCategoryCarouselHooks()
    );
  }

  private initServiceSwiper(): void {
    this.initCarouselAfterView(
      () => this.swiperContainerServices,
      this.categoryServiceCards.length,
      el => {
        this.serviceSwiperEl = el;
        this.serviceLoadObserver = setupLandingCarouselSentinel(
          this.serviceLoadSentinel?.nativeElement,
          this.serviceLoadObserver,
          () =>
            this.serviceHasMore &&
            !this.serviceLoading &&
            !this.serviceLoadingMore &&
            !!this.selectedCategoryId,
          () => this.loadMoreCategoryServices()
        );
        this.scheduleServiceNavSync();
      },
      LANDING_FEATURE_CAROUSEL_PARAMS,
      this.createServiceCarouselHooks()
    );
  }

  private schedulePortfolioNavSync(): void {
    this.syncPortfolioNav();
    setTimeout(() => this.syncPortfolioNav(), 0);
    setTimeout(() => this.syncPortfolioNav(), 120);
    setTimeout(() => this.syncPortfolioNav(), 350);
  }

  private scheduleCategoryNavSync(): void {
    this.syncCategoryNav();
    this.tryLoadMoreCategoriesAtEnd();
    setTimeout(() => {
      this.syncCategoryNav();
      this.tryLoadMoreCategoriesAtEnd();
    }, 0);
    setTimeout(() => {
      this.syncCategoryNav();
      this.tryLoadMoreCategoriesAtEnd();
    }, 120);
    setTimeout(() => {
      this.syncCategoryNav();
      this.tryLoadMoreCategoriesAtEnd();
    }, 350);
  }

  private scheduleServiceNavSync(): void {
    this.syncServiceNav();
    this.tryLoadMoreServicesAtEnd();
    setTimeout(() => {
      this.syncServiceNav();
      this.tryLoadMoreServicesAtEnd();
    }, 0);
    setTimeout(() => {
      this.syncServiceNav();
      this.tryLoadMoreServicesAtEnd();
    }, 120);
    setTimeout(() => {
      this.syncServiceNav();
      this.tryLoadMoreServicesAtEnd();
    }, 350);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncPortfolioNav();
    this.syncCategoryNav();
    this.syncServiceNav();
  }

  private getPortfolioSwiperHost(): LandingSwiperHost | undefined {
    return (this.portfolioSwiperEl ?? this.swiperContainerPortfolio?.nativeElement) as
      | LandingSwiperHost
      | undefined;
  }

  private getCategorySwiperHost(): LandingSwiperHost | undefined {
    return (this.categorySwiperEl ?? this.swiperContainerCategories?.nativeElement) as
      | LandingSwiperHost
      | undefined;
  }

  private getServiceSwiperHost(): LandingSwiperHost | undefined {
    return (this.serviceSwiperEl ?? this.swiperContainerServices?.nativeElement) as
      | LandingSwiperHost
      | undefined;
  }

  private syncPortfolioNav(): void {
    const state = readLandingCarouselNavState(
      this.getPortfolioSwiperHost(),
      this.portfolioItems.length,
      this.portfolioHasMore
    );
    this.portfolioCanGoPrev = state.canPrev;
    this.portfolioCanGoNext = state.canNext;
    this.cdr.markForCheck();
  }

  private syncCategoryNav(): void {
    const state = readLandingCarouselNavState(
      this.getCategorySwiperHost(),
      this.serviceCategoryCards.length,
      this.categoryHasMore
    );
    this.categoryCanGoPrev = state.canPrev;
    this.categoryCanGoNext = state.canNext;
    this.cdr.markForCheck();
  }

  private syncServiceNav(): void {
    const state = readLandingCarouselNavState(
      this.getServiceSwiperHost(),
      this.categoryServiceCards.length,
      this.serviceHasMore
    );
    this.serviceCanGoPrev = state.canPrev;
    this.serviceCanGoNext = state.canNext;
    this.cdr.markForCheck();
  }

  private initCarouselAfterView(
    containerRef: () => ElementRef | undefined,
    itemCount: number,
    onReady: (el: LandingSwiperHost) => void,
    carouselParams = LANDING_CAROUSEL_PARAMS,
    hooks?: LandingCarouselInitHooks
  ): void {
    this.cdr.detectChanges();
    void customElements.whenDefined('swiper-container').then(() => {
      this.initCarouselWhenSlidesReady(containerRef, itemCount, onReady, 0, carouselParams, hooks);
    });
  }

  /** Swiper must initialize only after Angular has rendered swiper-slide children. */
  private initCarouselWhenSlidesReady(
    containerRef: () => ElementRef | undefined,
    itemCount: number,
    onReady: (el: LandingSwiperHost) => void,
    attempt: number,
    carouselParams = LANDING_CAROUSEL_PARAMS,
    hooks?: LandingCarouselInitHooks
  ): void {
    this.cdr.detectChanges();
    const container = containerRef();
    const host = container?.nativeElement as LandingSwiperHost | undefined;

    if (!host && attempt < 40) {
      setTimeout(
        () =>
          this.initCarouselWhenSlidesReady(
            containerRef,
            itemCount,
            onReady,
            attempt + 1,
            carouselParams,
            hooks
          ),
        50
      );
      return;
    }

    const domSlides = countLandingCarouselSlides(host);

    if (domSlides >= itemCount && itemCount > 0) {
      const el = initLandingSwiperCarousel(
        container,
        itemCount,
        this.carouselAutoplayDelayMs,
        carouselParams,
        hooks
      );
      if (el) {
        onReady(el);
      }
      return;
    }

    if (attempt < 40) {
      setTimeout(
        () =>
          this.initCarouselWhenSlidesReady(
            containerRef,
            itemCount,
            onReady,
            attempt + 1,
            carouselParams,
            hooks
          ),
        50
      );
      return;
    }

    const el = initLandingSwiperCarousel(
      container,
      itemCount,
      this.carouselAutoplayDelayMs,
      carouselParams,
      hooks
    );
    if (el) {
      onReady(el);
    }
  }

  private createCategoryCarouselHooks(): LandingCarouselInitHooks {
    return {
      onReachEnd: this.onCategoryReachEnd,
      onSlideChange: this.onCategorySlideChange,
      onResize: this.onCategoryResize,
      onAfterInit: this.onCategoryAfterInit,
    };
  }

  private createServiceCarouselHooks(): LandingCarouselInitHooks {
    return {
      onReachEnd: this.onServiceReachEnd,
      onSlideChange: this.onServiceSlideChange,
      onResize: this.onServiceResize,
      onAfterInit: this.onServiceAfterInit,
    };
  }

  private createPortfolioCarouselHooks(): LandingCarouselInitHooks {
    return {
      onReachEnd: this.onPortfolioReachEnd,
      onSlideChange: this.onPortfolioSlideChange,
      onResize: this.onPortfolioResize,
      onAfterInit: this.onPortfolioAfterInit,
    };
  }

  selectCategory(card: LandingServiceCategoryCard): void {
    if (this.selectedCategoryId === card.id) {
      this.clearCategorySelection();
      return;
    }

    this.selectedCategoryId = card.id;
    this.selectedCategoryTitle = card.title;
    this.loadCategoryServicesPage(true);
  }

  clearCategorySelection(): void {
    this.serviceLoadObserver?.disconnect();
    this.serviceSwiperEl = undefined;
    this.selectedCategoryId = null;
    this.selectedCategoryTitle = '';
    this.categoryServiceCards = [];
    this.serviceTotalCount = 0;
    this.servicePageIndex = 1;
    this.loadingCategoryServices = false;
    this.serviceLoading = false;
    this.serviceLoadingMore = false;

    const section = this.serviceCategoriesSection?.nativeElement;
    if (section) {
      this.scroll(section);
    }
  }

  goToContactFromCategory(): void {
    if (this.selectedCategoryTitle) {
      this.contactForm.patchValue({
        subject: `Inquiry about ${this.selectedCategoryTitle}`,
      });
    }

    const contact = document.getElementById('contact');
    if (contact) {
      contact.scrollIntoView({ behavior: 'smooth' });
    }
  }

  submitContact(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const value = this.contactForm.getRawValue();
    this.contactSubmitting = true;

    this.contactService
      .sendMessage({
        name: value.name!.trim(),
        email: value.email!.trim(),
        subject: value.subject?.trim() || null,
        message: value.message!.trim(),
        serviceCategory: this.selectedCategoryTitle || null,
      })
      .subscribe({
        next: () => {
          this.contactSubmitting = false;
          this.toastr.success('Thank you. Your message was sent to our team.');
          this.contactForm.reset({
            name: '',
            email: '',
            subject: '',
            message: '',
          });
        },
        error: () => {
          this.contactSubmitting = false;
          },
      });
  }

  private mapServiceCategoryToCard(category: ServiceCategoryDto, index: number): LandingServiceCategoryCard {
    return {
      id: category.id,
      icon: this.serviceCategoryIcons[index % this.serviceCategoryIcons.length],
      title: category.name,
      cardClass: this.serviceCategoryCardClasses[index % this.serviceCategoryCardClasses.length],
      description: this.buildServiceCategoryDescription(category),
      servicesCount: category.servicesCount,
    };
  }

  private buildServiceCategoryDescription(category: ServiceCategoryDto): string {
    const description = category.description?.trim();

    if (description) {
      return this.truncateText(description, 150);
    }

    const serviceLabel = category.servicesCount === 1 ? 'service' : 'services';
    return `${category.servicesCount} active ${serviceLabel} currently available in this category.`;
  }

  private mapServiceToCard(service: ServiceDto, index: number): LandingServiceCard {
    const description = service.description?.trim();

    return {
      id: service.id,
      icon: this.serviceCategoryIcons[index % this.serviceCategoryIcons.length],
      title: service.name,
      cardClass: this.serviceCategoryCardClasses[index % this.serviceCategoryCardClasses.length],
      description: description
        ? this.truncateText(description, 150)
        : 'Contact us to learn more about this service offering.',
    };
  }

  private mapPortfolioCard(portfolio: PortfolioDto, index: number): LandingPortfolioCard {
    const description = this.buildPortfolioDescription(portfolio);
    const imageUrls = (portfolio.images ?? [])
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(img => portfolioImageUrl(img.imageUrl))
      .filter(url => !!url);

    return {
      id: portfolio.id,
      serviceId: portfolio.serviceId ?? null,
      title: portfolio.title,
      summary: this.truncateText(description, 120),
      description,
      categoryName: portfolio.serviceCategoryName?.trim() ?? '',
      serviceName: portfolio.serviceName?.trim() ?? '',
      clientName: portfolio.clientName?.trim() ?? '',
      year: this.formatPortfolioCompletedDate(portfolio.completedDate),
      icon: this.serviceCategoryIcons[index % this.serviceCategoryIcons.length],
      cardClass: this.serviceCategoryCardClasses[index % this.serviceCategoryCardClasses.length],
      imageUrls,
    };
  }

  private buildPortfolioDescription(portfolio: PortfolioDto): string {
    const description = portfolio.description?.trim();

    if (description) {
      return description;
    }

    return `Delivered for ${portfolio.clientName?.trim() || 'our client'} as part of our ${portfolio.serviceName?.trim() || 'service'} offering.`;
  }

  private formatPortfolioCompletedDate(completedDate: string | null): string {
    if (!completedDate) {
      return 'Recently delivered';
    }

    const date = new Date(completedDate);
    if (Number.isNaN(date.getTime())) {
      return 'Recently delivered';
    }

    return date.getFullYear().toString();
  }

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trimEnd()}...`;
  }

  ngOnDestroy(): void {
    this.portfolioLoadObserver?.disconnect();
    this.categoryLoadObserver?.disconnect();
    this.serviceLoadObserver?.disconnect();
    unbindLandingSwiperCarouselEvents(this.getCategorySwiperHost());
    unbindLandingSwiperCarouselEvents(this.getServiceSwiperHost());
    unbindLandingSwiperCarouselEvents(this.getPortfolioSwiperHost());
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    this.renderer.removeClass(this.document.body, 'landing-body');
    this.renderer.setAttribute(htmlElement, 'data-nav-layout', 'vertical');
    this.renderer.setAttribute(htmlElement, 'data-menu-styles', 'dark');
    this.renderer.setAttribute(htmlElement, 'data-vertical-style', 'overlay');
    this.renderer.removeAttribute(htmlElement, 'data-nav-style');
    this.appStateService.updateState();
  }
  scroll(el: HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth' });
  }

  scrolled: boolean = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    let number = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (number > 100) {
      this.show = true;
    } else {
      this.show = false;
    }
    this.scrolled = window.scrollY > 10;
    const sections = this.el.nativeElement.querySelectorAll('.side-menu__item');
    const scrollPos =
      window.scrollY ||
      this.elementRef.nativeElement.ownerDocument.documentElement.scrollTop ||
      document.body.scrollTop;
    sections.forEach((el: any, i: string | number) => {
      const currLink = sections[i];
      const val: any = currLink.getAttribute('value');
      const refElement: any = this.el.nativeElement.querySelector('#' + val);

      if (refElement !== null) {
        const scrollTopMinus = scrollPos + 73;
        if (
          refElement.offsetTop <= scrollTopMinus &&
          refElement.offsetTop + refElement.offsetHeight > scrollTopMinus
        ) {
          const activeNav =
            this.el.nativeElement.querySelector('.nav-scroll.active');
          if (activeNav) {
            this.renderer.removeClass(activeNav, 'active');
          }
          this.renderer.addClass(currLink, 'active');
        } else {
          this.renderer.removeClass(currLink, 'active');
        }
      }
    });
  }
  customOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    margin: 30,
    dots: true,
    navSpeed: 700,
    autoplay: true,
    navText: ['<', '>'],
    responsive: {
      0: {
        items: 1, // 1 item visible for screen width less than 400 pixels
      },
      400: {
        items: 1, // 1 item visible for screen width 400 pixels or more
      },
      740: {
        items: 1, // 2 items visible for screen width 740 pixels or more
      },
      1000: {
        items: 3, // 2 items visible for screen width 1000 pixels or more
      },
    },
    nav: false,
  };

  activeSlides!: SlidesOutputData;

  show:boolean=false;


 

  taptotop(){
    this.viewScroller.scrollToPosition([0,0]);
  }
}
