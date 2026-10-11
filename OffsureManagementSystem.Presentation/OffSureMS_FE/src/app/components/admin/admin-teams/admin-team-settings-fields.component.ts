import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

const MAX_DISPLAY_ORDER = 999;

/** Visibility switch and catalog position for a team form (controls: isActive, displayOrder). */
@Component({
  selector: 'app-admin-team-settings-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="team-settings" [formGroup]="form">
      <label class="team-settings__visibility" [class.team-settings__visibility--on]="isActive">
        <span class="team-settings__eye">
          <i class="ti" [class.ti-eye-check]="isActive" [class.ti-eye-off]="!isActive"></i>
        </span>
        <span class="team-settings__text">
          <strong>{{ isActive ? 'Visible to clients' : 'Hidden from clients' }}</strong>
          <small>
            {{
              isActive
                ? 'Shows on the Offshore TechX “Offshore team” tab once it has members.'
                : 'Only admins can see it. Turn it on when the team is ready.'
            }}
          </small>
        </span>
        <span class="form-check form-switch m-0">
          <input class="form-check-input" type="checkbox" role="switch" formControlName="isActive" />
        </span>
      </label>

      <div class="team-settings__order">
        <span class="team-settings__text">
          <strong>Position in the catalog</strong>
          <small>Lower numbers show first. Teams with the same number are sorted by name.</small>
        </span>
        <div class="team-settings__stepper">
          <button type="button" aria-label="Move earlier" [disabled]="order <= 0" (click)="step(-1)">
            <i class="fe fe-minus"></i>
          </button>
          <input
            type="number"
            min="0"
            [max]="maxOrder"
            aria-label="Display order"
            formControlName="displayOrder" />
          <button type="button" aria-label="Move later" [disabled]="order >= maxOrder" (click)="step(1)">
            <i class="fe fe-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .team-settings {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
        gap: 0.75rem;
        margin-top: 0.25rem;
      }

      .team-settings__visibility,
      .team-settings__order {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        margin: 0;
        padding: 0.85rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
      }

      .team-settings__visibility {
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;

        &--on {
          border-color: #a7f3d0;
          background: #f0fdf4;
        }
      }

      .team-settings__eye {
        flex: none;
        display: grid;
        place-items: center;
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 50%;
        color: #64748b;
        background: #f1f5f9;
        transition: background 0.15s ease, color 0.15s ease;

        i {
          font-size: 1.2rem;
        }

        .team-settings__visibility--on & {
          color: #fff;
          background: #10b981;
        }
      }

      .team-settings__text {
        flex: 1;
        min-width: 0;
        display: grid;
        gap: 0.1rem;

        strong {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        small {
          font-size: 0.76rem;
          line-height: 1.4;
          color: #64748b;
        }
      }

      .form-switch .form-check-input {
        width: 2.5rem;
        height: 1.35rem;
        cursor: pointer;
      }

      .team-settings__stepper {
        flex: none;
        display: inline-flex;
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;

        button {
          display: grid;
          place-items: center;
          width: 2.1rem;
          height: 2.3rem;
          padding: 0;
          border: 0;
          color: rgb(var(--primary-rgb));
          background: #f8fafc;
          cursor: pointer;

          i {
            font-size: 1rem;
          }

          &:hover:not(:disabled) {
            background: rgba(var(--primary-rgb), 0.1);
          }

          &:disabled {
            color: #cbd5e1;
            cursor: not-allowed;
          }
        }

        input {
          width: 3rem;
          height: 2.3rem;
          border: 0;
          border-inline: 1px solid #e2e8f0;
          text-align: center;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #0f172a;
          -moz-appearance: textfield;

          &::-webkit-outer-spin-button,
          &::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          &:focus {
            outline: none;
            background: rgba(var(--primary-rgb), 0.05);
          }
        }
      }
    `,
  ],
})
export class AdminTeamSettingsFieldsComponent {
  @Input({ required: true }) form!: FormGroup;

  readonly maxOrder = MAX_DISPLAY_ORDER;

  get isActive(): boolean {
    return !!this.form.get('isActive')?.value;
  }

  get order(): number {
    return Number(this.form.get('displayOrder')?.value) || 0;
  }

  step(delta: number): void {
    const next = Math.min(MAX_DISPLAY_ORDER, Math.max(0, this.order + delta));
    this.form.get('displayOrder')?.setValue(next);
    this.form.get('displayOrder')?.markAsDirty();
  }
}
