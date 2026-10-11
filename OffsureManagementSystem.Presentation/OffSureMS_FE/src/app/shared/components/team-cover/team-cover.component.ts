import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';

/** Hues for generated covers; picked by team name so a team keeps its colour. */
const COVER_HUES = [252, 214, 188, 152, 32, 350, 292, 200, 12, 268];

/** First keyword match wins; checked against the lower-cased team name. */
const COVER_ICONS: Array<[RegExp, string]> = [
  [/noc|monitor|support|help ?desk/, 'ti-activity'],
  [/secur|soc\b|cyber/, 'ti-shield-check'],
  [/network/, 'ti-network'],
  [/cloud|devops|dev ops/, 'ti-cloud-computing'],
  [/data|database|dba|\bbi\b|analytic/, 'ti-database'],
  [/system|sysadmin|infra|server/, 'ti-server-2'],
  [/enterprise|erp|business|dynamics|sap/, 'ti-building'],
  [/develop|software|engineer|web|mobile|\bapp/, 'ti-code'],
  [/qa|test|quality/, 'ti-checklist'],
  [/design|ui|ux/, 'ti-color-swatch'],
];

/**
 * Team cover: the uploaded image when there is one, otherwise a generated gradient
 * with an icon picked from the team name. Projected content is laid over the cover.
 */
@Component({
  selector: 'app-team-cover',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="team-cover"
      [class.team-cover--banner]="variant === 'banner'"
      [class.team-cover--image]="!!imageSrc"
      [style.--team-hue]="hue"
      [style.background-image]="imageSrc ? 'url(' + imageSrc + ')' : null">
      @if (!imageSrc) {
        <span class="team-cover__big" aria-hidden="true"><i class="ti {{ icon }}"></i></span>
        @if (variant === 'card') {
          <span class="team-cover__icon" aria-hidden="true"><i class="ti {{ icon }}"></i></span>
        }
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .team-cover {
        position: relative;
        overflow: hidden;
        aspect-ratio: 16 / 7;
        max-width: 100%;
        color: #fff;
        background-color: hsl(var(--team-hue) 45% 40%);
        background-image:
          radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.22) 1px, transparent 1.5px),
          linear-gradient(135deg, hsl(var(--team-hue) 58% 50%), hsl(calc(var(--team-hue) + 28) 62% 36%));
        background-size: 14px 14px, auto;
        background-position: center;
      }

      .team-cover--image {
        background-size: cover;
      }

      /* Keeps overlay text readable on uploaded photos. */
      .team-cover--image::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.05) 30%, rgba(15, 23, 42, 0.6) 100%);
        pointer-events: none;
      }

      .team-cover--banner {
        aspect-ratio: auto;
        min-height: 10rem;
      }

      .team-cover__big {
        position: absolute;
        inset-inline-end: -0.9rem;
        bottom: -2rem;
        font-size: 8rem;
        line-height: 1;
        opacity: 0.2;
        transform: rotate(-12deg);
        pointer-events: none;
      }

      .team-cover--banner .team-cover__big {
        font-size: 11rem;
        bottom: -2.75rem;
      }

      /* Sizes go on the <i> itself: the global Themify rule sets font-size: initial on every "ti-*" class. */
      .team-cover__big i {
        font-size: 8rem;
      }

      .team-cover--banner .team-cover__big i {
        font-size: 11rem;
      }

      .team-cover__icon i {
        font-size: 1.35rem;
      }

      .team-cover__icon {
        position: absolute;
        inset-inline-start: 1rem;
        bottom: 0.85rem;
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 0.75rem;
        font-size: 1.35rem;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(4px);
      }
    `,
  ],
})
export class TeamCoverComponent {
  @Input({ required: true }) name = '';
  @Input() coverImageUrl?: string | null;
  @Input() variant: 'card' | 'banner' = 'card';

  get imageSrc(): string | null {
    return resolveStorageAssetUrl(this.coverImageUrl);
  }

  get hue(): number {
    let hash = 0;
    for (const ch of this.name.trim().toLowerCase()) {
      hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return COVER_HUES[hash % COVER_HUES.length];
  }

  get icon(): string {
    const name = this.name.toLowerCase();
    return COVER_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? 'ti-users';
  }
}
