import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAX_MILESTONE_COUNT, MIN_MILESTONE_COUNT } from 'app/core/utils/project-milestone.util';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-project-milestone-create-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-milestone-create-fields.component.html',
  styleUrl: './project-milestone-create-fields.component.scss',
})
export class ProjectMilestoneCreateFieldsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() idPrefix = 'ms';
  @Input() mode: 'standalone' | 'convert' = 'standalone';
  /** Strip outer chrome when nested inside a parent section (e.g. convert modal). */
  readonly embedded = input(false);

  readonly minCount = MIN_MILESTONE_COUNT;
  readonly maxCount = MAX_MILESTONE_COUNT;

  private readonly destroy$ = new Subject<void>();

  get isFixedBudget(): boolean {
    if (this.mode === 'convert') {
      const budgetMode = this.form?.get('budgetMode')?.value;
      return budgetMode === 'sameAsRequest' || this.form?.get('customBudgetType')?.value === 'total';
    }
    return this.form?.get('customBudgetType')?.value === 'total';
  }

  get usesMilestones(): boolean {
    return !!this.form?.get('usesMilestones')?.value;
  }

  ngOnInit(): void {
    this.syncValidators();

    this.form
      .get('customBudgetType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncValidators());

    this.form
      .get('budgetMode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncValidators());

    this.form
      .get('usesMilestones')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncValidators());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncValidators(): void {
    const countCtrl = this.form.get('milestoneCount');
    countCtrl?.clearValidators();

    if (!this.isFixedBudget) {
      this.form.patchValue({ usesMilestones: false, milestoneCount: null }, { emitEvent: false });
    } else if (this.usesMilestones) {
      countCtrl?.setValidators([
        Validators.required,
        Validators.min(MIN_MILESTONE_COUNT),
        Validators.max(MAX_MILESTONE_COUNT),
      ]);
    }

    countCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
