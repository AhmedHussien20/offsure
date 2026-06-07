import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { SkillCategoryDto, UpdateSkillCategoryDto } from 'app/core/models/skills/skill.models';
import { SkillCategoriesService } from 'app/core/services/skill-categories.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-skill-category-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-skill-category-detail-panel.component.html',
  styleUrl: './admin-skill-category-detail-panel.component.scss',
})
export class AdminSkillCategoryDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) categoryId!: number;
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  loadError: string | null = null;
  category: SkillCategoryDto | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private skillCategoriesService: SkillCategoriesService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] && this.categoryId) {
      this.loadCategory();
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
    if (!this.category) {
      return;
    }

    const dto: UpdateSkillCategoryDto = {
      name: this.category.name,
      description: this.category.description,
      isActive: !this.category.isActive,
    };

    this.updating = true;
    this.skillCategoriesService
      .update(this.category.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(dto.isActive ? 'Category activated.' : 'Category deactivated.');
          this.updating = false;
          this.changed.emit();
          this.loadCategory();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update category.');
          this.updating = false;
        },
      });
  }

  private loadCategory(): void {
    this.loading = true;
    this.loadError = null;
    this.category = null;

    this.skillCategoriesService
      .getById(this.categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.category = res.data ?? null;
          if (!this.category) {
            this.loadError = 'Category not found.';
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load category.';
          this.loading = false;
        },
      });
  }
}
