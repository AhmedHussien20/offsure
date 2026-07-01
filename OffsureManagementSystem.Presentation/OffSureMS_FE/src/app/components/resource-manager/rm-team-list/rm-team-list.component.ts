import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
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
import { RM_TEAM_COLUMNS } from '../../admin/admin.constants';
import { RmTeamCreateComponent } from './rm-team-create.component';
import { RmTeamMemberPanelComponent } from './rm-team-member-panel.component';

@Component({
  selector: 'app-rm-team-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, RmTeamMemberPanelComponent],
  templateUrl: './rm-team-list.component.html',
})
export class RmTeamListComponent implements OnInit, OnDestroy {
  columns = RM_TEAM_COLUMNS;
  data: Array<TeamMemberDto & { availabilityLabel?: string; accountStatusLabel?: string }> = [];
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
    filterTypes: { isAvailable: 'dropdown', isActive: 'dropdown' },
  });

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions = {
    isAvailable: AVAILABILITY_FILTER_OPTIONS,
    isActive: ACTIVE_FILTER_OPTIONS,
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private portal: ResourceManagerPortalService,
    private modalService: NgbModal,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
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
    const modalRef = this.modalService.open(RmTeamCreateComponent, {
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
    this.portal.getTeamMembers(buildPagedListQuery(this.searchCriteria) as any).subscribe({
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
  ): TeamMemberDto & { availabilityLabel?: string; accountStatusLabel?: string } {
    return {
      ...member,
      fullName: teamMemberDisplayName(member),
      availabilityLabel: member.isAvailable ? 'Available' : 'Unavailable',
      accountStatusLabel: member.isActive ? 'Active' : 'Inactive',
    };
  }

  private ensureExpandedMemberVisible(): void {
    if (!this.expandedRowId || this.data.some(item => item.id === this.expandedRowId)) {
      return;
    }

    this.portal.getTeamMemberById(this.expandedRowId).subscribe({
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
