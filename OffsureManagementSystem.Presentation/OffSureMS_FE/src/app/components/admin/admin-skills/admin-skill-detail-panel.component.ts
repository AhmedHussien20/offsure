import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SkillDto, UpdateSkillDto } from 'app/core/models/skills/skill.models';
import { SkillsService } from 'app/core/services/skills.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-skill-detail-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-skill-detail-panel.component.html',
  styleUrl: './admin-skill-detail-panel.component.scss',
})
export class AdminSkillDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) skillId!: number;
  @Input() categoryOptions: { id: number; name: string }[] = [];
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  saving = false;
  editing = false;
  loadError: string | null = null;
  skill: SkillDto | null = null;
  form!: FormGroup;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private skillsService: SkillsService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      skillCategoryId: [null, Validators.required],
      isActive: [true],
    });
  }

  get formConfig(): FormFieldConfig[] {
    return [
      { type: 'input', inputType: 'text', name: 'name', label: 'Skill Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      {
        type: 'select',
        name: 'skillCategoryId',
        label: 'Category',
        selectType: 'simple',
        options: this.categoryOptions.map(c => ({ label: c.name, value: c.id })),
        validations: { required: true },
      },
      { type: 'checkbox', name: 'isActive', label: 'Active' },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['skillId'] && this.skillId) {
      this.editing = false;
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

  startEdit(): void {
    if (!this.skill) {
      return;
    }
    this.patchForm(this.skill);
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.skill) {
      this.patchForm(this.skill);
    }
  }

  saveEdit(): void {
    if (!this.skill || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: UpdateSkillDto = {
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description).trim() : undefined,
      skillCategoryId: Number(raw.skillCategoryId),
      isActive: !!raw.isActive,
    };

    this.saving = true;
    this.skillsService
      .update(this.skill.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Skill updated.');
          this.saving = false;
          this.editing = false;
          this.changed.emit();
          this.loadSkill();
        },
        error: err => {
          this.saving = false;
        },
      });
  }

  toggleActive(): void {
    if (!this.skill || this.editing) {
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
          this.updating = false;
        },
      });
  }

  private patchForm(skill: SkillDto): void {
    this.form.patchValue({
      name: skill.name,
      description: skill.description ?? '',
      skillCategoryId: skill.skillCategoryId,
      isActive: skill.isActive,
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
          } else {
            this.patchForm(this.skill);
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
