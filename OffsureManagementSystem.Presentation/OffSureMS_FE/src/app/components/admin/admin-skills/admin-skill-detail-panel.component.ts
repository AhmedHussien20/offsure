import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { SkillDto, UpdateSkillDto } from 'app/core/models/skills/skill.models';
import { SkillsService } from 'app/core/services/skills.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-skill-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-skill-detail-panel.component.html',
  styleUrl: './admin-skill-detail-panel.component.scss',
})
export class AdminSkillDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) skillId!: number;
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  loadError: string | null = null;
  skill: SkillDto | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private skillsService: SkillsService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['skillId'] && this.skillId) {
      this.loadSkill();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  toggleActive(): void {
    if (!this.skill) {
      return;
    }

    const dto: UpdateSkillDto = {
      name: this.skill.name,
      description: this.skill.description,
      skillCategoryId: this.skill.skillCategoryId,
      isActive: !this.skill.isActive,
    };

    this.updating = true;
    this.skillsService
      .update(this.skill.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(dto.isActive ? 'Skill activated.' : 'Skill deactivated.');
          this.updating = false;
          this.changed.emit();
          this.loadSkill();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update skill.');
          this.updating = false;
        },
      });
  }

  private loadSkill(): void {
    this.loading = true;
    this.loadError = null;
    this.skill = null;

    this.skillsService
      .getById(this.skillId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.skill = res.data ?? null;
          if (!this.skill) {
            this.loadError = 'Skill not found.';
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load skill.';
          this.loading = false;
        },
      });
  }
}
