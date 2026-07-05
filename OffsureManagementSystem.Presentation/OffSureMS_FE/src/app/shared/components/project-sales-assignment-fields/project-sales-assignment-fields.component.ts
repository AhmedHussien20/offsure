import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SalesUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

const SALES_PAGE_SIZE = 10;
const SALES_SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-project-sales-assignment-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-sales-assignment-fields.component.html',
  styleUrl: './project-sales-assignment-fields.component.scss',
})
export class ProjectSalesAssignmentFieldsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() budget: number | null = null;
  @Input() initialSalesId: number | null = null;
  @Input() initialSalesName: string | null = null;

  salesUsersList: SalesUserDto[] = [];
  salesCatalogById = new Map<number, SalesUserDto>();
  salesLoading = false;
  salesPageIndex = 1;
  salesHasMore = true;
  salesTotalCount = 0;
  salesSearchQuery = '';

  private readonly destroy$ = new Subject<void>();
  private readonly salesSearch$ = new Subject<string>();

  constructor(private teamMembersService: TeamMembersService) {}

  get salesSelected(): boolean {
    const v = this.form.get('salesId')?.value;
    return v != null && v !== '';
  }

  get selectedSalesId(): number | null {
    const v = this.form.get('salesId')?.value;
    return v != null && v !== '' ? Number(v) : null;
  }

  get selectedSalesUser(): SalesUserDto | null {
    const id = this.selectedSalesId;
    return id != null ? this.salesCatalogById.get(id) ?? null : null;
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

  get salesInitials(): string {
    const name = this.selectedSalesUser?.fullName?.trim() || this.initialSalesName?.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  ngOnInit(): void {
    this.seedInitialSales();

    this.salesSearch$
      .pipe(debounceTime(SALES_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => this.loadSalesPage(false));

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

    this.loadSalesPage(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isSalesUserSelected(userId: number): boolean {
    return this.selectedSalesId === userId;
  }

  onSalesSearchInput(value: string): void {
    this.salesSearchQuery = value;
    this.salesSearch$.next(value);
  }

  onSalesPickerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.salesLoading || !this.salesHasMore) {
      return;
    }
    this.loadSalesPage(true);
  }

  toggleSalesUser(user: SalesUserDto): void {
    this.salesCatalogById.set(user.id, user);
    if (this.selectedSalesId === user.id) {
      this.form.patchValue({ salesId: null, commissionType: null, commissionValue: null });
    } else {
      this.form.patchValue({ salesId: user.id });
    }
  }

  clearSalesSelection(): void {
    this.form.patchValue({ salesId: null, commissionType: null, commissionValue: null });
  }

  onCommissionTypeChange(type: 'Fixed' | 'Percentage'): void {
    this.form.patchValue({ commissionType: type, commissionValue: null });
  }

  private seedInitialSales(): void {
    if (this.initialSalesId && this.initialSalesId > 0) {
      if (!this.form.get('salesId')?.value) {
        this.form.patchValue({ salesId: this.initialSalesId }, { emitEvent: false });
      }
      const name = this.initialSalesName?.trim() || 'Linked sales user';
      this.salesCatalogById.set(this.initialSalesId, {
        id: this.initialSalesId,
        firstName: '',
        lastName: '',
        fullName: name,
        email: '',
        isActive: true,
      });
    }
  }

  private loadSalesPage(append: boolean): void {
    if (this.salesLoading) return;
    if (append && !this.salesHasMore) return;

    const pageIndex = append ? this.salesPageIndex + 1 : 1;
    this.salesLoading = true;

    this.teamMembersService
      .getSalesUsers({
        pageIndex,
        pageSize: SALES_PAGE_SIZE,
        isActive: true,
        searchKey: this.salesSearchQuery.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = paged?.data ?? [];
          batch.forEach(user => this.salesCatalogById.set(user.id, user));

          if (append) {
            const existing = new Set(this.salesUsersList.map(u => u.id));
            this.salesUsersList = [
              ...this.salesUsersList,
              ...batch.filter(u => !existing.has(u.id)),
            ];
          } else {
            this.salesUsersList = batch;
          }

          this.salesPageIndex = pageIndex;
          this.salesTotalCount = paged?.totalCount ?? 0;
          this.salesHasMore = this.salesUsersList.length < this.salesTotalCount;
          this.salesLoading = false;
        },
        error: () => {
          this.salesLoading = false;
        },
      });
  }
}
