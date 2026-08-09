/** Editable Landing CMS keys only (static copy). Dynamic modules are excluded. */
export type LandingSectionKey =
  | 'home'
  | 'stats'
  | 'about'
  | 'faq'
  | 'clients'
  | 'contact'
  | 'footer';

export interface LandingPageSectionDto {
  id: number;
  sectionKey: LandingSectionKey | string;
  displayName: string;
  description: string;
  isDynamic: boolean;
  isVisible: boolean;
  sortOrder: number;
  content: Record<string, unknown>;
  updatedAt?: string | null;
}

export interface UpdateLandingPageSectionDto {
  isVisible: boolean;
  content: Record<string, unknown>;
}

export interface BulkUpdateLandingPageSectionsDto {
  sections: Array<{
    sectionKey: string;
    isVisible: boolean;
    content: Record<string, unknown>;
  }>;
}

export interface LandingHomeContent {
  legalName?: string;
  platformName?: string;
  tagline?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaSecondaryText?: string;
}

/** @deprecated Use LandingHomeContent */
export type LandingHeroContent = LandingHomeContent;

export interface LandingStatsContent {
  serviceCategoriesLabel?: string;
  publicServicesLabel?: string;
  publishedProjectsLabel?: string;
  globalProjectsLabel?: string;
  globalProjectsValue?: number;
}

export interface LandingSectionTitlesContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export interface LandingContactContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  supportHours?: string;
}

export interface LandingFooterSocialLink {
  key?: string;
  label?: string;
  icon?: string;
  url?: string;
  isVisible?: boolean;
}

export interface LandingFooterContent {
  aboutText?: string;
  copyrightText?: string;
  /** Footer Capabilities column — titles only. */
  capabilities?: Array<{ title?: string } | string>;
  socialLinks?: LandingFooterSocialLink[];
}
