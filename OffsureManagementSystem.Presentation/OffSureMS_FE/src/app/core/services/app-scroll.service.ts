import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Saves scroll position per URL on leave; restores on browser back.
 * Smooth-scrolls to top on forward navigation between app routes.
 */
@Injectable({ providedIn: 'root' })
export class AppScrollService {
  private readonly positions = new Map<string, [number, number]>();
  private currentUrl = '';

  constructor(private router: Router) {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => this.savePosition(this.currentUrl));

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(event => {
        const nav = this.router.getCurrentNavigation();
        const isPop = nav?.trigger === 'popstate';
        const targetUrl = event.urlAfterRedirects;

        if (isPop) {
          const saved = this.positions.get(targetUrl);
          if (saved) {
            requestAnimationFrame(() => this.scrollTo(saved[0], saved[1], false));
          } else {
            this.scrollTo(0, 0, true);
          }
        } else {
          this.scrollTo(0, 0, true);
        }

        this.currentUrl = targetUrl;
      });
  }

  private getScrollElement(): HTMLElement | null {
    return (
      (document.querySelector('.main-content.app-content') as HTMLElement | null) ??
      document.documentElement
    );
  }

  private savePosition(url: string): void {
    const el = this.getScrollElement();
    if (!el) return;

    const isWindow = el === document.documentElement;
    const x = isWindow ? window.scrollX : el.scrollLeft;
    const y = isWindow ? window.scrollY : el.scrollTop;
    this.positions.set(url, [x, y]);
  }

  private scrollTo(x: number, y: number, smooth: boolean): void {
    const el = this.getScrollElement();
    if (!el) return;

    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

    if (el === document.documentElement) {
      window.scrollTo({ left: x, top: y, behavior });
    } else {
      el.scrollTo({ left: x, top: y, behavior });
    }
  }
}
