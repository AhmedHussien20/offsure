import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ToolbarSelectLoader, ToolbarSelectOption } from './toolbar-select.models';

@Component({
  selector: 'app-toolbar-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toolbar-select.component.html',
  styleUrl: './toolbar-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToolbarSelectComponent),
      multi: true,
    },
  ],
})
export class ToolbarSelectComponent implements ControlValueAccessor, OnInit, OnDestroy, OnChanges {
  @Input() label = '';
  @Input() inputId = 'toolbarSelect';
  @Input() options: ToolbarSelectOption[] = [];
  @Input() loadPage?: ToolbarSelectLoader;
  @Input() pageSize = 20;
  @Input() nullOptionLabel?: string;
  @Input() searchable = false;

  @Output() selectionChange = new EventEmitter<number | string | null>();

  @ViewChild('fieldInput') fieldInput?: ElementRef<HTMLInputElement>;

  open = false;
  search = '';
  value: number | string | null = null;
  loadedOptions: ToolbarSelectOption<number>[] = [];
  loading = false;

  private pageIndex = 1;
  private totalCount = 0;
  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private onChange: (value: number | string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get isPaginated(): boolean {
    return !!this.loadPage;
  }

  get displayOptions(): ToolbarSelectOption[] {
    if (this.isPaginated) {
      return this.loadedOptions;
    }
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.options;
    }
    return this.options.filter(o => o.label.toLowerCase().includes(term));
  }

  get selectedLabel(): string {
    if (this.nullOptionLabel != null && (this.value == null || this.value === '')) {
      return this.nullOptionLabel;
    }
    const match = this.findOptionLabel(this.value);
    return match ?? this.nullOptionLabel ?? '';
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isPaginated && this.open) {
          this.resetAndLoad();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loadPage'] && !changes['loadPage'].firstChange && this.open) {
      this.resetAndLoad();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: number | string | null): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: number | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(_isDisabled: boolean): void {
    // Optional disabled state can be added later.
  }

  onTriggerClick(): void {
    if (!this.open) {
      this.openPanel();
    }
  }

  onFieldInput(value: string): void {
    if (!this.open) {
      return;
    }
    this.search = value;
    if (this.isPaginated || this.searchable) {
      this.search$.next(this.search);
    }
  }

  openPanel(): void {
    this.open = true;
    this.search = '';
    if (this.isPaginated) {
      this.resetAndLoad();
    }
    setTimeout(() => {
      const input = this.fieldInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  closePanel(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.search = '';
    this.onTouched();
  }

  onListScroll(event: Event): void {
    if (!this.isPaginated) {
      return;
    }
    const el = event.target as HTMLElement;
    if (isNearScrollEnd(el) && !this.loading && this.hasMore) {
      this.loadPageInternal(this.pageIndex + 1, false);
    }
  }

  selectOption(optionValue: number | string | null): void {
    this.value = optionValue;
    this.onChange(optionValue);
    this.selectionChange.emit(optionValue);
    this.closePanel();
  }

  isSelected(optionValue: number | string | null): boolean {
    return this.value === optionValue;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }

  private get hasMore(): boolean {
    return this.loadedOptions.length < this.totalCount;
  }

  private findOptionLabel(value: number | string | null): string | null {
    if (this.isPaginated) {
      const match = this.loadedOptions.find(o => o.value === value);
      return match?.label ?? null;
    }
    const match = this.options.find(o => o.value === value);
    return match?.label ?? null;
  }

  private resetAndLoad(): void {
    this.loadedOptions = [];
    this.pageIndex = 1;
    this.totalCount = 0;
    this.loadPageInternal(1, true);
  }

  private loadPageInternal(pageIndex: number, replace: boolean): void {
    if (!this.loadPage) {
      return;
    }
    this.loading = true;
    this.loadPage(this.search.trim(), pageIndex).subscribe({
      next: res => {
        const batch = res.items ?? [];
        if (replace) {
          this.loadedOptions = batch;
        } else {
          const seen = new Set(this.loadedOptions.map(i => i.value));
          this.loadedOptions = [...this.loadedOptions, ...batch.filter(i => !seen.has(i.value))];
        }
        this.pageIndex = pageIndex;
        this.totalCount = res.totalCount ?? 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
