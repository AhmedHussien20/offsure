import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

export interface PaginatedSelectOption {
  label: string;
  value: number;
}

export type PaginatedSelectLoader = (
  search: string,
  pageIndex: number
) => Observable<{ items: PaginatedSelectOption[]; totalCount: number }>;

@Component({
  selector: 'app-paginated-select',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, TranslateModule],
  templateUrl: './paginated-select.component.html',
  styleUrl: './paginated-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PaginatedSelectComponent),
      multi: true,
    },
  ],
})
export class PaginatedSelectComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Input() pageSize = 10;
  /** Left icon (generic-form style). */
  @Input() fieldIcon = 'fe fe-list';
  /** Where to render the dropdown panel (use modal body inside modals). */
  @Input() appendTo = 'body';
  /** Increment to clear value and reload from page 1. */
  @Input() resetToken = 0;
  @Input({ required: true }) loadPage!: PaginatedSelectLoader;

  items: PaginatedSelectOption[] = [];
  loading = false;
  value: number | null = null;

  private pageIndex = 1;
  private totalCount = 0;
  private searchTerm = '';
  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetToken'] && !changes['resetToken'].firstChange) {
      this.value = null;
      this.onChange(null);
      this.resetList();
    }
    if (changes['disabled']) {
      if (this.disabled) {
        this.items = [];
      } else {
        this.resetList();
      }
    }
  }

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          this.searchTerm = term;
          this.pageIndex = 1;
          return this.fetchPage(1, true);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.resetList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasMore(): boolean {
    return this.items.length < this.totalCount;
  }

  writeValue(value: number | null): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSearch(term: string): void {
    this.search$.next(term ?? '');
  }

  onScrollToEnd(): void {
    if (this.loading || !this.hasMore) {
      return;
    }
    this.fetchPage(this.pageIndex + 1, false).subscribe();
  }

  onSelectChange(value: number | null): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }

  handleBlur(): void {
    this.onTouched();
  }

  private resetList(): void {
    this.items = [];
    this.pageIndex = 1;
    this.totalCount = 0;
    this.searchTerm = '';
    if (!this.disabled) {
      this.fetchPage(1, true).subscribe();
    }
  }

  private fetchPage(pageIndex: number, replace: boolean): Observable<void> {
    return new Observable(observer => {
      this.loading = true;
      this.loadPage(this.searchTerm, pageIndex).subscribe({
        next: res => {
          const batch = res.items ?? [];
          if (replace) {
            this.items = batch;
          } else {
            const seen = new Set(this.items.map(i => i.value));
            this.items = [...this.items, ...batch.filter(i => !seen.has(i.value))];
          }
          this.pageIndex = pageIndex;
          this.totalCount = res.totalCount ?? 0;
          this.loading = false;
          observer.next();
          observer.complete();
        },
        error: () => {
          this.loading = false;
          observer.complete();
        },
      });
    });
  }
}
