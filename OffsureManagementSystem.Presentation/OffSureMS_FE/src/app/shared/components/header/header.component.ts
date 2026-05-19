import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, Renderer2, inject, OnDestroy } from '@angular/core';
import { filter, Subscription } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { NavService } from '../../services/nav.service';
import { SwitcherService } from '../../services/switcher.service';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { SwitcherComponent } from '../switcher/switcher.component';
import { AppStateService } from '../../services/app-state.service';
import { MenuItem } from '../../models/menu-item.model';
import { AuthService } from 'app/core/services/auth.service';
import { TranslationService } from 'app/shared/services/translation.service';
import { SignalRService } from 'app/core/services/signalr.service';
import { NotificationApiService } from 'app/core/services/notification.service';
import { Router } from '@angular/router';

interface Item {
  user: any;

  id: number;
  name: string;
  type: string;
  title: string;
  // Add other properties as needed
}
export interface HeaderShortcut {
  title: string;        // translation key
  icon: string;         // icon class
  path: string;
  alwaysEnabled?: boolean;

}
interface HeaderNotification {
  id: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  link: string;
  type?: 'task' | 'message' | 'other';
  taskId?: number;
}


@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
  
})
export class HeaderComponent implements OnInit, OnDestroy {
  user: any;
  defaultAvatar = 'assets/images/user.png';
  notifications: HeaderNotification[] = [];

  notificationCount = 0;

  get profileImage(): string {
    if (this.user?.profileImage) {
      return this.user.profileImage;
    }

    return this.defaultAvatar;
  }

  roleLevel = 0;

  canAccessShortcut(item: HeaderShortcut): boolean {

    if (this.roleLevel >= 50) return true;

    return item.alwaysEnabled === true;
  }


  headerShortcuts: HeaderShortcut[] = [
    {
      title: 'nav.apps.task.title',
      icon: 'ti-check-box',
      path: '/task/task-list',
      alwaysEnabled: true
    },
    {
      title: 'nav.apps.employee.title',
      icon: 'ti-user',
      path: '/employee/employee-list'
    },
    {
      title: 'nav.apps.branch.title',
      icon: 'ti-map-alt',
      path: '/branch/branch-list'
    },
    {
      title: 'nav.apps.department.title',
      icon: 'ti-layers',
      path: '/department/department-list'
    },
    {
      title: 'nav.apps.calender.title',
      icon: 'ti-calendar',
      path: '/utilities/event-calender',
      alwaysEnabled: true
    },
    {
      title: 'nav.apps.student.title',
      icon: 'ti-id-badge',
      path: '/student/student-list'
    }
    ,
    {
      title: 'nav.apps.reports.title',
      icon: 'ti-id-badge',
      path: '/report/reports-dashboard',
      alwaysEnabled: true
    },
    {
      title: 'nav.apps.leaves.title',
      icon: 'ti-id-badge',
      path: '/leave/leave-list',
      alwaysEnabled: true
    }
  ];
  ;

  Selection = [
    { label: 'Choose one', value: 1 },
    { label: 'T-Projects...', value: 2 },
    { label: 'Microsoft Project', value: 3 },
    { label: 'Risk Management', value: 4 },
    { label: 'Team Building', value: 5 },
  ]
  private offcanvasService = inject(NgbOffcanvas);


  open() {
    this.offcanvasService.open(SwitcherComponent, {
      position: 'end',
      scroll: true,
      panelClass: 'switcher-canvas-width'
    });
  }
  cartItemCount: number = 5;
  public isCollapsed = true;
  collapse: any;
  public isSidebar = false;
  public config: any = {};
  layoutSubscription: Subscription;
  toggleClass = "fe fe-maximize";
  isFullscreen: boolean = false;
  menuItems: MenuItem[] = [];
  menuitemsSubscribe$!: Subscription;
  countryFlag: string = 'gb';

  constructor(
    private cdr: ChangeDetectorRef,
    private layoutService: LayoutService,
    public navServices: NavService,
    public modalService: NgbModal,
    public switcherService: SwitcherService,
    private elementRef: ElementRef,
    public renderer: Renderer2,
    private appStateService: AppStateService,
    private authService: AuthService,
    private translate: TranslationService,
    private signalR: SignalRService,
    private notificationService: NotificationApiService,
    private router: Router
  ) {
    this.layoutSubscription = layoutService.changeEmitted.subscribe(
      direction => {
        const dir = direction.direction;
      }
    )

  }



  categories = [
    { id: 1, name: 'IT Projects' },
    { id: 2, name: 'Business Case' },
    { id: 3, name: 'Microsoft Project' },
    { id: 4, name: 'Risk Management' },
    { id: 5, name: 'Team Building' },
  ]

  toggleSidebarNotification() {
    this.layoutService.emitSidebarNotifyChange(true);
  }

  changeLanguage(lang: string) {
    this.translate.setLanguage(lang);
  }

  mapLangToFlag(lang: string): string {
    switch (lang) {
      case 'en':
        return 'gb';
      case 'ar':
        return 'sa';
      case 'es':
      case 'fr':
      case 'de':
      case 'it':
      case 'ru':
        return lang;
      default:
        return 'gb'; // Default to English flag
    }
  }


  toggleSwitcher() {
    let emit: any = false;
    if (emit != !emit) {
      emit = !emit
      this.switcherService.emitSwitcherChange(emit);
    }
  }
  // Theme color Mode

  isCartEmpty: boolean = false;
  isNotifyEmpty: boolean = false;

  removeRow(rowId: string) {
    const rowElement = document.getElementById(rowId);
    if (rowElement) {
      rowElement.remove();


    }
    this.cartItemCount--;
    this.isCartEmpty = this.cartItemCount === 0;

  }
  removeNotify(rowId: string) {
    const rowElement = document.getElementById(rowId);
    if (rowElement) {
      rowElement.remove();


    }
    this.notificationCount--;
    this.isNotifyEmpty = this.notificationCount === 0;
  }
  handleCardClick(event: Event): void {
    // Prevent the click event from propagating to the container
    // event.preventDefault();
    event.stopPropagation();
  }
  themeType = 'dark';
  updateTheme(theme: string) {
    this.appStateService.updateState({ theme, menuColor: theme });
    if (theme == 'light') {
      this.appStateService.updateState({ theme, themeBackground: '', headerColor: 'light', menuColor: 'dark' });
      let html = document.querySelector('html');
      html?.style.removeProperty('--body-bg-rgb');
      html?.style.removeProperty('--body-bg-rgb2');
      html?.style.removeProperty('--light-rgb');
      html?.style.removeProperty('--form-control-bg');
      html?.style.removeProperty('--input-border');
      html?.style.removeProperty('--sidemenu-active-bgcolor');
    }
    if (theme == 'dark') {
      this.appStateService.updateState({ theme, themeBackground: '', headerColor: 'dark', menuColor: 'dark' });
      let html = document.querySelector('html');
      html?.style.removeProperty('--body-bg-rgb');
      html?.style.removeProperty('--body-bg-rgb2');
      html?.style.removeProperty('--light-rgb');
      html?.style.removeProperty('--form-control-bg');
      html?.style.removeProperty('--input-border');
      html?.style.removeProperty('--sidemenu-active-bgcolor');

    }
    if (window.innerWidth <= 992) {
      let html = document.querySelector('html');
      html?.setAttribute('data-toggled', 'close');
    }
  }
  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  handleFullscreenChange(event: any) {
    this.isFullscreen = this.isFullScreen();
    this.cdr.detectChanges(); // Manually trigger change detection
  }


  private isFullScreen(): boolean {
    return !!document.fullscreenElement;
  }

  private requestFullscreen() {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  }

  private exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
  SwicherOpen() {
    document.querySelector('.offcanvas-end')?.classList.toggle('show')
    document.querySelector("body")!.classList.add("overflow:hidden");
    document.querySelector("body")!.classList.add("padding-right:4px");
    const Rightside: any = document.querySelector(".offcanvas-end");
    if (document.querySelector(".switcher-backdrop")?.classList.contains('d-none')) {
      document.querySelector(".switcher-backdrop")?.classList.add("d-block");
      document.querySelector(".switcher-backdrop")?.classList.remove("d-none");
    }
  }

  togglesidebar() {
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (html?.getAttribute('data-toggled') == 'true') {
      document.querySelector('html')?.getAttribute('data-toggled') ==
        'icon-overlay-close';
    }
    else if (html?.getAttribute('data-nav-style') == 'menu-click') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'menu-click-closed'
          ? ''
          : 'menu-click-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'menu-hover') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'menu-hover-closed'
          ? ''
          : 'menu-hover-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'icon-click') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-click-closed'
          ? ''
          : 'icon-click-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'icon-hover') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-hover-closed'
          ? ''
          : 'icon-hover-closed'
      );
    }
    else if (html?.getAttribute('data-vertical-style') == 'overlay') {
      html?.setAttribute(
        'data-vertical-style', 'overlay'
      );
      html?.setAttribute(
        'data-toggled', html?.getAttribute('data-toggled') == 'icon-overlay-close'
        ? ''
        : 'icon-overlay-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'overlay') {
      document.querySelector('html')?.getAttribute('data-toggled') != null
        ? document.querySelector('html')?.removeAttribute('data-toggled')
        : document
          .querySelector('html')
          ?.setAttribute('data-toggled', 'icon-overlay-close');
    } else if (html?.getAttribute('data-vertical-style') == 'closed') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close-menu-close'
          ? ''
          : 'close-menu-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'icontext') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-text-close'
          ? ''
          : 'icon-text-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'detached') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'detached-close'
          ? ''
          : 'detached-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'doublemenu') {
      html?.setAttribute('data-toggled', html?.getAttribute('data-toggled') == 'double-menu-close' && document.querySelector(".slide.open")?.classList.contains("has-sub") && document.querySelector('.double-menu-active') ? 'double-menu-open' : 'double-menu-close');
    }

    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'open' ? 'close' : 'open'
      );
    }
  }
  rightsidebar() {
    document.querySelector(".right-sidebar-canvas")?.classList.toggle("show");
    document.querySelector("body")!.classList.add("overflow:hidden");
    document.querySelector("body")!.classList.add("padding-right:4px");
    if (document.querySelector(".right-backdrop")?.classList.contains('d-none')) {
      document.querySelector(".right-backdrop")?.classList.add("d-block");
      document.querySelector(".right-backdrop")?.classList.remove("d-none");
    }
  }

  // Search
  public items!: MenuItem[];
  public text!: string;
  public SearchResultEmpty: boolean = false;


  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.menuitemsSubscribe$ = this.navServices.getMenuItems().subscribe({
      next: (menuItems) => {
        if (menuItems) {
          this.menuItems = menuItems; // Assign only if menuItems is valid
        }
      },
      error: (err) => {
        console.error('Error fetching menu items:', err);
      }
    });
    this.translate.getCurrentLang().subscribe(lang => {
      this.countryFlag = this.mapLangToFlag(lang);
    });
    this.signalR.notification$
      .pipe(filter(n => n !== null))
      .subscribe((n) => {

        const notification: HeaderNotification = {
          id: crypto.randomUUID(),
          message: n!.message,
          createdAt: n!.createdAt,
          isRead: false,
          link: n!.link || '/pages/notifications-list',
          type: 'task',
          taskId: n!.taskId
        };

        this.notifications.unshift(notification);
        this.notificationCount = this.notifications.filter(x => !x.isRead).length;
      });


  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationCount = this.notifications.filter(x => !x.isRead).length;
  }

  ngOnDestroy() {
    if (this.menuitemsSubscribe$) {
      this.menuitemsSubscribe$.unsubscribe();
    }
  }

  Search(searchText: string) {
    if (!searchText) return this.menuItems = [];
    // items array which stores the elements
    const items: Item[] = [];
    // Converting the text to lower case by using toLowerCase() and trim() used to remove the spaces from starting and ending
    searchText = searchText.toLowerCase().trim();
    this.items.filter((menuItems: MenuItem) => {
      // checking whether menuItems having title property, if there was no title property it will return
      if (!menuItems?.title) return false;
      //  checking wheteher menuitems type is text or string and checking the titles of menuitems
      if (menuItems.type === 'link' && menuItems.title.toLowerCase().includes(searchText)) {
        // Converting the menuitems title to lowercase and checking whether title is starting with same text of searchText
        if (menuItems.title.toLowerCase().startsWith(searchText)) { // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(menuItems))
          // If both are matching then the code is pushed to items array
          items.push(menuItems as Item);
        }
      }
      //  checking whether the menuItems having children property or not if there was no children the return
      if (!menuItems.children) return false;
      menuItems.children.filter((subItems: MenuItem) => {
        if (!subItems?.title) return false;
        if (subItems.type === 'link' && subItems.title.toLowerCase().includes(searchText)) {
          if (subItems.title.toLowerCase().startsWith(searchText)) {         // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(subItems))
            items.push(subItems as Item);
          }

        }
        if (!subItems.children) return false;
        subItems.children.filter((subSubItems: MenuItem) => {
          if (subSubItems.title?.toLowerCase().includes(searchText)) {
            if (subSubItems.title.toLowerCase().startsWith(searchText)) { // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(subSubItems))
              items.push(subSubItems as Item);

            }
          }
        });
        return true;
      });
      return this.menuItems = items;
    });
    // Used to show the No search result found box if the length of the items is 0
    if (!items.length) {
      this.SearchResultEmpty = true;
    }
    else {
      this.SearchResultEmpty = false;
    }
    return true;
  }
  SearchModal(SearchModal: any) {
    this.modalService.open(SearchModal);
  }
  //  Used to clear previous search result
  clearSearch() {
    const headerSearch = document.querySelector('.header-search');
    if (headerSearch) {
      headerSearch.classList.remove('searchdrop');
    }
    this.text = '';
    this.menuItems = [];
    this.SearchResultEmpty = false;
    return this.text, this.menuItems;

  }
  SearchHeader() {
    document
      .querySelector('.header-search')
      ?.classList.add('searchdrop');
  }

  Logout() {
    this.authService.logout();
  }

handleNotificationClick(notification: HeaderNotification, event: Event) {
  event.stopPropagation();
  //event.preventDefault();
}

rows: { taskId: number; [key: string]: any }[] = [];
}

