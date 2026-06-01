import { Component, ElementRef, HostListener, OnInit, Renderer2, OnDestroy } from '@angular/core';
import { NavService } from '../../services/nav.service';
import { SwitcherService } from '../../services/switcher.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { MenuItem } from '../../models/menu-item.model'; 
import { AuthService } from 'app/core/services/auth.service';
import { SignalRService } from 'app/core/services/signalr.service';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-full-layout',
  standalone:false,
  templateUrl: './full-layout.component.html',
  styleUrls: ['./full-layout.component.scss'],
})
export class FullLayoutComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  menuitemsSubscribe$!: Subscription;

  currentRoute: string | undefined;
  urlData: string[] | undefined;

  constructor(
    private router: Router,
    public navServices: NavService,
    private elementRef: ElementRef,
    public switcherService: SwitcherService,
    private renderer: Renderer2,
    private authService: AuthService,
    private signalR: SignalRService,
    private appStateService: AppStateService
  ) {
    const htmlElement =
      this.elementRef.nativeElement.ownerDocument.documentElement;
    let html = document.querySelector('html');
    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close'
      );
    }
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo(0, 0);
      });
  }

  ngOnInit(): void {
    // Landing page sets global light/horizontal menu attrs; re-apply portal theme on first entry.
    this.appStateService.updateState();

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
    
    const user = this.authService.getCurrentUser();

    if (user) {
      console.log('🔁 Reconnecting SignalR for user:', user.userId);
      //this.signalR.startConnection(user.userId);
    }
  }

  ngOnDestroy() {
    if (this.menuitemsSubscribe$) {
      this.menuitemsSubscribe$.unsubscribe();
    }
  }

  menuItem = {
    active: false,
  };

  clearToggle() {
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    html?.setAttribute('data-toggled', 'close');
    document.querySelector('#responsive-overlay')?.classList.remove('active');
  }

  clickOnBody() {
    document.querySelector('#responsive-overlay')?.classList.remove('active');
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close'
      );
    }
    html?.removeAttribute('data-icon-text');

    this.menuItem.active = !this.menuItem.active;

    if (
      html.getAttribute('data-nav-layout') == 'horizontal' &&
      window.innerWidth >= 992
    ) {
      this.clearNavDropdown();
    }
    const navStyle = document.documentElement.getAttribute('data-nav-style');
    if (
      navStyle === 'menu-click' ||
      navStyle === 'menu-hover' ||
      navStyle === 'icon-click' ||
      navStyle === 'icon-hover'
    ) {
      document
        .querySelector('.double-menu-active')
        ?.setAttribute('style', 'display: none;');
    }
    document.querySelector('.header-search')?.classList.remove('searchdrop');
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

  closeMenu() {
    this.menuItems?.forEach((a: any) => {
      if (this.menuItems) {
        a.active = false;
      }
      a?.children?.forEach((b: any) => {
        if (a.children) {
          b.active = false;
        }
      });
    });
  }

  scrolled: boolean = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrolled = window.scrollY > 64;
  }
}
