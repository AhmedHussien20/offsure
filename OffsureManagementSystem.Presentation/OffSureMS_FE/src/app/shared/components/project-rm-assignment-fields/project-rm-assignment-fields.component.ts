import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ResourceManagerUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

const RM_PAGE_SIZE = 10;
const RM_SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-project-rm-assignment-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-rm-assignment-fields.component.html',
  styleUrl: './project-rm-assignment-fields.component.scss',
})
export class ProjectRmAssignmentFieldsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;

  readonly maxManagers = 2;

  resourceManagersList: ResourceManagerUserDto[] = [];
  selectedResourceManagerIds = new Set<number>();
  resourceManagersCatalogById = new Map<number, ResourceManagerUserDto>();
  resourceManagersLoading = false;
  resourceManagersPageIndex = 1;
  resourceManagersHasMore = true;
  resourceManagersTotalCount = 0;
  resourceManagerSearchQuery = '';

  private readonly destroy$ = new Subject<void>();
  private readonly resourceManagerSearch$ = new Subject<string>();

  constructor(
    private teamMembersService: TeamMembersService,
    private toastr: ToastrService
  ) {}

  get selectedResourceManagersForDisplay(): ResourceManagerUserDto[] {
    return [...this.selectedResourceManagerIds]
      .map(id => this.resourceManagersCatalogById.get(id))
      .filter((rm): rm is ResourceManagerUserDto => !!rm);
  }

  get canAddResourceManager(): boolean {
    return this.selectedResourceManagerIds.size < this.maxManagers;
  }

  ngOnInit(): void {
    const initialIds: number[] = this.form.get('resourceManagerIds')?.value ?? [];
    this.selectedResourceManagerIds = new Set(
      initialIds.filter((id: number) => id != null && id > 0)
    );

    this.resourceManagerSearch$
      .pipe(debounceTime(RM_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => this.loadResourceManagersPage(false));

    this.loadResourceManagersPage(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  memberInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  isResourceManagerSelected(userId: number): boolean {
    return this.selectedResourceManagerIds.has(userId);
  }

  isResourceManagerDisabled(userId: number): boolean {
    return !this.isResourceManagerSelected(userId) && !this.canAddResourceManager;
  }

  onResourceManagerSearchInput(value: string): void {
    this.resourceManagerSearchQuery = value;
    this.resourceManagerSearch$.next(value);
  }

  onResourceManagerPickerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.resourceManagersLoading || !this.resourceManagersHasMore) {
      return;
    }
    this.loadResourceManagersPage(true);
  }

  toggleResourceManager(manager: ResourceManagerUserDto): void {
    this.resourceManagersCatalogById.set(manager.id, manager);

    if (this.selectedResourceManagerIds.has(manager.id)) {
      this.selectedResourceManagerIds.delete(manager.id);
    } else {
      if (!this.canAddResourceManager) {
        this.toastr.warning(`A project can have at most ${this.maxManagers} resource managers.`);
        return;
      }
      this.selectedResourceManagerIds.add(manager.id);
    }

    this.syncFormIds();
  }

  private syncFormIds(): void {
    this.form.patchValue(
      { resourceManagerIds: [...this.selectedResourceManagerIds] },
      { emitEvent: false }
    );
  }

  private loadResourceManagersPage(append: boolean): void {
    if (this.resourceManagersLoading) return;
    if (append && !this.resourceManagersHasMore) return;

    const pageIndex = append ? this.resourceManagersPageIndex + 1 : 1;
    this.resourceManagersLoading = true;

    this.teamMembersService
      .getResourceManagers({
        pageIndex,
        pageSize: RM_PAGE_SIZE,
        isActive: true,
        searchKey: this.resourceManagerSearchQuery.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = paged?.data ?? [];
          batch.forEach(rm => this.resourceManagersCatalogById.set(rm.id, rm));

          if (append) {
            const existing = new Set(this.resourceManagersList.map(rm => rm.id));
            this.resourceManagersList = [
              ...this.resourceManagersList,
              ...batch.filter(rm => !existing.has(rm.id)),
            ];
          } else {
            this.resourceManagersList = batch;
          }

          this.resourceManagersPageIndex = pageIndex;
          this.resourceManagersTotalCount = paged?.totalCount ?? 0;
          this.resourceManagersHasMore =
            this.resourceManagersList.length < this.resourceManagersTotalCount;
          this.resourceManagersLoading = false;
        },
        error: () => {
          this.resourceManagersLoading = false;
        },
      });
  }
}
