import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
import { MyDatePipe } from 'app/components/utilities/pipline/MyDatePipe';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import {
  isKnownServiceRequestStatusName,
  projectStatusKey,
  serviceRequestStatusKey,
} from 'app/core/utils/enum-status.util';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export type ColumnType =
  | 'text'
  | 'icon-action'
  | 'icon'
  | 'badge'
  | 'custom'
  | 'money'
  | 'date'
  | 'dateTime'
  | 'assignees';

export interface BadgeConfig {
  text: string;
  class: string;
  icon?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: ColumnType;
  badgeMap?: Record<string, BadgeConfig>;
  icon?: string;
  displayField?: string;
  /**
   * Used by composite column types like `money` to read a second field.
   * Example: key="amount", secondaryKey="currency"
   */
  secondaryKey?: string;
}


interface HasId {
  id: any;
}

/** Shared open/closed state for every generic-table filters panel. */
const GLOBAL_FILTERS_PANEL_STORAGE_KEY = 'offsure.tableFiltersPanel.open';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  templateUrl: './generic-table.component.html',
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule, TranslateModule, MyDatePipe, NgbTooltipModule, NgSelectModule
  ],
  styleUrls: ['./generic-table.component.scss']
})
export class GenericTableComponent<T> implements OnInit, OnDestroy, OnChanges {
  @Output() exportPdfClick = new EventEmitter<void>();
  @Output() exportExcelClick = new EventEmitter<void>();
  @Input() showExportPdf: boolean = false;
  @Input() showExportExcel: boolean = true;
  /** When true, Excel export is delegated to the parent via `exportExcelClick`. */
  @Input() useCustomExcelExport: boolean = false;

  @Input() formUrl: string = '';
  @Input() breadcrumbs: string[] = [];
  @Input() activeitem: string = '';
  @Input() showDetailsButton: boolean = false;

  @Output() details = new EventEmitter<number>();

  // ---------- Action button customization (optional) ----------
  // If not provided, defaults remain the same (eye / pencil / trash).
  @Input() detailsIconClass: string = 'bi bi-eye';
  @Input() detailsLabel: string = 'Details';

  @Input() editIconClass: string = 'bi bi-pencil-square';
  @Input() editLabel: string = 'Edit';

  @Input() deleteIconClass: string = 'bi bi-trash';
  @Input() deleteLabel: string = 'Delete';

  // ---------- Inputs ----------
  @Input() title: string = '';
  @Input() columns: TableColumn[] = [];
  @Input() data: T[] = [];
  @Input() entries: number = 10;
  @Input() page: number = 1;
  @Input() totalItems: number = 0;
  @Input() totalPages: number = 0;

  @Input() showFilters: boolean = true;
  /** Global text search (searchKey) shown above column filters. */
  @Input() showSearch: boolean = true;
  @Input() showPagination: boolean = true;
  @Input() showCheckbox: boolean = false;
  @Input() showEditButton: boolean = false;
  @Input() showDeleteButton: boolean = false;
  @Input() showAnotherButton: boolean = false;

  @Input() showAddButton: boolean = false;
  @Input() addButtonLabel: string = '';
  @Input() anotherButtonLabel: string = '';
  @Input() disableActions: boolean = false;
  @Input() disableEditFn?: (row: T) => boolean;
 @Input() disableDeleteFn?: (row: T) => boolean;
 @Input() disableDetailsFn?: (row: T) => boolean;

  @Input() searchCriteria!: SearchCriteria<T>;
  @Input() labels: { [key: string]: string } = {};
  @Input() statusOptions: { id: number; name: string }[] = [];
  @Input() employeeOptions: { id: number; name: string }[] = [];
  /** Optional custom dropdown options per filter key (keeps component generic). */
  @Input() dropdownOptions: { [key: string]: { id: any; name: string }[] } = {};
  // callback من الـ parent (زى Expiry)
  @Input() onSearch?: (criteria: SearchCriteria<T>) => void;
  @Input() onAddClick?: () => void;
  @Output() addClick = new EventEmitter<void>();
  @Output() anotherClick = new EventEmitter<void>();
  @Input() checkboxKey?: string;

  // ---------- Outputs ----------
  @Output() pageChange = new EventEmitter<number>();
  @Output() entriesChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();
  @Output() rowClick = new EventEmitter<T>();
  @Input() rowClickable: boolean = false;
  @Input() showEmployeeFilter: boolean = true;

  // ---------- UI State ----------
  /** When true, shows overlay and dims table body (optional — parents can bind this). */
  @Input() loading: boolean = false;
  /** Smooth-scroll table into view when changing pages inside the same route. */
  @Input() smoothPageChange: boolean = true;
  /** When expanding a row, scroll it to the top of the viewport; restore scroll on collapse. */
  @Input() smoothExpandScroll: boolean = true;
  filtersOpen: boolean = false;

  @ViewChild('tableAnchor') tableAnchor?: ElementRef<HTMLElement>;

  sortColumn: string = '';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  // column resize state
  columnWidths: { [key: string]: string } = {};
  private resizingColumnKey: string | null = null;
  private resizeStartX: number = 0;
  private resizeStartWidth: number = 0;

  // ---------- Helpers ----------
  @Output() iconAction = new EventEmitter<{
    type: string;
    row: any;
  }>();

  @Output() checkboxChange = new EventEmitter<{
    row: any;
    checked: boolean;
  }>();

  private readonly destroy$ = new Subject<void>();
  private readonly filterChanged$ = new Subject<void>();

  constructor(
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.restoreFiltersPanelOpen();
    const restored = this.tryRestoreListPage();
    // After restore, persist the restored page (not the default page 1).
    queueMicrotask(() => this.persistListPage());
    if (restored) {
      // Beat parent ngOnInit races that reload page 1.
      setTimeout(() => this.reemitRestoredPage(restored), 0);
      setTimeout(() => this.reemitRestoredPage(restored), 100);
    }

    this.filterChanged$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  queueApplyFilters(): void {
    this.filterChanged$.next();
  }


  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /** Column filters from filterTypes (excludes global searchKey). */
  getColumnFilterKeys(): string[] {
    return this.objectKeys(this.searchCriteria?.filterTypes).filter(
      key => key !== 'searchKey' && !(key === 'employeeIds' && !this.showEmployeeFilter)
    );
  }

  get searchOnlyFilters(): boolean {
    return this.showSearch && this.getColumnFilterKeys().length === 0;
  }

  getLabel(key: string): string {
    if (key === 'searchKey') {
      return this.labels?.['searchKey'] ?? 'TABLE.SEARCH';
    }
    return this.labels?.[key] ?? key;
  }

  private badgeLookupKey(col: TableColumn, item: any): string {
    const value = this.getValue(item, col.key);
    if (col.key !== 'status' || value === null || value === undefined) {
      return String(value ?? '');
    }

    // Resolve service-request statuses before project keys — unknown request names
    // (e.g. PrimaryAccepted) would otherwise fall through to project "Pending".
    if (isKnownServiceRequestStatusName(value)) {
      const requestKey = serviceRequestStatusKey(value);
      if (col.badgeMap?.[requestKey]) {
        return requestKey;
      }
    }

    const projectKey = projectStatusKey(value);
    if (col.badgeMap?.[projectKey]) {
      return projectKey;
    }

    const requestKey = serviceRequestStatusKey(value);
    if (col.badgeMap?.[requestKey]) {
      return requestKey;
    }

    return projectKey;
  }

  getBadgeText(col: TableColumn, item: any): string {
    if (!col.badgeMap) return '';
    const key = this.badgeLookupKey(col, item);
    return col.badgeMap[key]?.text ?? '';
  }

  getBadgeClass(col: TableColumn, item: any): string {
    if (!col.badgeMap) return '';
    const key = this.badgeLookupKey(col, item);
    return col.badgeMap[key]?.class ?? '';
  }

  getInitials(name: string): string {
    if (!name) return '';

    return name
      .split(' ')
      .map(x => x[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getInputType(key: string): 'text' | 'dropdown' | 'date' | 'dateTime' | 'number' {
    const filterTypes = (this.searchCriteria?.filterTypes || {}) as any;
    return filterTypes[key] || 'text';
  }

  getDropdownOptions(key: string) {
    const custom = this.dropdownOptions?.[key];
    if (custom && Array.isArray(custom)) return custom;
    switch (key) {
      case 'statusId':
        return this.statusOptions;

      case 'employeeIds':
        return this.employeeOptions;

      default:
        return [];
    }
  }

  // ---------- Filters ----------

  applyFilters() {
    if (this.onSearch) {
      this.onSearch({ ...(this.searchCriteria || {}) });
    }
  }

  viewDetails(id: number) {
    this.details.emit(id);
  }

  isMultiSelect(key: string): boolean {
    if (key === 'employeeIds') return true;   // multi
    if (key === 'statusId') return false;     // single
    return false;
  }




  getItemId(item: T): any {
    return (item as any)['id'];
  }
  getValue(item: T, key: string): any {
    return (item as any)[key];
  }
  isItemSelected(item: T): boolean {
    return (item as any).selected || false;
  }

  setItemSelected(item: T, value: boolean): void {
    (item as any).selected = value;
  }
  clearFilters() {
    if (!this.searchCriteria) {
      return;
    }

    if (this.showSearch) {
      this.searchCriteria.searchKey = '';
    }

    const filterTypes = (this.searchCriteria.filterTypes || {}) as Record<string, string>;

    Object.keys(filterTypes).forEach(key => {
      if (key === 'searchKey') {
        return;
      }

      const type = filterTypes[key];

      if (type === 'text' || type === 'number') {
        (this.searchCriteria as any)[key] = '';
      } else if (type === 'dropdown' || type === 'radio') {
        (this.searchCriteria as any)[key] = this.isMultiSelect(key) ? [] : null;
      } else if (type === 'date') {
        (this.searchCriteria as any)[key] = null;
      }
    });

    this.applyFilters();
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
    this.saveFiltersPanelOpen();
  }

  // ---------- Sorting ----------

  sort(key: string) {
    if (this.sortColumn === key) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = key;
      this.sortDirection = 'ASC';
    }

    (this.searchCriteria as any).sortColumn = this.sortColumn;
    (this.searchCriteria as any).sortDirection = this.sortDirection;

    this.applyFilters();
  }

  // ---------- Select All ----------

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    this.data = this.data.map((item: any) => ({
      ...item,
      selected: checked
    }));
  }

  updateSelectedItems() {
    // لو حبيت تبعت selectedItems للـ parent بعدين
  }

  // ---------- Pagination ----------

  onPageChangeInternal(page: number) {
    this.page = page;
    this.persistListPage();
    this.pageChange.emit(page);
    this.scrollTableIntoView();
  }

  onEntriesChangeInternal() {
    this.page = 1;
    this.persistListPage();
    this.entriesChange.emit(this.entries);
    this.scrollTableIntoView();
  }

  private persistListPage(): void {
    this.viewState.patch(this.router.url, {
      page: this.page,
      pageSize: this.entries,
    });
  }

  /**
   * On browser back, re-emit the saved page so the parent reloads that page.
   * Applies synchronously — deferred restore lost to parent page-1 loads.
   */
  private tryRestoreListPage(): { page: number; pageSize?: number } | null {
    if (!this.showPagination) {
      return null;
    }
    const restored = this.viewState.consumeListRestore(this.router.url);
    if (!restored || restored.page < 1) {
      return null;
    }
    this.applyRestoredPage(restored);
    return restored;
  }

  private reemitRestoredPage(restored: { page: number; pageSize?: number }): void {
    if (this.page !== restored.page || (restored.pageSize != null && this.entries !== restored.pageSize)) {
      this.applyRestoredPage(restored);
    } else if (this.page === restored.page) {
      // Parent may still be showing page-1 data from an earlier fetch.
      this.pageChange.emit(restored.page);
    }
  }

  private applyRestoredPage(restored: { page: number; pageSize?: number }): void {
    if (restored.pageSize != null && restored.pageSize > 0 && restored.pageSize !== this.entries) {
      this.entries = restored.pageSize;
      this.entriesChange.emit(this.entries);
    }
    this.page = restored.page;
    this.pageChange.emit(restored.page);
    this.persistListPage();
  }

  trackByRow(index: number, item: T): unknown {
    const id = (item as HasId)?.id;
    return id ?? index;
  }

  getColSpan(): number {
    let span = this.columns.length;
    if (this.showCheckbox) span += 1;
    if (this.showEditButton || this.showDeleteButton || this.showDetailsButton) span += 1;
    return span;
  }

  private scrollTableIntoView(): void {
    if (!this.smoothPageChange || !this.tableAnchor?.nativeElement) return;
    requestAnimationFrame(() => {
      this.tableAnchor?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }

  // ---------- Actions ----------

  editItem(id: number) {
    this.edit.emit(id);
  }

  deleteItem(id: number) {
    this.delete.emit(id);
  }

  // ---------- Export ----------

  exportExcel() {
    if (this.useCustomExcelExport) {
      this.exportExcelClick.emit();
      return;
    }

    const table = this.tableAnchor?.nativeElement
      ?.closest('.generic-table-container')
      ?.querySelector('table');
    if (!table) return;

    const html = (table as HTMLElement).outerHTML.replace(/ /g, '%20');
    const fileName = `export_${new Date().toISOString().slice(0, 10)}.xls`;
    const dataType = 'application/vnd.ms-excel';

    const link = document.createElement('a');
    link.href = 'data:' + dataType + ', ' + html;
    link.download = fileName;
    link.click();
  }

  // ---------- Column Resize ----------

  startResize(event: MouseEvent, key: string) {
    event.preventDefault();
    const th = (event.target as HTMLElement).closest('th') as HTMLElement;
    if (!th) return;

    this.resizingColumnKey = key;
    this.resizeStartX = event.pageX;
    this.resizeStartWidth = th.offsetWidth;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.resizingColumnKey) return;
    const diff = event.pageX - this.resizeStartX;
    const newWidth = Math.max(this.resizeStartWidth + diff, 80);
    this.columnWidths[this.resizingColumnKey] = `${newWidth}px`;
  };

  onMouseUp = () => {
    this.resizingColumnKey = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  getColumnStyle(key: string) {
    return this.columnWidths[key] ? { width: this.columnWidths[key] } : {};
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

@Input() rowClickableCondition?: (item: T) => boolean;

onRowClick(item: T, event: MouseEvent) {

  if (!this.rowClickable) return;

  const target = event.target as HTMLElement;
  if (
    target.closest('button') ||
    target.closest('input') ||
    target.closest('a')
  ) {
    return;
  }

  if (this.rowClickableCondition && !this.rowClickableCondition(item)) {
    return;
  }

  // Let parent react to full row object (e.g., expand details panel)
  this.rowClick.emit(item);
}



  onCheckboxChange(item: T, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    this.checkboxChange.emit({
      row: item,
      checked
    });
  }

  isChecked(item: T): boolean {
    if (!this.checkboxKey) return false;

    const value = (item as any)[this.checkboxKey];
    return value === true;
  }
 exportPdf() {
    this.exportPdfClick.emit();
  }

  // أضف هذه المتغيرات داخل الـ Component class

@Input() expandable: boolean = false;
@Input() expandTemplate: any;
@Input() rowKey: string = 'id';
/** When set (e.g. from route query params), expands the matching row once it appears in `data`. */
@Input() expandedRowId: unknown = null;
@Output() expandedRowChange = new EventEmitter<any>();

expandedRow: any = null;
private expandedRowKey: unknown = null;
private savedScrollY: number | null = null;
private expandScrollFromUserClick = false;

ngOnChanges(changes: SimpleChanges): void {
  if (changes['expandedRowId'] && this.expandable) {
    const id = this.expandedRowId;
    if (id != null && id !== '') {
      this.expandedRowKey = id;
      this.syncExpandedRowFromData();
    }
  }

  if (changes['data'] && this.expandable && this.expandedRowKey != null) {
    this.syncExpandedRowFromData();
  }
}

private getRowKey(item: T): unknown {
  return item == null ? null : (item as Record<string, unknown>)[this.rowKey];
}

getExpandRowKey(item: T): unknown {
  return this.getRowKey(item);
}

private rowKeysMatch(a: unknown, b: unknown): boolean {
  return a != null && b != null && String(a) === String(b);
}

private syncExpandedRowFromData(): void {
  const match = this.data?.find(item => this.rowKeysMatch(this.getRowKey(item), this.expandedRowKey));
  if (match) {
    this.expandedRow = match;
    this.expandedRowChange.emit(this.expandedRow);
    this.scheduleScrollExpandedRowToTop();
  } else {
    this.expandedRow = null;
    this.expandedRowChange.emit(null);
  }
}

private scheduleScrollExpandedRowToTop(): void {
  if (!this.smoothExpandScroll) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => this.scrollExpandedRowToTop(), 40);
    });
  });
}

private scrollExpandedRowToTop(): void {
  const row = this.findExpandedDataRow();
  if (!row) {
    return;
  }

  const offset = this.getExpandScrollTopOffset();
  const top = row.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

private getExpandScrollTopOffset(): number {
  const container = this.tableAnchor?.nativeElement?.closest('.generic-table-container');
  const headerHeight =
    document.querySelector('.app-header')?.getBoundingClientRect().height ?? 0;
  const theadHeight = container?.querySelector('thead')?.getBoundingClientRect().height ?? 0;
  return headerHeight + theadHeight + 12;
}

private restoreScrollAfterCollapse(): void {
  if (!this.smoothExpandScroll || !this.expandScrollFromUserClick || this.savedScrollY == null) {
    this.savedScrollY = null;
    this.expandScrollFromUserClick = false;
    return;
  }

  const y = this.savedScrollY;
  this.savedScrollY = null;
  this.expandScrollFromUserClick = false;

  requestAnimationFrame(() => {
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
}

private findExpandedDataRow(): HTMLElement | null {
  return (
    this.tableAnchor?.nativeElement
      ?.closest('.generic-table-container')
      ?.querySelector('tr.expanded-row') ?? null
  );
}

toggleExpandRow(item: T, event: MouseEvent) {
  if (!this.expandable) return;

  const target = event.target as HTMLElement;
  if (
    target.closest('button') ||
    target.closest('input') ||
    target.closest('select') ||
    target.closest('textarea') ||
    target.closest('a') ||
    target.closest('.no-expand')
  ) {
    return;
  }

  const key = this.getRowKey(item);
  if (this.rowKeysMatch(this.expandedRowKey, key)) {
    this.expandedRow = null;
    this.expandedRowKey = null;
    this.expandedRowChange.emit(this.expandedRow);
    this.restoreScrollAfterCollapse();
  } else {
    const wasCollapsed = this.expandedRowKey == null;
    if (wasCollapsed) {
      this.savedScrollY = window.scrollY;
      this.expandScrollFromUserClick = true;
    }

    this.expandedRow = item;
    this.expandedRowKey = key;
    this.expandedRowChange.emit(this.expandedRow);
    this.scheduleScrollExpandedRowToTop();
  }
}

isRowExpanded(item: T): boolean {
  return this.expandable && this.rowKeysMatch(this.getRowKey(item), this.expandedRowKey);
}

  private restoreFiltersPanelOpen(): void {
    if (!this.showFilters) {
      return;
    }

    try {
      const stored = localStorage.getItem(GLOBAL_FILTERS_PANEL_STORAGE_KEY);
      if (stored === '1') {
        this.filtersOpen = true;
      } else if (stored === '0') {
        this.filtersOpen = false;
      }
    } catch {
      // Ignore private mode / storage errors.
    }
  }

  private saveFiltersPanelOpen(): void {
    if (!this.showFilters) {
      return;
    }

    try {
      localStorage.setItem(GLOBAL_FILTERS_PANEL_STORAGE_KEY, this.filtersOpen ? '1' : '0');
    } catch {
      // Ignore private mode / storage errors.
    }
  }
}
