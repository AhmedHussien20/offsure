import { Injectable } from '@angular/core';

/** UI state saved for a list URL. */
export interface RouteViewState {
  scrollX?: number;
  scrollY?: number;
  page?: number;
  pageSize?: number;
  extras?: Record<string, unknown>;
}

interface PendingListRestore {
  url: string;
  page: number;
  pageSize?: number;
}

/** One sessionStorage key: map of list URL → page/scroll (not every route). */
const STORAGE_KEY = 'route-view-state:lists';
const LEGACY_PREFIX = 'route-view-state:';
const MAX_LIST_ENTRIES = 30;

/**
 * Remembers list page + scroll per list URL.
 * Restores when you open that list again (sidebar click, link, or browser back).
 * Detail / non-list pages are never stored.
 */
@Injectable({ providedIn: 'root' })
export class RouteViewStateService {
  private pendingPopRestore = false;
  private liveUrl = '';
  private live: RouteViewState = {};
  private pendingListRestore: PendingListRestore | null = null;

  constructor() {
    this.clearLegacyEntries();
  }

  normalizeUrl(url: string): string {
    let normalized = (url || '/').split('#')[0].split('?')[0] || '/';
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  markPopRestore(): void {
    this.pendingPopRestore = true;
  }

  isPopRestore(): boolean {
    return this.pendingPopRestore;
  }

  clearPopRestore(): void {
    this.pendingPopRestore = false;
  }

  /** True when we have saved list state for this URL. */
  hasReturnFor(url: string): boolean {
    return !!this.readListState(url);
  }

  /** Activate a route. Seed restore when this list URL has saved state. */
  begin(url: string): void {
    const normalized = this.normalizeUrl(url);
    const saved = this.readListState(normalized);

    if (saved && this.hasRestorableListState(saved)) {
      this.liveUrl = normalized;
      this.live = { ...saved };
      if (saved.page != null && saved.page >= 1) {
        this.pendingListRestore = {
          url: normalized,
          page: saved.page,
          pageSize: saved.pageSize != null && saved.pageSize > 0 ? saved.pageSize : undefined,
        };
      } else {
        this.pendingListRestore = null;
      }
      return;
    }

    if (this.pendingListRestore?.url === normalized) {
      this.liveUrl = normalized;
      return;
    }

    this.liveUrl = normalized;
    this.pendingListRestore = null;
    this.live = {};
  }

  get(url: string): RouteViewState | null {
    const normalized = this.normalizeUrl(url);
    if (normalized === this.liveUrl && Object.keys(this.live).length) {
      return { ...this.live };
    }
    return this.readListState(normalized);
  }

  /** Update draft for the current page (page number, tab, etc.). */
  patch(url: string, partial: RouteViewState): void {
    const normalized = this.normalizeUrl(url);
    if (!this.liveUrl) {
      this.liveUrl = normalized;
    }
    if (normalized !== this.liveUrl) {
      return;
    }
    this.live = {
      ...this.live,
      ...partial,
      extras:
        partial.extras || this.live.extras
          ? {
              ...(this.live.extras ?? {}),
              ...(partial.extras ?? {}),
            }
          : undefined,
    };

    // Keep the map in sync while the user changes page on a list.
    if (this.hasRestorableListState(this.live)) {
      this.writeListState(normalized, { ...this.live });
    }
  }

  /**
   * On leave: persist this URL only if it is a list (has page / extras).
   * Detail pages are skipped so they never wipe list memory.
   */
  commitReturn(url: string, scroll: { scrollX: number; scrollY: number }): void {
    const normalized = this.normalizeUrl(url);
    if (!normalized) return;

    if (!this.hasRestorableListState(this.live)) {
      return;
    }

    this.writeListState(normalized, {
      ...this.live,
      scrollX: scroll.scrollX,
      scrollY: scroll.scrollY,
    });
  }

  clear(_url?: string): void {
    try {
      if (_url) {
        const map = this.readMap();
        delete map[this.normalizeUrl(_url)];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    this.pendingListRestore = null;
  }

  peekListRestore(url: string): { page: number; pageSize?: number } | null {
    const normalized = this.normalizeUrl(url);
    if (this.pendingListRestore?.url === normalized) {
      return {
        page: this.pendingListRestore.page,
        pageSize: this.pendingListRestore.pageSize,
      };
    }
    const saved = this.readListState(normalized);
    if (!saved || saved.page == null || saved.page < 1) {
      return null;
    }
    return {
      page: saved.page,
      pageSize: saved.pageSize != null && saved.pageSize > 0 ? saved.pageSize : undefined,
    };
  }

  consumeListRestore(url: string): { page: number; pageSize?: number } | null {
    const normalized = this.normalizeUrl(url);
    if (this.pendingListRestore?.url === normalized) {
      const result = {
        page: this.pendingListRestore.page,
        pageSize: this.pendingListRestore.pageSize,
      };
      this.pendingListRestore = null;
      return result;
    }
    return this.peekListRestore(url);
  }

  restorePageIfPop(url: string): { page: number; pageSize?: number } | null {
    return this.consumeListRestore(url);
  }

  savePage(url: string, page: number, pageSize?: number): void {
    this.patch(url, {
      page,
      ...(pageSize != null && pageSize > 0 ? { pageSize } : {}),
    });
  }

  seedListPaging(
    url: string,
    target: {
      page: number;
      entries: number;
      searchCriteria?: { pageIndex: number; pageSize: number };
    }
  ): boolean {
    const restored = this.peekListRestore(url);
    if (!restored) {
      return false;
    }
    target.page = restored.page;
    if (target.searchCriteria) {
      target.searchCriteria.pageIndex = restored.page;
    }
    if (restored.pageSize != null) {
      target.entries = restored.pageSize;
      if (target.searchCriteria) {
        target.searchCriteria.pageSize = restored.pageSize;
      }
    }
    return true;
  }

  private hasRestorableListState(state: RouteViewState): boolean {
    if (state.page != null && state.page >= 1) {
      return true;
    }
    return !!state.extras && Object.keys(state.extras).length > 0;
  }

  private readMap(): Record<string, RouteViewState> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, RouteViewState>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private readListState(url: string): RouteViewState | null {
    const state = this.readMap()[this.normalizeUrl(url)];
    return state ? { ...state } : null;
  }

  private writeListState(url: string, state: RouteViewState): void {
    try {
      const map = this.readMap();
      const normalized = this.normalizeUrl(url);
      map[normalized] = state;

      const keys = Object.keys(map);
      if (keys.length > MAX_LIST_ENTRIES) {
        // Drop oldest-inserted keys (object key order is insertion order).
        const drop = keys.length - MAX_LIST_ENTRIES;
        for (let i = 0; i < drop; i++) {
          delete map[keys[i]];
        }
      }

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }

  private clearLegacyEntries(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(LEGACY_PREFIX) && key !== STORAGE_KEY) {
          toRemove.push(key);
        }
      }
      for (const key of toRemove) {
        sessionStorage.removeItem(key);
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(LEGACY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }
}
