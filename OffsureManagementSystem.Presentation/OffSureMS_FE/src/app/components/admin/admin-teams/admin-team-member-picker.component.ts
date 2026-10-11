import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamMemberOptionDto } from 'app/core/models/teams/team.models';

/**
 * Modern checklist of team members for an offshore team.
 * Features search with quick clear, select all / clear, member skill tags, and move warnings.
 */
@Component({
  selector: 'app-admin-team-member-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="member-picker__toolbar">
      <div class="member-picker__search">
        <i class="ti ti-search member-picker__search-icon"></i>
        <input
          type="text"
          class="form-control member-picker__search-input"
          placeholder="Search by name, title, or skill…"
          aria-label="Search team members"
          [(ngModel)]="search" />
        @if (search) {
          <button
            type="button"
            class="member-picker__clear-btn"
            aria-label="Clear search"
            (click)="search = ''">
            <i class="ti ti-x"></i>
          </button>
        }
      </div>

      <div class="member-picker__toolbar-actions">
        <button
          type="button"
          class="btn btn-sm btn-link member-picker__action-link"
          (click)="selectAllVisible()"
          [disabled]="!visibleMembers.length">
          Select all
        </button>
        <span class="member-picker__divider">|</span>
        <button
          type="button"
          class="btn btn-sm btn-link member-picker__action-link"
          (click)="clearAll()"
          [disabled]="!selectedIds.size">
          Clear
        </button>
        <span class="member-picker__count">
          <i class="ti ti-check"></i>
          {{ selectedIds.size }} selected
        </span>
      </div>
    </div>

    <div class="member-picker__list">
      @for (member of visibleMembers; track member.id) {
        <label class="member-picker__row" [class.member-picker__row--selected]="isSelected(member)">
          <div class="member-picker__checkbox-wrap">
            <input
              type="checkbox"
              class="form-check-input member-picker__checkbox"
              [checked]="isSelected(member)"
              (change)="toggle(member)" />
          </div>

          <div class="member-picker__avatar-wrap">
            @if (photoSrc(member); as src) {
              <img [src]="src" alt="" class="member-picker__avatar" (error)="onPhotoError(member)" />
            } @else {
              <span
                class="member-picker__avatar member-picker__avatar--initials"
                [style.background]="avatarColor(member.fullName)">
                {{ initials(member.fullName) }}
              </span>
            }
          </div>

          <div class="member-picker__content">
            <div class="member-picker__header">
              <span class="member-picker__name">{{ member.fullName }}</span>
              @if (member.teamName && member.teamId !== teamId) {
                <span
                  class="member-picker__badge"
                  [class.member-picker__badge--move]="isSelected(member)"
                  [title]="member.teamName">
                  <i class="ti ti-arrows-exchange"></i>
                  {{ isSelected(member) ? 'Moves from ' + member.teamName : member.teamName }}
                </span>
              }
            </div>

            <span class="member-picker__title">{{ member.title || 'Specialist' }}</span>

            @if (member.skills?.length) {
              <div class="member-picker__skills">
                @for (skill of member.skills.slice(0, 3); track skill) {
                  <span class="member-picker__skill-chip">{{ skill }}</span>
                }
                @if (member.skills.length > 3) {
                  <span class="member-picker__skill-chip member-picker__skill-chip--more">
                    +{{ member.skills.length - 3 }}
                  </span>
                }
              </div>
            }
          </div>
        </label>
      } @empty {
        <div class="member-picker__empty">
          <div class="member-picker__empty-icon">
            <i class="ti ti-search"></i>
          </div>
          <p class="member-picker__empty-title">
            {{ members.length ? 'No specialists match “' + search + '”' : 'No specialists available' }}
          </p>
          @if (search) {
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="search = ''">
              Reset search
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .member-picker__toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }

      .member-picker__search {
        position: relative;
        flex: 1 1 14rem;
        min-width: 0;
      }

      .member-picker__search-icon {
        position: absolute;
        inset-inline-start: 0.85rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
        color: #94a3b8;
        pointer-events: none;
      }

      .member-picker__search-input {
        padding-inline-start: 2.35rem;
        padding-inline-end: 2rem;
        height: 2.35rem;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        font-size: 0.85rem;
        background: #ffffff;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;

        &:focus {
          border-color: rgb(var(--primary-rgb));
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.12);
        }
      }

      .member-picker__clear-btn {
        position: absolute;
        inset-inline-end: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        display: grid;
        place-items: center;
        width: 1.4rem;
        height: 1.4rem;
        padding: 0;
        border: none;
        background: #e2e8f0;
        color: #64748b;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.75rem;
        transition: background 0.15s ease, color 0.15s ease;

        &:hover {
          background: #cbd5e1;
          color: #0f172a;
        }
      }

      .member-picker__toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .member-picker__action-link {
        padding: 0;
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
        color: #64748b;

        &:hover:not(:disabled) {
          color: rgb(var(--primary-rgb));
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .member-picker__divider {
        color: #cbd5e1;
        font-size: 0.75rem;
      }

      .member-picker__count {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        color: rgb(var(--primary-rgb));
        background: rgba(var(--primary-rgb), 0.1);

        i {
          font-size: 0.75rem;
        }
      }

      .member-picker__list {
        max-height: 22rem;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

        &::-webkit-scrollbar {
          width: 6px;
        }
        &::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 0 12px 12px 0;
        }
        &::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
      }

      .member-picker__row {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
        margin: 0;
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-inline-start: 3px solid transparent;
        transition: background 0.15s ease, border-color 0.15s ease;

        & + & {
          border-top: 1px solid #f1f5f9;
        }

        &:hover {
          background: #f8fafc;
        }

        &--selected {
          background: rgba(var(--primary-rgb), 0.04);
          border-inline-start-color: rgb(var(--primary-rgb));

          &:hover {
            background: rgba(var(--primary-rgb), 0.07);
          }
        }
      }

      .member-picker__checkbox-wrap {
        padding-top: 0.35rem;
      }

      .member-picker__checkbox {
        flex: none;
        margin: 0;
        width: 1.15rem;
        height: 1.15rem;
        border-radius: 5px;
        cursor: pointer;
      }

      .member-picker__avatar-wrap {
        flex: none;
      }

      .member-picker__avatar {
        display: grid;
        place-items: center;
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

        &--initials {
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.02em;
        }
      }

      .member-picker__content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .member-picker__header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .member-picker__name {
        font-size: 0.88rem;
        font-weight: 650;
        color: #0f172a;
        line-height: 1.25;
      }

      .member-picker__title {
        font-size: 0.78rem;
        color: #64748b;
        line-height: 1.25;
      }

      .member-picker__skills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.3rem;
      }

      .member-picker__skill-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.1rem 0.45rem;
        border-radius: 6px;
        font-size: 0.68rem;
        font-weight: 550;
        color: #475569;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;

        &--more {
          color: rgb(var(--primary-rgb));
          background: rgba(var(--primary-rgb), 0.08);
          border-color: transparent;
        }
      }

      .member-picker__badge {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        color: #475569;
        background: #f1f5f9;

        i {
          font-size: 0.75rem;
        }

        &--move {
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
        }
      }

      .member-picker__empty {
        margin: 0;
        padding: 2.25rem 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .member-picker__empty-icon {
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 50%;
        background: #f1f5f9;
        color: #94a3b8;
        font-size: 1.25rem;
      }

      .member-picker__empty-title {
        margin: 0;
        color: #64748b;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class AdminTeamMemberPickerComponent {
  @Input() members: TeamMemberOptionDto[] = [];
  /** The team being edited; null while creating a new team. */
  @Input() teamId: number | null = null;
  @Input() selectedIds = new Set<number>();
  @Output() selectedIdsChange = new EventEmitter<Set<number>>();

  search = '';
  private readonly brokenPhotos = new Set<number>();

  /** Search by name, title, or skills; selected people stay on top. */
  get visibleMembers(): TeamMemberOptionDto[] {
    const term = this.search.trim().toLowerCase();
    return this.members
      .filter(m => {
        if (!term) return true;
        const nameMatch = m.fullName.toLowerCase().includes(term);
        const titleMatch = m.title?.toLowerCase().includes(term);
        const skillMatch = m.skills?.some(s => s.toLowerCase().includes(term));
        return nameMatch || titleMatch || skillMatch;
      })
      .sort((a, b) => Number(this.isSelected(b)) - Number(this.isSelected(a)));
  }

  isSelected(member: TeamMemberOptionDto): boolean {
    return this.selectedIds.has(member.id);
  }

  toggle(member: TeamMemberOptionDto): void {
    const next = new Set(this.selectedIds);
    if (next.has(member.id)) {
      next.delete(member.id);
    } else {
      next.add(member.id);
    }
    this.selectedIds = next;
    this.selectedIdsChange.emit(next);
  }

  selectAllVisible(): void {
    const next = new Set(this.selectedIds);
    for (const m of this.visibleMembers) {
      next.add(m.id);
    }
    this.selectedIds = next;
    this.selectedIdsChange.emit(next);
  }

  clearAll(): void {
    const next = new Set(this.selectedIds);
    for (const m of this.visibleMembers) {
      next.delete(m.id);
    }
    this.selectedIds = next;
    this.selectedIdsChange.emit(next);
  }

  photoSrc(member: TeamMemberOptionDto): string | null {
    return this.brokenPhotos.has(member.id) ? null : resolveStorageAssetUrl(member.profilePhotoUrl);
  }

  onPhotoError(member: TeamMemberOptionDto): void {
    this.brokenPhotos.add(member.id);
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }

  avatarColor(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #4f46e5)',
      'linear-gradient(135deg, #0ea5e9, #0284c7)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ec4899, #db2777)',
      'linear-gradient(135deg, #14b8a6, #0d9488)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }
}
