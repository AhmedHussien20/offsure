import {
  Component,
  ViewChild,
  ElementRef,
  Renderer2,
  HostListener,
  OnInit,
  OnDestroy
} from '@angular/core';
import { NavService } from '../../services/nav.service';
import { Subscription, fromEvent } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from '../../models/menu-item.model';
import { AuthService } from 'app/core/services/auth.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { SwitcherComponent } from '../switcher/switcher.component';
@Component({
  selector: 'app-sidemenu',
  standalone: false,
  templateUrl: './sidemenu.component.html',
  styleUrl: './sidemenu.component.scss',
})
export class SidemenuComponent implements OnInit, OnDestroy {
  public localdata = localStorage;
  public windowSubscribe$!: Subscription;
  options = { autoHide: false, scrollbarMinSize: 100 };
  public menuitemsSubscribe$!: Subscription;

  public menuItems: MenuItem[] = [];
  accountMenuOpen = false;

  constructor(
    private navServices: NavService,
    public router: Router,
    public renderer: Renderer2,
    private authService: AuthService,
    private offcanvasService: NgbOffcanvas
  ) {
    this.menuItems = [];
  }

  get profileRoute(): string {
    if (this.authService.isClient()) {
      return '/client/profile';
    }
    if (this.authService.isTeamMember()) {
      return '/team/profile';
    }
    if (this.authService.isResourceManager()) {
      return '/resource-manager/profile';
    }
    return '/admin/profile';
  }

  get profileInitials(): string {
    const user = this.authService.getCurrentUser();
    const firstName = String(user?.firstName ?? '').trim();
    const lastName = String(user?.lastName ?? '').trim();
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.replace(/\s+/g, '').toUpperCase() || 'U';
    }
    const email = String(user?.email ?? '').trim();
    return email ? email.charAt(0).toUpperCase() : 'U';
  }

  get profileDisplayName(): string {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return 'Account';
    }
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Account';
  }

  get isProfileActive(): boolean {
    const url = this.router.url.split('?')[0];
    return url === this.profileRoute || url.startsWith(this.profileRoute + '/');
  }

  get accountTriggerActive(): boolean {
    return this.accountMenuOpen || this.isProfileActive;
  }

  toggleAccountMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  closeAccountMenu(): void {
    this.accountMenuOpen = false;
  }

  openSettings(event?: Event): void {
    event?.preventDefault();
    this.closeAccountMenu();
    this.offcanvasService.open(SwitcherComponent, {
      position: 'end',
      scroll: true,
      panelClass: 'switcher-canvas-width',
    });
  }

  logout(event?: Event): void {
    event?.preventDefault();
    this.closeAccountMenu();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar-account-dock')) {
      this.accountMenuOpen = false;
    }
  }

  clearNavDropdown() {
    this.menuItems?.forEach((a: any) => {
      a.active = false;
      a?.children?.forEach((b: any) => {
        b.active = false;
        b?.children?.forEach((c: any) => {
          c.active = false;
        });
      });
    });
  }
  ngOnInit() {

    let bodyElement: any = document.querySelector('.main-content');

    bodyElement.onclick = () => {
      if (
        localStorage.getItem('layoutStyles') == 'icon-click' ||
        localStorage.getItem('layoutStyles') == 'menu-click' ||
        localStorage.getItem('layoutStyles') == 'icon-hover' ||
        localStorage.getItem('ynexlayout') == 'horizontal'
      ) {
        document
          .querySelectorAll('.main-menu .slide-menu.child1')
          .forEach((ele: any) => {
            ele.style.display = 'none';
          });
      }

      if (localStorage.getItem('layoutStyles') == 'icontext') {
        document.querySelector('html')?.removeAttribute('data-icon-text')
      }
    };

    this.menuitemsSubscribe$ = this.navServices.getMenuItems().subscribe(items => {
      if (!items || items.length === 0) return; // Prevent overwriting with empty data
  
      this.menuItems = [...items]; // Use spread operator to avoid modifying original reference
  
      // Ensure `setNavActive` runs **only after menu is populated**
      setTimeout(() => {
        this.setNavActive(null, this.router.url);
      });
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setNavActive(null, event.urlAfterRedirects || event.url);
        this.closeAccountMenu();
      }
    });

    const WindowResize = fromEvent(window, 'resize');
    // subscribing the Observable
    if (WindowResize) {
      this.windowSubscribe$ = WindowResize.subscribe(() => {
        // to check and adjst the menu on screen size change

      });
    }

    if (document.querySelector('html')?.getAttribute('data-nav-layout') == 'horizontal' && window.innerWidth >= 992) { this.clearNavDropdown(); }
  }
  // Start of Set menu Active event
  setNavActive(event: any, currentPath: string, menuData: MenuItem[] = this.menuItems) {
    if (event?.ctrlKey) {
      return;
    }

    if (!menuData?.length) {
      return;
    }

    const normalizedPath = this.normalizeRoutePath(currentPath);
    let isAnyItemActive = false;

    const traverseMenu = (items: MenuItem[]) => {
      return items.map(item => {
        const newItem = { ...item, active: false, selected: false };

        if (newItem.path) {
          const menuPath = this.normalizeRoutePath(newItem.path);
          if (normalizedPath === menuPath || normalizedPath.startsWith(menuPath + '/')) {
            newItem.active = true;
            newItem.selected = true;
            isAnyItemActive = true;
          }
        }

        if (newItem.children && newItem.children.length > 0) {
          newItem.children = traverseMenu(newItem.children);
          if (newItem.children.some(child => child.active)) {
            newItem.active = true;
            newItem.selected = true;
          }
        }

        return newItem;
      });
    };

    this.menuItems = traverseMenu(menuData);
  }

  private normalizeRoutePath(url: string): string {
    if (!url) {
      return '';
    }
    let path = url.split('?')[0].split('#')[0];
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }
  
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)); // Creates a deep copy
  }

  getParentObject(obj: MenuItem[], childObject: MenuItem): MenuItem | null {
    for (const item of obj) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === childObject.path) {
            return item; // Return the parent object
          }
          const foundParent = this.getParentObject(item.children, childObject);
          if (foundParent) {
            return foundParent;
          }
        }
      }
    }
    return null; // Object not found
  }  

  hasParent = false;
  hasParentLevel = 0;
  //4.10
  setMenuAncestorsActive(targetObject: MenuItem) {
    const parent = this.getParentObject(this.menuItems, targetObject);
    let html = document.documentElement;
  
    if (parent) {
      parent.active = true;
      parent.selected = true;
      this.setMenuAncestorsActive(parent); // Recursive activation for all ancestors
    } else {
      this.hasParentLevel = 0;
      this.hasParent = false;
      if (html.getAttribute('data-vertical-style') == 'doublemenu') {
        html.setAttribute('data-toggled', 'double-menu-close');
      }
    }
  }

  removeActiveOtherMenus(item: any) {
    if (item) {
      if (Array.isArray(item)) {
        for (const val of item) {
          val.active = false;
          val.selected = false;
        }
      }
      item.active = false;
      item.selected = false;

      if (item.children && item.children.length > 0) {
        this.removeActiveOtherMenus(item.children);
      }
    }
    else {
      return;
    }
  }
  //04.10
  // Start of Toggle menu event

  toggleNavActive(event: any, targetObject: MenuItem, menuData = this.deepClone(this.menuItems)) {
    let html = document.documentElement;
    let element = event.target;


    if (!this.shouldToggle(html)) {
      return;
    }

    for (let i = 0; i < menuData.length; i++) {
      let item = { ...menuData[i] };

      if (item.title === targetObject.title) {
        item.active = !item.active;
        menuData[i] = item; // Replace the item in the array

        if (item.active) {
          this.closeOtherMenus(menuData, item);
          this.setAncestorsActive(menuData, item);
        }
      } else {
        item.active = false;
      }

      if (item.children && item.children.length > 0) {
        this.toggleNavActive(event, targetObject, item.children);
      }
    }

    this.menuItems = [...menuData]; // Update the component's menu state

    if (targetObject?.children && targetObject.active) {
      this.handleDoubleMenu(html);
    }

    if (element && this.isHorizontalMenu(html)) {
      this.handleHorizontalMenu(html, element, targetObject);
    }

    if (html.getAttribute('data-vertical-style') === 'icontext') {
      document.querySelector('html')?.setAttribute('data-icon-text', 'open');
    } else {
      document.querySelector('html')?.removeAttribute('data-icon-text');
    }
  }


  private shouldToggle(html: HTMLElement): boolean {
    return (
      html.getAttribute('data-nav-style') !== "icon-hover" &&
      html.getAttribute('data-nav-style') !== "menu-hover" ||
      (window.innerWidth < 992) ||
      (html.getAttribute('data-nav-layout') !== "horizontal") &&
      (html.getAttribute('data-nav-style') !== "icon-hover-closed" &&
        html.getAttribute('data-nav-style') !== "menu-hover-closed")
    );
  }

  private toggleItemActive(html: HTMLElement, item: MenuItem, menuData: MenuItem[]): void {
    item.active = !item.active;
    if (item.active) {
      this.closeOtherMenus(menuData, item);
    }
    this.setAncestorsActive(menuData, item);
  }

  private handleDoubleMenu(html: HTMLElement): void {
    if (html.getAttribute('data-vertical-style') === 'doublemenu' && html.getAttribute('data-toggled') !== 'double-menu-open') {
      html.setAttribute('data-toggled', 'double-menu-open');
    }
  }

  private isHorizontalMenu(html: HTMLElement): boolean {
    return html.getAttribute("data-nav-layout") === 'horizontal' &&
      (html.getAttribute("data-nav-style") === 'menu-click' ||
        html.getAttribute("data-nav-style") === 'icon-click');
  }

  private handleHorizontalMenu(html: HTMLElement, element: any, targetObject: MenuItem): void {
    const listItem = element.closest("li");
    if (listItem) {
      const siblingUL = listItem.querySelector("ul");
      let outterUlWidth = 0;
      let listItemUL = listItem.closest('ul:not(.main-menu)');

      while (listItemUL) {
        listItemUL = listItemUL.parentElement?.closest('ul:not(.main-menu)');
        if (listItemUL) {
          outterUlWidth += listItemUL.clientWidth;
        }
      }

      if (siblingUL) {
        let siblingULRect = listItem.getBoundingClientRect();

        if (html.getAttribute('dir') === 'rtl') {
          targetObject.dirchange =
            (siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) &&
            (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth);
        } else {
          targetObject.dirchange =
            (outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) &&
            (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth);
        }
      }

      setTimeout(() => {
        let computedValue = siblingUL?.getBoundingClientRect();
        if (computedValue && computedValue.bottom > window.innerHeight) {
          siblingUL.style.height = (window.innerHeight - computedValue.top - 8) + 'px';
          siblingUL.style.overflow = 'auto';
        }
      }, 100);
    }
  }

  setAncestorsActive(menuData: MenuItem[], targetObject: MenuItem) {
    let html = document.documentElement;
    const parent = this.findParent(menuData, targetObject);

    if (parent) {
      parent.active = true;
      if (parent.active) {
        html.setAttribute('data-toggled', 'double-menu-open');
      }
      this.setAncestorsActive(menuData, parent);
    }
  }
  closeOtherMenus(menuData: MenuItem[], targetObject: MenuItem) {
    for (const item of menuData) {
      if (item !== targetObject) {
        item.active = false;
        if (item.children && item.children.length > 0) {
          this.closeOtherMenus(item.children, targetObject);
        }
      }
    }
  }
  findParent(menuData: MenuItem[], targetObject: MenuItem) {
    for (const item of menuData) {
      if (item.children && item.children.includes(targetObject)) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const parent: any = this.findParent(item.children, targetObject);
        if (parent) {
          return parent;
        }
      }
    }
    return null;
  }
  isDoubleMenu(): boolean {
    const htmlElement = document.querySelector('[data-vertical-style="doublemenu"]');
    return htmlElement !== null;
  }

  // Method to determine if tooltip should be shown
  shouldShowTooltip(menuItem: any): boolean {
    return this.isDoubleMenu() && menuItem.title !== '';
  }
  // End of Toggle menu event
  HoverToggleInnerMenuFn(event: Event, item: MenuItem) {
    let html = document.documentElement;
    let element = event.target as HTMLElement;
    if (element && html.getAttribute("data-nav-layout") == 'horizontal' && (html.getAttribute("data-nav-style") == 'menu-hover' || html.getAttribute("data-nav-style") == 'icon-hover')) {
      const listItem = element.closest("li");
      if (listItem) {
        // Find the first sibling <ul> element
        const siblingUL = listItem.querySelector("ul");
        let outterUlWidth = 0;
        let listItemUL: any = listItem.closest('ul:not(.main-menu)');
        while (listItemUL) {
          listItemUL = listItemUL.parentElement?.closest('ul:not(.main-menu)');
          if (listItemUL) {
            outterUlWidth += listItemUL.clientWidth;
          }
        }
        if (siblingUL) {
          // You've found the sibling <ul> element
          let siblingULRect = listItem.getBoundingClientRect();
          if (html.getAttribute('dir') == 'rtl') {
            if ((siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
              item.dirchange = true;
            } else {
              item.dirchange = false;
            }
          } else {
            if ((outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
              item.dirchange = true;
            } else {
              item.dirchange = false;
            }
          }
        }
      }
    }
  }


  ngOnDestroy() {
    this.menuitemsSubscribe$.unsubscribe();
    this.windowSubscribe$.unsubscribe();
    document.querySelector('html')?.setAttribute('data-vertical-style', 'overlay');
    document.querySelector('html')?.setAttribute('data-nav-layout', 'vertical');
  }


  leftArrowFn() {
    // Used to move the slide of the menu in Horizontal and also remove the arrows after click  if there was no space 
    // Used to Slide the menu to Left side
    let slideLeft = document.querySelector('.slide-left') as HTMLElement;
    let slideRight = document.querySelector('.slide-right') as HTMLElement;
    let menuNav = document.querySelector('.main-menu') as HTMLElement;
    let mainContainer1 = document.querySelector('.main-sidebar') as HTMLElement;
    let marginRightValue = Math.ceil(Number(window.getComputedStyle(menuNav).marginInlineStart.split('px')[0]));
    let mainContainer1Width = mainContainer1.offsetWidth;
    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (marginRightValue < 0 && !(Math.abs(marginRightValue) < mainContainer1Width)) {
        menuNav.style.marginInlineStart = Number(menuNav.style.marginInlineStart.split('px')[0]) + Math.abs(mainContainer1Width) + 'px';
        slideRight.classList.remove('d-none');
      } else if (marginRightValue >= 0) {
        menuNav.style.marginInlineStart = '0px';
        slideLeft.classList.add('d-none');
        slideRight.classList.remove('d-none');
      } else {
        menuNav.style.marginInlineStart = '0px';
        slideLeft.classList.add('d-none');
        slideRight.classList.remove('d-none');
      }
    }
    else {
      menuNav.style.marginInlineStart = "0px";
      slideLeft.classList.add('d-none');
    }

    let element = document.querySelector(".main-menu > .slide.open") as HTMLElement;
    let element1 = document.querySelector(".main-menu > .slide.open >ul") as HTMLElement;
    if (element) {
      element.classList.remove("open")
    }
    if (element1) {
      element1.style.display = "none"
    }
  }
  rightArrowFn() {
    // Used to move the slide of the menu in Horizontal and also remove the arrows after click  if there was no space 
    // Used to Slide the menu to Right side
    let slideLeft = document.querySelector('.slide-left') as HTMLElement;
    let slideRight = document.querySelector('.slide-right') as HTMLElement;
    let menuNav = document.querySelector('.main-menu') as HTMLElement;
    let mainContainer1 = document.querySelector('.main-sidebar') as HTMLElement;
    let marginRightValue = Math.ceil(Number(window.getComputedStyle(menuNav).marginInlineStart.split('px')[0]));
    let check = menuNav.scrollWidth - mainContainer1.offsetWidth;
    let mainContainer1Width = mainContainer1.offsetWidth;
    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (Math.abs(check) > Math.abs(marginRightValue)) {
        if (!(Math.abs(check) > Math.abs(marginRightValue) + mainContainer1Width)) {
          mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
          slideRight.classList.add('d-none');
        }
        menuNav.style.marginInlineStart = Number(menuNav.style.marginInlineStart.split('px')[0]) - Math.abs(mainContainer1Width) + 'px';
        slideLeft.classList.remove('d-none');
      }
    }

    let element = document.querySelector(".main-menu > .slide.open") as HTMLElement
    let element1 = document.querySelector(".main-menu > .slide.open >ul") as HTMLElement
    if (element) {
      element.classList.remove("open")
    }
    if (element1) {
      element1.style.display = "none"
    }
  }

  // Addding sticky-pin
  scrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrolled = window.scrollY > 10;

    const sections = document.querySelectorAll('.side-menu__item');
    const scrollPos =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;

    sections.forEach((ele, i) => {
      const currLink = sections[i];
      const val: any = currLink.getAttribute('value');
      const refElement: any = document.querySelector('#' + val);

      // Add a null check here before accessing properties of refElement
      if (refElement !== null) {
        const scrollTopMinus = scrollPos + 73;
        if (
          refElement.offsetTop <= scrollTopMinus &&
          refElement.offsetTop + refElement.offsetHeight > scrollTopMinus
        ) {
          document.querySelector('.nav-scroll')?.classList.remove('active');
          currLink.classList.add('active');
        } else {
          currLink.classList.remove('active');
        }
      }
    });
  }


  eventTriggered: boolean = false;
  screenWidth!: number;


  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.menuResizeFn();

    this.screenWidth = window.innerWidth;

    // Check if the event hasn't been triggered and the screen width is less than or equal to your breakpoint
    if (!this.eventTriggered && this.screenWidth <= 992) {
      document.documentElement?.setAttribute('data-toggled', 'close')


      // Trigger your event or perform any action here
      this.eventTriggered = true; // Set the flag to true to prevent further triggering
    } else if (this.screenWidth > 992) {
      // Reset the flag when the screen width goes beyond the breakpoint
      this.eventTriggered = false;
    }
  }

  WindowPreSize: number[] = [window.innerWidth];
  menuResizeFn(): void {
    this.WindowPreSize.push(window.innerWidth);

    if (this.WindowPreSize.length > 2) {
      this.WindowPreSize.shift();
    }
    if (this.WindowPreSize.length > 1) {
      const html = document.documentElement;

      if (this.WindowPreSize[this.WindowPreSize.length - 1] < 992 && this.WindowPreSize[this.WindowPreSize.length - 2] >= 992) {
        // less than 992
        html.setAttribute('data-toggled', 'close');
      }

      if (this.WindowPreSize[this.WindowPreSize.length - 1] >= 992 && this.WindowPreSize[this.WindowPreSize.length - 2] < 992) {
        // greater than 992
        html.removeAttribute('data-toggled');
        document.querySelector('#responsive-overlay')?.classList.remove('active');
      }
    }
  }

  trackByMenuId(index: number, menuItem: MenuItem): string {
    // Use combination of path and title, fallback to index if neither exists
    return menuItem.path ? `${menuItem.path}-${menuItem.title}` :
      menuItem.title ? menuItem.title :
        menuItem.headTitle ? menuItem.headTitle :
          index.toString();
  }

}
