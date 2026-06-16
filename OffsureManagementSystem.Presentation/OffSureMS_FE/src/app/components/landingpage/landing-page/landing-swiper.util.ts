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
  autoplay?: {
    start?: () => void;
    stop?: () => void;
    running?: boolean;
  };
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
  __landingCarouselBoundHandlers?: LandingCarouselBoundHandlers;
  __landingCarouselSuppressRewindUntilMs?: number;
};

type LandingCarouselBoundHandlers = {
  reachEnd: () => void;
  slideChange: () => void;
  resize: () => void;
  afterInit: () => void;
};

export type LandingCarouselInitHooks = {
  onReachEnd?: () => void;
  onSlideChange?: () => void;
  onResize?: () => void;
  onAfterInit?: () => void;
};

export const LANDING_CAROUSEL_PAGE_SIZE = 10;
export const LANDING_FEATURE_CAROUSEL_PAGE_SIZE = 10;
export const LANDING_CAROUSEL_AUTOPLAY_MS = 5000;

const LANDING_CAROUSEL_BASE = {
  slidesPerGroup: 1,
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
    stopOnLastSlide: false,
  },
};

export const LANDING_CAROUSEL_PARAMS = {
  ...LANDING_CAROUSEL_BASE,
  slidesPerView: 3,
  spaceBetween: 24,
  breakpoints: {
    0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
    768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 20 },
    992: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
  },
};

export const LANDING_FEATURE_CAROUSEL_PARAMS = {
  ...LANDING_CAROUSEL_BASE,
  slidesPerView: 4,
  spaceBetween: 24,
  breakpoints: {
    0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
    768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 20 },
    992: { slidesPerView: 4, slidesPerGroup: 1, spaceBetween: 24 },
  },
};

export function countLandingCarouselSlides(host: LandingSwiperHost | undefined): number {
  return host?.querySelectorAll('swiper-slide').length ?? 0;
}

export function resolveLandingSlidesPerView(
  viewWidth?: number,
  breakpoints?: Record<string, { slidesPerView?: number }>
): number {
  const width =
    viewWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);

  if (breakpoints) {
    const matched = Object.keys(breakpoints)
      .map(Number)
      .filter(bp => !Number.isNaN(bp))
      .sort((a, b) => b - a)
      .find(bp => width >= bp);

    if (matched != null) {
      const slidesPerView = breakpoints[String(matched)]?.slidesPerView;
      if (typeof slidesPerView === 'number' && slidesPerView > 0) {
        return slidesPerView;
      }
    }
  }

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
      // fall through
    }
  }

  const fromBreakpoints = resolveLandingSlidesPerView(
    undefined,
    swiper?.params?.breakpoints
  );
  if (fromBreakpoints > 0) {
    return fromBreakpoints;
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

function bindSwiperInstanceEvents(
  swiperEl: LandingSwiperHost,
  handlers: LandingCarouselBoundHandlers
): void {
  const swiper = swiperEl.swiper as (LandingSwiperInstance & {
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
  }) | undefined;

  if (!swiper?.on) {
    return;
  }

  swiper.off?.('reachEnd', handlers.reachEnd);
  swiper.off?.('slideChange', handlers.slideChange);
  swiper.off?.('resize', handlers.resize);
  swiper.off?.('afterInit', handlers.afterInit);
  swiper.on('reachEnd', handlers.reachEnd);
  swiper.on('slideChange', handlers.slideChange);
  swiper.on('resize', handlers.resize);
  swiper.on('afterInit', handlers.afterInit);
}

/** Swiper Element auto-inits from HTML before our params apply; DOM + instance hooks are reliable. */
export function bindLandingSwiperCarouselEvents(
  swiperEl: LandingSwiperHost | undefined,
  hooks?: LandingCarouselInitHooks
): void {
  if (!swiperEl || !hooks) {
    return;
  }

  unbindLandingSwiperCarouselEvents(swiperEl);

  const handlers: LandingCarouselBoundHandlers = {
    reachEnd: () => hooks.onReachEnd?.(),
    slideChange: () => hooks.onSlideChange?.(),
    resize: () => hooks.onResize?.(),
    afterInit: () => hooks.onAfterInit?.(),
  };

  swiperEl.__landingCarouselBoundHandlers = handlers;
  swiperEl.addEventListener('swipereachend', handlers.reachEnd);
  swiperEl.addEventListener('swiperslidechange', handlers.slideChange);
  swiperEl.addEventListener('swiperresize', handlers.resize);

  if (swiperEl.swiper) {
    bindSwiperInstanceEvents(swiperEl, handlers);
    return;
  }

  const onAfterInit = (): void => {
    bindSwiperInstanceEvents(swiperEl, handlers);
    handlers.afterInit();
  };

  swiperEl.addEventListener('swiperafterinit', onAfterInit, { once: true });
}

export function unbindLandingSwiperCarouselEvents(
  swiperEl: LandingSwiperHost | undefined
): void {
  const handlers = swiperEl?.__landingCarouselBoundHandlers;
  if (!swiperEl || !handlers) {
    return;
  }

  swiperEl.removeEventListener('swipereachend', handlers.reachEnd);
  swiperEl.removeEventListener('swiperslidechange', handlers.slideChange);
  swiperEl.removeEventListener('swiperresize', handlers.resize);

  const swiper = swiperEl.swiper as (LandingSwiperInstance & {
    off?: (event: string, handler: () => void) => void;
  }) | undefined;
  swiper?.off?.('reachEnd', handlers.reachEnd);
  swiper?.off?.('slideChange', handlers.slideChange);
  swiper?.off?.('resize', handlers.resize);
  swiper?.off?.('afterInit', handlers.afterInit);

  delete swiperEl.__landingCarouselBoundHandlers;
}

function restartLandingCarouselAutoplay(swiperEl: LandingSwiperHost): void {
  const start = (): void => {
    const autoplay = swiperEl.swiper?.autoplay;
    if (!autoplay?.start) {
      return;
    }
    autoplay.stop?.();
    autoplay.start();
  };

  start();
  requestAnimationFrame(start);
  setTimeout(start, 120);
}

function suppressLandingCarouselRewind(
  swiperEl: LandingSwiperHost,
  durationMs: number
): void {
  swiperEl.__landingCarouselSuppressRewindUntilMs = Date.now() + durationMs;
}

function isLandingCarouselRewindSuppressed(
  swiperEl: LandingSwiperHost | undefined
): boolean {
  return (swiperEl?.__landingCarouselSuppressRewindUntilMs ?? 0) > Date.now();
}

function restoreLandingCarouselIndex(
  swiperEl: LandingSwiperHost,
  previousIndex: number,
  previousSlideCount: number,
  nextSlideCount: number,
  autoplayDelayMs = LANDING_CAROUSEL_AUTOPLAY_MS
): void {
  const swiper = swiperEl.swiper;
  if (!swiper || nextSlideCount < 1) {
    return;
  }

  const slidesPerView = resolveSlidesPerView(swiper);
  const previousLastIndex = resolveLastActiveIndex(previousSlideCount, slidesPerView);
  const wasAtEnd = previousIndex >= previousLastIndex;
  const nextLastIndex = resolveLastActiveIndex(nextSlideCount, slidesPerView);
  let targetIndex = Math.min(previousIndex, nextLastIndex);

  if (wasAtEnd && nextSlideCount > previousSlideCount) {
    // Land on the final snap so every newly loaded item (e.g. Web Development) is visible.
    targetIndex = nextLastIndex;
    suppressLandingCarouselRewind(swiperEl, autoplayDelayMs + 800);
  }

  swiper.update?.();
  swiper.slideTo(targetIndex, 0);
}

export function initLandingSwiperCarousel(
  container: ElementRef | undefined,
  itemCount: number,
  autoplayDelayMs = LANDING_CAROUSEL_AUTOPLAY_MS,
  carouselParams: typeof LANDING_CAROUSEL_PARAMS = LANDING_CAROUSEL_PARAMS,
  hooks?: LandingCarouselInitHooks
): LandingSwiperHost | undefined {
  const swiperEl = container?.nativeElement as LandingSwiperHost | undefined;
  if (!swiperEl || itemCount === 0) {
    return undefined;
  }

  const domSlideCount = countLandingCarouselSlides(swiperEl);
  if (domSlideCount < 1) {
    return undefined;
  }

  const params = {
    ...carouselParams,
    autoplay: {
      ...carouselParams.autoplay,
      delay: autoplayDelayMs,
    },
  };

  const swiper = swiperEl.swiper;
  const swiperSlideCount = swiper?.slides?.length ?? 0;
  const previousIndex = resolveActiveIndex(swiper);

  // Swiper Element auto-inits from HTML attributes; apply our config and hook events in place.
  if (swiperEl.initialized && swiper) {
    Object.assign(swiperEl, params);
    refreshLandingSwiperInstance(swiperEl);
    bindLandingSwiperCarouselEvents(swiperEl, hooks);
    restartLandingCarouselAutoplay(swiperEl);

    if (domSlideCount !== swiperSlideCount) {
      restoreLandingCarouselIndex(swiperEl, previousIndex, swiperSlideCount, domSlideCount);
    }

    return swiperEl;
  }

  if (swiper) {
    unbindLandingSwiperCarouselEvents(swiperEl);
    resetLandingSwiperHost(swiperEl);
  }

  Object.assign(swiperEl, params);
  swiperEl.initialize?.();
  refreshLandingSwiperInstance(swiperEl);
  bindLandingSwiperCarouselEvents(swiperEl, hooks);
  restartLandingCarouselAutoplay(swiperEl);
  return swiperEl;
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

export function restartLandingCarouselFromStart(
  swiperEl: LandingSwiperHost | undefined,
  speed = 500
): void {
  const swiper = getLandingSwiperInstance(swiperEl);
  if (!swiper || !swiperEl) {
    return;
  }

  const host = swiperEl;
  delete host.__landingCarouselSuppressRewindUntilMs;
  requestAnimationFrame(() => {
    swiper.slideTo(0, speed);
    restartLandingCarouselAutoplay(host);
  });
}

function isAtLastCarouselSnap(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number
): boolean {
  const swiper = getLandingSwiperInstance(swiperEl);
  if (!swiper || slideCount < 1) {
    return false;
  }

  const slidesPerView = resolveSlidesPerView(swiper);
  const activeIndex = resolveActiveIndex(swiper);
  const lastIndex = resolveLastActiveIndex(slideCount, slidesPerView);

  // Do not trust swiper.isEnd right after slides are appended — it can stay true briefly.
  return activeIndex >= lastIndex;
}

/** Load the next page at the end, otherwise loop back to the first slide. */
export function handleLandingCarouselReachEnd(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number,
  hasMore: boolean,
  loadMore?: () => void
): void {
  if (hasMore && loadMore) {
    getLandingSwiperInstance(swiperEl)?.autoplay?.stop?.();
    loadMore();
    return;
  }

  if (isLandingCarouselRewindSuppressed(swiperEl)) {
    return;
  }

  if (!isAtLastCarouselSnap(swiperEl, slideCount)) {
    return;
  }

  restartLandingCarouselFromStart(swiperEl);
}

/** Fetch the next API page when the carousel lands on its last snap. */
export function tryLoadMoreAtCarouselEnd(
  swiperEl: LandingSwiperHost | undefined,
  slideCount: number,
  hasMore: boolean,
  loadMore?: () => void
): void {
  if (!hasMore || !loadMore || slideCount < 1) {
    return;
  }

  const swiper = getLandingSwiperInstance(swiperEl);
  if (!swiper) {
    return;
  }

  const slidesPerView = resolveSlidesPerView(swiper);
  const activeIndex = resolveActiveIndex(swiper);
  const lastIndex = resolveLastActiveIndex(slideCount, slidesPerView);

  if (activeIndex >= lastIndex) {
    loadMore();
  }
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
      return;
    }

    if (isAtLastCarouselSnap(swiperEl, slideCount)) {
      restartLandingCarouselFromStart(swiperEl);
    }
    return;
  }

  swiper.slideNext();
}
