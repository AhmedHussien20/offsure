import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouteViewStateService } from './route-view-state.service';

/**
 * Saves list scroll on leave; restores when that list URL is opened again
 * (side menu, link, or browser back). Non-list routes scroll to top.
 */
@Injectable({ providedIn: 'root' })
export class AppScrollService {
  private currentUrl = '';
  private navigationTrigger: 'imperative' | 'popstate' | 'hashchange' = 'imperative';

  constructor(
    private router: Router,
    private viewState: RouteViewStateService
  ) {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        this.viewState.clearPopRestore();
        const nav = this.router.getCurrentNavigation();
        this.navigationTrigger = nav?.trigger ?? 'imperative';

        if (this.navigationTrigger === 'imperative' && this.currentUrl) {
          this.viewState.commitReturn(this.currentUrl, this.readScroll());
        }
      });

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(event => {
        const targetUrl = event.urlAfterRedirects;
        const isPop = this.navigationTrigger === 'popstate';

        if (isPop) {
          this.viewState.markPopRestore();
        }
        this.viewState.begin(targetUrl);

        if (this.viewState.hasReturnFor(targetUrl)) {
          const saved = this.viewState.get(targetUrl);
          this.restoreScrollWithRetry(saved?.scrollX ?? 0, saved?.scrollY ?? 0);
        } else {
          this.writeScroll(0, 0, true);
        }

        this.currentUrl = targetUrl;
        this.navigationTrigger = 'imperative';
      });
  }

  private readScroll(): { scrollX: number; scrollY: number } {
    const main = document.querySelector('.main-content.app-content') as HTMLElement | null;
    const xs = [
      window.scrollX || 0,
      document.documentElement?.scrollLeft ?? 0,
      document.body?.scrollLeft ?? 0,
      main?.scrollLeft ?? 0,
    ];
    const ys = [
      window.scrollY || 0,
      document.documentElement?.scrollTop ?? 0,
      document.body?.scrollTop ?? 0,
      main?.scrollTop ?? 0,
    ];
    return {
      scrollX: Math.max(...xs),
      scrollY: Math.max(...ys),
    };
  }

  private restoreScrollWithRetry(x: number, y: number): void {
    const attempts = [0, 50, 150, 350, 700, 1200];
    for (const delay of attempts) {
      window.setTimeout(() => this.writeScroll(x, y, false), delay);
    }
  }

  private writeScroll(x: number, y: number, smooth: boolean): void {
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

    try {
      window.scrollTo({ left: x, top: y, behavior });
    } catch {
      window.scrollTo(x, y);
    }

    document.documentElement.scrollLeft = x;
    document.documentElement.scrollTop = y;
    document.body.scrollLeft = x;
    document.body.scrollTop = y;

    const main = document.querySelector('.main-content.app-content') as HTMLElement | null;
    if (main) {
      main.scrollLeft = x;
      main.scrollTop = y;
    }
  }
}
