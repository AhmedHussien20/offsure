import { pagination1 } from './../../../shared/prismData/pagination';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, HostListener, Inject, Renderer2, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule, OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';
import { SpkFeatureCardsComponent } from '../../../@spk/reusable-landingpage/spk-feature-cards/spk-feature-cards.component';
import { NgbAccordionComponent } from '../../../@spk/reusable-ui-elements/ngb-accordion/ngb-accordion.component';
import { SpkLandingPricingComponent } from '../../../@spk/reusable-landingpage/spk-landing-pricing/spk-landing-pricing.component';
import { TapToTopComponent } from '../../../shared/components/tap-to-top/tap-to-top.component';
import { SharedModule } from '../../../shared/shared.module';
import { PortfolioDto } from '../../../core/models/portfolios/portfolio.models';
import { ServiceCategoryDto } from '../../../core/models/services/service.models';
import { PortfoliosService } from '../../../core/services/portfolios.service';
import { ServiceCategoriesService } from '../../../core/services/service-categories.service';
import { ServicesService } from '../../../core/services/services.service';

interface LandingServiceCategoryCard {
  icon: string;
  title: string;
  cardClass: string;
  description: string;
}

interface LandingPortfolioHighlight {
  id: number;
  category: string;
  title: string;
  serviceName: string;
  description: string;
  clientName: string;
  completedDateLabel: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule,SharedModule,
     CommonModule, NgbModule, CarouselModule, RouterModule, SpkFeatureCardsComponent,SpkLandingPricingComponent,
     NgbAccordionComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  @ViewChild('swiperContainer') swiperContainer!: ElementRef;
  @ViewChild('swiperContainer1') swiperContainer1!: ElementRef;
  accodionClass: any;
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
    const swiperEl = this.swiperContainer.nativeElement;

    Object.assign(swiperEl, {
      slidesPerView: 5,
      spaceBetween: 10,
      loop: true,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
        },
        420: {
          slidesPerView: 2,
          spaceBetween: 10,
        },
        640: {
          slidesPerView: 3,
          spaceBetween: 10,
        },
        768: {
          slidesPerView: 4,
          spaceBetween: 10,
        },
        1024: {
          slidesPerView: 5,
          spaceBetween: 30,
        },

      },
    }
    );
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
  imageData = [
    {
      src: './assets/images/media/landing/web/1.png',
      title: 'Angular'
    },
    {
      src: './assets/images/media/landing/web/7.png',
      title: 'Ng Bootstrap'
    },
   {
      src: './assets/images/media/landing/web/6.png',
      title: 'NPM'
    },
   {
      src: './assets/images/media/landing/web/4.png',
      title: 'Sass'
    },
    {
      src: './assets/images/media/landing/web/6.png',
      title: 'NPM'
    },
    {
      src: './assets/images/media/landing/web/7.png',
      title: 'Ng Bootstrap'
    },
  ]
  serviceCategoryCards: LandingServiceCategoryCard[] = [];
  portfolioHighlights: LandingPortfolioHighlight[] = [];
  serviceCategoriesCount = 0;
  publicServicesCount = 0;
  publishedProjectsCount = 0;
  readonly deliveryStepsCount = 4;
  basicAccordions = [
    {
      title: ' Switch Easily From Vertical to Horizontal Menu ',
      body: ` <p> The Spruha – Bootstrap 5 Admin &amp; Dashboard Template is available in both vertical and horizontal menus. Both menus are managed by single assets. Where users can easily switch from vertical to horizontal menus. </p> <p class="mt-2 mb-3"><span class="fw-bold">Note: </span>Please Refer full Documentation  for more details. </p>
      <a href="javascript:void(0);" class="btn btn-outline-primary fs-13">Click here</a>`,
      headingId: 'headingcustomicon1One',
      collapseId: 'collapsecustomicon1One',
      collapsed: false,
      accodionItemClass: 'accordion-item acc-primary',
      accodionClass: 'accordion accordion-customicon1 accordion-primary accordions-items-seperate'
    },
    {
      title: 'Switch Easily From LTR to RTL Version',
      body: ` <p class="mb-3"> The Spruha – Bootstrap 5 Admin & Dashboard Template is available in LTR & RTL versions with single assets.Using those single assets, it’s very easy to
      switch from one version to another version.</p> <p class="mt-2 mb-3"><span class="fw-bold">Note: </span>Please Refer full Documentation  for more details. </p>
      <a href="javascript:void(0);" class="btn btn-outline-secondary fs-13">Click here</a>`,
      headingId: 'headingcustomicon1Two',
      collapseId: 'collapsecustomicon1Two',
      collapsed: false,
      accodionItemClass: 'accordion-item acc-secondary',
      accodionClass: 'accordion accordion-customicon1 accordion-secondary accordions-items-seperate'
    },
    {
      title: 'Switch Easily From One Color to Another Color style',
      body: ` <p class="mb-3"> The Spruha – Bootstrap 5 Admin &amp; Dashboard Template is available in different types of color styles. Where the users can change their template completely with those color styles. </p> <p class="mt-2 mb-3"><span class="fw-bold">Note: </span>Please Refer full Documentation  for more details. </p>
      <a href="javascript:void(0);" class="btn btn-outline-success fs-13">Click here</a>`,
      headingId: 'headingcustomicon1Three',
      collapseId: 'collapsecustomicon1Three',
      collapsed: false,
      accodionItemClass: 'accordion-item acc-success',
      accodionClass: 'accordion accordion-customicon1 accordion-success accordions-items-seperate'
    },
  ]
  basicAccordions1 = [
    {
      title: ' Switch Easily From Full Width to Boxed Layout ',
      body: ` <p class="mb-3"> T The Spruha – Bootstrap 5 Admin & Dashboard
      Template is also available in two different
      types of layouts
      “Full Width” and “Boxed” Layouts. So that user
      can switch their dashboard from one layout to
      another
      layout effortlessly.</p> <p class="mt-2 mb-3"><span class="fw-bold">Note: </span>Please Refer full Documentation  for more details. </p>
      <a href="javascript:void(0);" class="btn btn-outline-info fs-13">Click here</a>`,
      headingId: 'headingcustomicon1One',
      collapseId: 'collapsecustomicon1One',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-info',
      accodionClass: 'accordion accordion-customicon1 accordion-info accordions-items-seperate'
    },
    {
      title: 'Change Easily Side Menu Styles',
      body: `  <p>The Spruha – Bootstrap 5 Admin & Dashboard Template is also available in different types of
      Side Menu Styles.
      Where the users can change their Side Menu
      styles by using single assets.
  </p>
  <p class="mt-2 mb-3">
      <span class="fw-bold">Note: </span>Please Refer
      full Documentation
      for more details.
  </p>
      <a href="javascript:void(0);" class="btn btn-outline-danger fs-13">Click here</a>`,
      headingId: 'headingcustomicon1Two',
      collapseId: 'collapsecustomicon1Two',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-danger',
      accodionClass: 'accordion accordion-customicon1 accordion-danger accordions-items-seperate'
    },
    {
      title: ' Switch Easily From Fixed to Scrollable Layout',
      body: `   <p>
      The Spruha – Bootstrap 5 Admin & Dashboard
      Template is also available in two
      different types of layouts "Fixed Layout" and
      "Scrollable Layout". Here users
      can switch their Template from one layout to
      another layout easily.
  </p>
  <p class="mt-2 mb-3">
      <span class="fw-bold">Note: </span>Please Refer
      full Documentation
      for more details.
  </p>
      <a href="javascript:void(0);" class="btn btn-outline-warning fs-13">Click here</a>`,
      headingId: 'headingcustomicon1Three',
      collapseId: 'collapsecustomicon1Three',
      collapsed: false,
      accodionItemClass: 'accordion-item acc-warning',
      accodionClass: 'accordion accordion-customicon1 accordion-warning accordions-items-seperate'
    },
  ]
  basicAccordions2 = [
    {
      title: ' <span class="me-3 fs-18 fw-bold">01.</span>How do I browse the available services?',
      body: `<p>Start with the <strong>Service Categories</strong> section to explore the main areas Offsure currently offers. Each category highlights real service groups available in the system.</p><p class="mt-2 mb-3"><span class="fw-bold">Tip:</span> Begin with the category that best matches your business need, then continue to the portfolio section to see related delivery work.</p>
             <a href="#service-categories" class="btn btn-outline-primary fs-13">Browse Categories</a>`,
      headingId: 'headingcustomicon20Five',
      collapseId: 'collapsecustomicon20Five',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-primary',
    },
    {
      title: ' <span class="me-3 fs-18 fw-bold">02.</span>Can I contact Offsure directly from this system?',
      body: `<p>Yes. The landing page is designed to help visitors move from browsing into a real conversation with Offsure. Once you understand the service area you need, use the contact section to reach the team.</p><p class="mt-2 mb-3"><span class="fw-bold">Note:</span> The more clearly you describe your goal, timeline, and preferred service category, the easier it is for the team to respond effectively.</p>
      <a href="#contact" class="btn btn-outline-danger fs-13">Contact Offsure</a>`,
      headingId: 'headingcustomiconFaqTwo',
      collapseId: 'collapsecustomiconFaqTwo',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-danger',
      accodionClass: 'accordion accordion-customicon1 accordion-danger accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">03.</span>Are the portfolio projects shown here real client work?',
      body: `<p>Yes. The <strong>Our Work</strong> section is intended to present published portfolio projects that come from the system, so visitors can review real delivery examples instead of placeholder content.</p><p class="mt-2 mb-3"><span class="fw-bold">Note:</span> Only published projects are shown publicly, which helps keep the section focused on approved client-facing work.</p>
      <a href="#highlights" class="btn btn-outline-success fs-13">View Our Work</a>`,
      headingId: 'headingcustomiconFaqThree',
      collapseId: 'collapsecustomiconFaqThree',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-success',
      accodionClass: 'accordion accordion-customicon1 accordion-success accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">04.</span>What information should I prepare before contacting the team?',
      body: `<p>The best starting point is your business goal, the type of service you are looking for, any deadline or target launch date, and a short description of your current challenge.</p><p class="mt-2 mb-3"><span class="fw-bold">Tip:</span> If you already know the related service category or have seen a portfolio project similar to your need, mention it when you contact Offsure.</p>
      <a href="#about" class="btn btn-outline-secondary fs-13">How It Works</a>`,
      headingId: 'headingcustomiconFaqFour',
      collapseId: 'collapsecustomiconFaqFour',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-secondary',
      accodionClass: 'accordion accordion-customicon1 accordion-secondary accordions-items-seperate'
    },
    {
      title: '<span class="me-3 fs-18 fw-bold">05.</span>Can I request a service even if it is not listed exactly as shown?',
      body: `<p>Yes. The public categories help you understand Offsure’s main delivery areas, but your requirement does not need to match a card title perfectly to start a conversation.</p><p class="mt-2 mb-3"><span class="fw-bold">Note:</span> If your need is custom, use the closest category as a starting point and explain the project details in your message.</p>
      <a href="#contact" class="btn btn-outline-info fs-13">Start a Conversation</a>`,
      headingId: 'headingcustomiconFaqFive',
      collapseId: 'collapsecustomiconFaqFive',
      collapsed: true,
      accodionItemClass: 'accordion-item acc-info',
      accodionClass: 'accordion accordion-customicon1 accordion-info accordions-items-seperate'
    },
  ]
  // active = 1; // For ngbNav active tab

  pricingPlans = [
    
        {
          type: 'Basic',
          price: 39,
          frequency: 'month',
          headerClass:"card-header py-3",
          cardFooterClass:"card-footer py-3",
          features: [
            { name: '2 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
            { name: '3',text:' One-Click Apps', available: true },
            { name:"1",text: ' Databases',liClass:'text-muted', available: false },
            { name:'Unlimited',text: ' Cloud Storage',liClass:'text-muted', available: false },
            { name:'Money',text: ' Back Guarantee',liClass:'text-muted', available: false },
            { name:'24/7',text: ' support',liClass:'text-muted', available: false }
          ],
          buttonClass: 'btn-outline-secondary',
          textClass: 'text-secondary'
        },
        {
          type: 'Advanced',
          price: 199,
          frequency: 'month',
          tag: 'Limited Deal',
          tagClass:'tag bg-primary text-white float-end rounded-2',
          headerClass:"card-header py-3",
          cardFooterClass:"card-footer py-3",
          ulClass:'my-5',
          features: [
            { name: '5 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
            { name: '5',text:' One-Click Apps', available: true },
            { name:"3",text: ' Databases', available: true },
            { name:'Unlimited',text: ' Cloud Storage', available: true },
            { name:'Money',text: ' Back Guarantee', available: true },
            { name:'24/7',text: ' support', available: true }
          ],
          buttonClass: 'btn-primary-gradient text-white',
          textClass: 'text-primary'
        },
        {
          type: 'Regular',
          price: 69,
          frequency: 'month',
          headerClass:"card-header py-3",
          cardFooterClass:"card-footer py-3",
          features: [
            { name: '1 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
            { name: '4',text:' One-Click Apps', available: true },
            { name:"2",text: ' Databases', available: true },
            { name:'Unlimited',text: ' Cloud Storage',liClass:'text-muted', available: false },
            { name:'Money',text: ' Back Guarantee',liClass:'text-muted', available: false },
            { name:'24/7',text: ' support',liClass:'text-muted', available: false }
          ],
          buttonClass: 'btn-outline-danger',
          textClass: 'text-danger'
        }

  ];
  pricingPlans1= [
    {
      type: 'Basic',
      price: 399,
      frequency: 'year',
      headerClass:"card-header py-3",
      cardFooterClass:"card-footer py-3",
      features: [
        { name: '2 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
        { name: '3',text:' One-Click Apps', available: true },
        { name:"1",text: ' Databases',liClass:'text-muted', available: false },
        { name:'Unlimited',text: ' Cloud Storage',liClass:'text-muted', available: false },
        { name:'Money',text: ' Back Guarantee',liClass:'text-muted', available: false },
        { name:'24/7',text: ' support',liClass:'text-muted', available: false }
      ],
      buttonClass: 'btn-outline-secondary',
      textClass: 'text-secondary'
    },
    {
      type: 'Advanced',
      price: 1299,
      frequency: 'year',
      tagClass:'badge bg-white text-primary float-end fw-normal',
      tag: 'Limited Deal',
      headerClass:'p-3  bd-b-white-2',
      cardFooterClass:"p-3 d-grid",
      cardClass:' border bg-primary border-primary  advanced reveal revealrotate active',
      ulClass:'my-5',
      features: [
        { name: '5 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
        { name: '5',text:' One-Click Apps', available: true },
        { name:"3",text: ' Databases', available: true },
        { name:'Unlimited',text: ' Cloud Storage', available: true },
        { name:'Money',text: ' Back Guarantee', available: true },
        { name:'24/7',text: ' support', available: true }
      ],
      buttonClass: 'btn-white text-primary',
    },
    {
      type: 'Regular',
      price: 899,
      frequency: 'year',
      headerClass:"card-header py-3",
      cardFooterClass:"card-footer py-3",
      features: [
        { name: '1 Free ',text:'Domain Name', available: 'mdi-checkbox-marked-circle-outline' },
        { name: '4',text:' One-Click Apps', available: true },
        { name:"2",text: ' Databases', available: true },
        { name:'Unlimited',text: ' Cloud Storage',liClass:'text-muted', available: false },
        { name:'Money',text: ' Back Guarantee',liClass:'text-muted', available: false },
        { name:'24/7',text: ' support',liClass:'text-muted', available: false }
      ],
      buttonClass: 'btn-outline-danger',
      textClass: 'text-danger'
    }
  ]

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private el: ElementRef,
    private elementRef: ElementRef,
    private viewScroller: ViewportScroller,
    public renderer: Renderer2,
    private serviceCategoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private portfoliosService: PortfoliosService
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
  private loadServiceCategories(): void {
    this.serviceCategoriesService.getPublic({ pageIndex: 1, pageSize: 100, isActive: true }).subscribe({
      next: (response) => {
        const categories = [...(response.data?.data ?? [])].sort((first, second) => {
          if (first.displayOrder !== second.displayOrder) {
            return first.displayOrder - second.displayOrder;
          }

          return first.name.localeCompare(second.name);
        });

        this.serviceCategoriesCount = response.data?.totalCount ?? categories.length;
        this.serviceCategoryCards = categories.map((category, index) =>
          this.mapServiceCategoryToCard(category, index)
        );
      },
      error: (error) => {
        console.error('Failed to load public service categories for landing page.', error);
        this.serviceCategoriesCount = 0;
        this.serviceCategoryCards = [];
      }
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

  private loadPortfolioHighlights(): void {
    this.portfoliosService.getAll({ pageIndex: 1, pageSize: 4 }).subscribe({
      next: (response) => {
        const portfolios = response.data?.data ?? [];
        this.publishedProjectsCount = response.data?.totalCount ?? portfolios.length;
        this.portfolioHighlights = portfolios.map((portfolio) => this.mapPortfolioHighlight(portfolio));
      },
      error: (error) => {
        console.error('Failed to load portfolio highlights for landing page.', error);
        this.publishedProjectsCount = 0;
        this.portfolioHighlights = [];
      }
    });
  }

  private mapServiceCategoryToCard(category: ServiceCategoryDto, index: number): LandingServiceCategoryCard {
    return {
      icon: this.serviceCategoryIcons[index % this.serviceCategoryIcons.length],
      title: category.name,
      cardClass: this.serviceCategoryCardClasses[index % this.serviceCategoryCardClasses.length],
      description: this.buildServiceCategoryDescription(category),
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

  private mapPortfolioHighlight(portfolio: PortfolioDto): LandingPortfolioHighlight {
    return {
      id: portfolio.id,
      category: portfolio.serviceCategoryName?.trim() || 'Featured Project',
      title: portfolio.title,
      serviceName: portfolio.serviceName?.trim() || 'Custom Service Delivery',
      description: this.buildPortfolioDescription(portfolio),
      clientName: portfolio.clientName?.trim() || 'Confidential Client',
      completedDateLabel: this.formatPortfolioCompletedDate(portfolio.completedDate),
    };
  }

  private buildPortfolioDescription(portfolio: PortfolioDto): string {
    const description = portfolio.description?.trim();

    if (description) {
      return this.truncateText(description, 120);
    }

    return `Delivered for ${portfolio.clientName} as part of our ${portfolio.serviceName?.trim() || 'service'} offering.`;
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
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    this.renderer.removeClass(this.document.body, 'landing-body');
    this.renderer.setAttribute(htmlElement, 'data-nav-layout', 'vertical');

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
  active = 2;
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

  slidesStore: any[] = [
    {
      img: "./assets/images/faces/15.jpg",
      name: 'Json Taylor',
      role: 'CEO OF NORJA',
      days: "12 days"
    },
    {
      img: "./assets/images/faces/4.jpg",
      name: 'Melissa Blue',
      role: 'MANAGER CHO',
      days: "7 days"
    },
    {
      img: "./assets/images/faces/2.jpg",
      name: 'Kiara Advain',
      role: 'CEO OF EMPIRO',
      days: "2 days"
    },
    {
      img: "./assets/images/faces/10.jpg",
      name: 'Jhonson Smith',
      role: 'CHIEF SECRETARY MBIO',
      days: "16 hours"
    },
    {
      img: "./assets/images/faces/12.jpg",
      name: 'Dwayne Stort',
      role: 'CEO ARMEDILLO',
      days: "22 days"
    },
    {
      img: "./assets/images/faces/15.jpg",
      name: 'Jasmine Kova',
      role: 'Web Developer',
      days: "26 days"
    },
    {
      img: "./assets/images/faces/16.jpg",
      name: 'Dolph MR',
      role: 'CEO MR BRAND',
      days: "1 month"
    },
    {
      img: "./assets/images/faces/5.jpg",
      name: 'Brenda Simpson',
      role: 'CEO AIBMO',
      days: "1 month"
    },
    {
      img: "./assets/images/faces/5.jpg",
      name: 'Julia Sams',
      role: 'CHIEF SECRETARY BHOL',
      days: "2 month"
    }
  ];
  show:boolean=false;


 

  taptotop(){
    this.viewScroller.scrollToPosition([0,0]);
  }
}
