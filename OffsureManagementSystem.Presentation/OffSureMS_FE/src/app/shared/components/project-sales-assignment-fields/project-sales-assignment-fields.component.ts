import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SalesUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-project-sales-assignment-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-sales-assignment-fields.component.html',
  styleUrl: './project-sales-assignment-fields.component.scss',
})
export class ProjectSalesAssignmentFieldsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() budget: number | null = null;
  @Input() initialSalesId: number | null = null;
  /** Strip outer chrome when nested inside a parent section (e.g. convert modal). */
  @Input() embedded = false;
  /** Compact top-card layout for modals. */
  @Input() compact = false;

  salesUsers: SalesUserDto[] = [];
  loadingSales = false;

  private readonly destroy$ = new Subject<void>();

  constructor(private teamMembersService: TeamMembersService) {}

  get salesSelected(): boolean {
    const v = this.form.get('salesId')?.value;
    return v != null && v !== '';
  }

  get commissionType(): string {
    return this.form.get('commissionType')?.value ?? '';
  }

  get calculatedCommission(): number | null {
    if (!this.salesSelected || this.commissionType !== 'Percentage') {
      return null;
    }
    const pct = Number(this.form.get('commissionValue')?.value);
    if (!pct || !this.budget) {
      return null;
    }
    return Math.round(this.budget * pct) / 100;
  }

  ngOnInit(): void {
    this.loadSalesUsers();

    if (this.initialSalesId && !this.form.get('salesId')?.value) {
      this.form.patchValue({ salesId: this.initialSalesId }, { emitEvent: false });
    }

    this.form
      .get('salesId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(salesId => {
        if (salesId == null || salesId === '') {
          this.form.patchValue(
            { commissionType: null, commissionValue: null },
            { emitEvent: false }
          );
        }
      });

    this.form
      .get('commissionType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type === 'Fixed') {
          this.form.patchValue({ commissionValue: null }, { emitEvent: false });
        } else if (type === 'Percentage') {
          this.form.patchValue({ commissionValue: null }, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCommissionTypeChange(type: 'Fixed' | 'Percentage'): void {
    this.form.patchValue({ commissionType: type, commissionValue: null });
  }

  private loadSalesUsers(): void {
    this.loadingSales = true;
    this.teamMembersService.getSalesUsers({ pageIndex: 1, pageSize: 200, isActive: true }).subscribe({
      next: res => {
        this.salesUsers = res.data?.data ?? [];
        this.loadingSales = false;
      },
      error: () => {
        this.salesUsers = [];
        this.loadingSales = false;
      },
    });
  }
}
