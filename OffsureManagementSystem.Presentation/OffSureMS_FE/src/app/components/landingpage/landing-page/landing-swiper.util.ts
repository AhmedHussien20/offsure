import { ElementRef } from '@angular/core';

export type LandingSwiperInstance = {
  activeIndex: number;
  snapIndex: number;
  snapGrid?: number[];
  slides?: { length: number } | ArrayLike<unknown>;
  params?: {
    slidesPerView?: number | 'auto';
    breakpoints?: Record<string, { slidesPerView?: number }>;
  };
  slidesPerViewDynamic?: (() => number) | number;
  destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
  slideTo: (index: number, speed?: number) => void;
  slidePrev: () => void;
  slideNext: () => void;
  isBeginning: boolean;
  isEnd: boolean;
  update?: () => void;
};

export type LandingCarouselNavState = {
  canPrev: boolean;
  canNext: boolean;
};

export type LandingSwiperHost = HTMLElement & {
  initialize?: () => void;
  initialized?: boolean;
  swiper?: LandingSwiperInstance;
};

export const LANDING_CAROUSEL_PAGE_SIZE = 10;
export const LANDING_CAROUSEL_AUTOPLAY_MS = 5000;

const LANDING_CAROUSEL_PARAMS = {
  slidesPerView: 3,
  slidesPerGroup: 1,
  spaceBetween: 24,
  loop: false,
  watchOverflow: false,
  observer: true,
  observeParents: true,
  pagination: {
    clickable: true,
    dynamicBullets: false,
  },
  autoplay: {
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
  },
  breakpoints: {
    0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
    768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 20 },
    992: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
  },
};

export function countLandingCarouselSlides(host: LandingSwiperHost | undefined): number {
  return host?.querySelectorAll('swiper-slide').length ?? 0;
}

export function resolveLandingSlidesPerView(viewWidth?: number): number {
  const width =
    viewWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  if (width >= 992) {
    return 3;
  }
  if (width >= 768) {
    return 2;
  }
  return 1;
}

function resolveSlidesPerView(swiper?: LandingSwiperInstance): number {
  if (swiper?.slidesPerViewDynamic) {
    try {
      const dynamic =
        typeof swiper.slidesPerViewDynamic === 'function'
          ? swiper.slidesPerViewDynamic()
          : swiper.slidesPerViewDynamic;
      if (typeof dynamic === 'number' && dynamic > 0) {
        return dynamic;
      }
    } catch {
      // fall through to breakpoint estimate
    }
  }

  if (swiper?.params?.slidesPerView && typeof swiper.params.slidesPerView === 'number') {
    return swiper.params.slidesPerView;
  }

  return resolveLandingSlidesPerView();
}

function resolveLastActiveIndex(slideCount: number, slidesPerView: number): number {
  return Math.max(0, slideCount - Math.max(1, Math.floor(slidesPerView)));
}

function resolveActiveIndex(swiper?: LandingSwiperInstance): number {
  if (!swiper) {
    return 0;
  }
  return Math.max(0, swiper.activeIndex ?? 0);
}

export function getLandingSwiperInstance(
  host: LandingSwiperHost | undefined
): LandingSwiperInstance | undefined {
  return host?.swiper;
}

function resetLandingSwiperHost(swiperEl: LandingSwiperHost): void {
  if (swiperEl.swiper) {
    swiperEl.swiper.destroy(true, true);
    swiperEl.initialized = false;
  }
}

function refreshLandingSwiperInstance(swiperEl: LandingSwiperHost): void {
  const refresh = (): void => {
    swiperEl.swiper?.update?.();
  };
  refresh();
  requestAnimationFrame(refresh);
}

export function initLandingSwiperCarousel(
  container: ElementRef | undefined,
  itemCount: number,
  autoplayDelayMs = LANDING_CAROUSEL_AUTOPLAY_MS
): LandingSwiperHost | undefined {
  const swiperEl = container?.nativeElement as LandingSwiperHost | undefined;
  if (!swiperEl || itemCount === 0) {
    return undefined;
  }

  const domSlideCount = countLandingCarouselSlides(swiperEl);
  if (domSlideCount < itemCount) {
    return undefined;
  }

  const params = {
    ...LANDING_CAROUSEL_PARAMS,
    autoplay: {
      ...LANDING_CAROUSEL_PARAMS.autoplay,
      delay: autoplayDelayMs,
    },
  };

  const swiper = swiperEl.swiper;
  const swiperSlideCount = swiper?.slides?.length ?? 0;
  const canUpdateInPlace =
    swiperEl.initialized &&
    swiper &&
    domSlideCount > 0 &&
    domSlideCount === swiperSlideCount;

  if (canUpdateInPlace) {
    Object.assign(swiperEl, params);
    refreshLandingSwiperInstance(swiperEl);
    return swiperEl;
  }

  if (swiper) {
    resetLandingSwiperHost(swiperEl);
  }

  Object.assign(swiperEl, params);
  if (!swiperEl.initialized) {
    swiperEl.initialize?.();
  }
  refreshLandingSwiperInstance(swiperEl);
  return swiperEl;
}

export function bindLandingSwiperEvents(
  swiperEl: HTMLElement,
  handlers: {
    onReachEnd?: () => void;
    onSlideChange?: () => void;
    onResize?: () => void;
    onAfterInit?: () => void;
  }
): void {
  if (handlers.onReachEnd) {
    swiperEl.addEventListener('swiperreachend', handlers.onReachEnd);
  }
  if (handlers.onSlideChange) {
    swiperEl.addEventListener('swiperslidechange', handlers.onSlideChange);
  }
  if (handlers.onResize) {
    swiperEl.addEventListener('swiperresize', handlers.onResize);
  }
  if (handlers.onAfterInit) {
    swiperEl.addEventListener('swiperafterinit', handlers.onAfterInit);
  }
}

export function unbindLandingSwiperEvents(
  swiperEl: HTMLElement | undefined,
  handlers: {
    onReachEnd?: () => void;
    onSlideChange?: () => void;
    onResize?: () => void;
    onAfterInit?: () => void;
  }
): void {
  if (!swiperEl) return;
  if (handlers.onReachEnd) {
    swiperEl.removeEventListener('swiperreachend', handlers.onReachEnd);
  }
  if (handlers.onSlideChange) {
    swiperEl.removeEventListener('swiperslidechange', handlers.onSlideChange);
  }
  if (handlers.onResize) {
    swiperEl.removeEventListener('swiperresize', handlers.onResize);
  }
  if (handlers.onAfterInit) {
    swiperEl.removeEventListener('swiperafterinit', handlers.onAfterInit);
  }
}

export function setupLandingCarouselSentinel(
  sentinel: HTMLElement | undefined,
  observer: IntersectionObserver | undefined,
  canLoadMore: () => boolean,
  loadMore: () => void
): IntersectionObserver | undefined {
  observer?.disconnect();
  if (!sentinel) {
    return undefined;
  }

  const next = new IntersectionObserver(
    entries => {
      if (entries[0]?.isIntersecting && canLoadMore()) {
        loadMore();
      }
    },
    { root: null, rootMargin: '240px', threshold: 0 }
  );
  next.observe(sentinel);
  return next;
}

export function readLandingCarouselNavState(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number,
  hasMore: boolean
): LandingCarouselNavState {
  if (slideCount < 1) {
    return { canPrev: false, canNext: hasMore };
  }

  const swiper = getLandingSwiperInstance(swiperEl);
  const slidesPerView = resolveSlidesPerView(swiper);
  const lastIndex = resolveLastActiveIndex(slideCount, slidesPerView);

  if (!swiper) {
    return {
      canPrev: false,
      canNext: slideCount > slidesPerView || hasMore,
    };
  }

  const activeIndex = resolveActiveIndex(swiper);

  return {
    canPrev: activeIndex > 0,
    canNext: activeIndex < lastIndex || hasMore,
  };
}

/** Step back one slide; does not alter pagination or loaded items. */
export function slideLandingCarouselPrev(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number
): void {
  const swiper = getLandingSwiperInstance(swiperEl);
  if (!swiper || slideCount < 1) {
    return;
  }

  const activeIndex = resolveActiveIndex(swiper);
  if (activeIndex <= 0) {
    return;
  }

  swiper.slidePrev();
}

/**
 * Step forward one slide. When already at the last snap and more pages exist, triggers loadMore only
 * (same as reaching the end via swipe) so pagination stays accurate.
 */
export function slideLandingCarouselNext(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number,
  hasMore: boolean,
  loadMore?: () => void
): void {
  const swiper = getLandingSwiperInstance(swiperEl);
  if (!swiper || slideCount < 1) {
    if (hasMore && loadMore) {
      loadMore();
    }
    return;
  }

  const slidesPerView = resolveSlidesPerView(swiper);
  const activeIndex = resolveActiveIndex(swiper);
  const lastIndex = resolveLastActiveIndex(slideCount, slidesPerView);

  if (activeIndex >= lastIndex) {
    if (hasMore && loadMore) {
      loadMore();
    }
    return;
  }

  swiper.slideNext();
}
