import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import {
  AVAILABILITY_FILTER_OPTIONS,
  ACTIVE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
} from 'app/core/constants/list-filter.constants';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_TEAM_COLUMNS } from '../admin.constants';
import { AdminTeamCreateComponent } from './admin-team-create.component';
import { AdminTeamMemberPanelComponent } from './admin-team-member-panel.component';

@Component({
  selector: 'app-admin-team-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, AdminTeamMemberPanelComponent],
  templateUrl: './admin-team-list.component.html',
})
export class AdminTeamListComponent implements OnInit, OnDestroy {
  columns = ADMIN_TEAM_COLUMNS;
  data: Array<TeamMemberDto & { availabilityLabel?: string; resourceManagerName?: string; accountStatusLabel?: string }> = [];
  expandedRowId: number | null = null;
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'ASC',
    filterTypes: { isAvailable: 'dropdown', resourceManagerId: 'dropdown', isActive: 'dropdown' },
  });

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions: Record<string, { id: number | boolean; name: string }[]> = {
    isAvailable: AVAILABILITY_FILTER_OPTIONS,
    isActive: ACTIVE_FILTER_OPTIONS,
    resourceManagerId: [],
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private teamMembersService: TeamMembersService,
    private modalService: NgbModal,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
        this.loadResourceManagers();
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));
      this.expandedRowId = Number.isFinite(id) && id > 0 ? id : null;
      this.loadTeam();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadTeam();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadTeam();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadTeam();
  }

  onMemberSaved(): void {
    this.loadTeam();
  }

  onMemberDeleted(): void {
    this.loadTeam();
  }

  onAdd(): void {
    const modalRef = this.modalService.open(AdminTeamCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadTeam();
      }
    });
  }

  private loadTeam(): void {
    this.teamMembersService
      .getAll(buildPagedListQuery(this.searchCriteria) as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = (paged?.data ?? []).map(m => this.mapTeamRow(m));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
          this.ensureExpandedMemberVisible();
        },
      });
  }

  private mapTeamRow(
    member: TeamMemberDto
  ): TeamMemberDto & { availabilityLabel?: string; resourceManagerName?: string; accountStatusLabel?: string } {
    return {
      ...member,
      fullName: teamMemberDisplayName(member),
      resourceManagerName: member.resourceManagerName?.trim() || '—',
      availabilityLabel: member.isAvailable ? 'Available' : 'Unavailable',
      accountStatusLabel: member.isActive ? 'Active' : 'Inactive',
    };
  }

  private loadResourceManagers(): void {
    this.teamMembersService.getResourceManagers({ pageIndex: 1, pageSize: 200 }).subscribe({
      next: res => {
        const managers = res.data?.data ?? [];
        this.dropdownOptions = {
          ...this.dropdownOptions,
          resourceManagerId: managers.map(rm => ({
            id: rm.id,
            name: rm.fullName || `${rm.firstName} ${rm.lastName}`.trim(),
          })),
        };
      },
    });
  }

  private ensureExpandedMemberVisible(): void {
    if (!this.expandedRowId || this.data.some(item => item.id === this.expandedRowId)) {
      return;
    }

    this.teamMembersService.getById(this.expandedRowId).subscribe({
      next: res => {
        const member = res.data;
        if (!member) {
          return;
        }
        const row = this.mapTeamRow(member);
        this.data = [row, ...this.data.filter(item => item.id !== row.id)];
      },
    });
  }
}
