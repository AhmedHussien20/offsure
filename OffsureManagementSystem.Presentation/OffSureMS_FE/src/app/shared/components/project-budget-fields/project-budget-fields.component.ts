import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProjectBudgetMode } from 'app/core/models/projects/project.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-project-budget-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-budget-fields.component.html',
  styleUrl: './project-budget-fields.component.scss',
})
export class ProjectBudgetFieldsComponent implements OnInit, OnDestroy {
  /** Parent form must include budget controls. */
  @Input({ required: true }) form!: FormGroup;
  /** standalone = total/hourly only; convert = same as request + custom */
  @Input() mode: 'standalone' | 'convert' = 'standalone';
  @Input() requestBudget: number | null = null;
  /** Unique prefix for radio ids when multiple modals exist. */
  @Input() idPrefix = 'pb';

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form
      .get('budgetMode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitBudgetValidity());

    this.form
      .get('customBudgetType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitBudgetValidity());

    this.emitBudgetValidity();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get computedHourlyTotal(): number {
    const rate = Number(this.form.get('hourlyRate')?.value) || 0;
    const hours = Number(this.form.get('expectedHours')?.value) || 0;
    return rate * hours;
  }

  get budgetMode(): ProjectBudgetMode | string {
    return this.form.get('budgetMode')?.value ?? 'total';
  }

  get customBudgetType(): string {
    return this.form.get('customBudgetType')?.value ?? 'total';
  }

  private emitBudgetValidity(): void {
    // Validators are set on parent form; this hook keeps change detection fresh.
  }
}
