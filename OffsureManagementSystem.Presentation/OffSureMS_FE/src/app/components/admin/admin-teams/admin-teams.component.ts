import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ACTIVE_FILTER_OPTIONS, LIST_FILTER_LABELS } from 'app/core/constants/list-filter.constants';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { TeamDto, TeamRequest } from 'app/core/models/teams/team.models';
import { TeamsService } from 'app/core/services/teams.service';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_OFFSHORE_TEAM_COLUMNS } from '../admin.constants';
import { AdminTeamCreateComponent } from './admin-team-create.component';
import { AdminTeamDetailPanelComponent } from './admin-team-detail-panel.component';

/** Offshore team catalogs shown on the Offshore TechX "Offshore team" tab. */
@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, AdminTeamDetailPanelComponent],
  template: `
    <app-page-header></app-page-header>

    <div class="card custom-card">
      <app-generic-table
        [columns]="columns"
        [data]="teams"
        [page]="page"
        [entries]="entries"
        [totalItems]="total"
        [totalPages]="totalPages"
        [searchCriteria]="search"
        [labels]="labels"
        [dropdownOptions]="dropdownOptions"
        [showFilters]="true"
        [showPagination]="true"
        [showEmployeeFilter]="false"
        [showExportExcel]="false"
        [showAddButton]="true"
        [addButtonLabel]="'Add Team'"
        [expandable]="true"
        [expandTemplate]="teamDetail"
        [onSearch]="onSearch"
        (pageChange)="onPageChange($event)"
        (entriesChange)="onEntriesChange($event)"
        (addClick)="openCreateForm()">
      </app-generic-table>
    </div>

    <ng-template #teamDetail let-item>
      <app-admin-team-detail-panel [teamId]="item.id" (changed)="loadTeams()" />
    </ng-template>
  `,
})
export class AdminTeamsComponent implements OnInit {
  readonly columns = ADMIN_OFFSHORE_TEAM_COLUMNS;
  readonly labels = { ...LIST_FILTER_LABELS };
  readonly dropdownOptions = { isActive: ACTIVE_FILTER_OPTIONS };

  teams: Array<TeamDto & { activeLabel?: string }> = [];
  page = 1;
  entries = 10;
  total = 0;
  totalPages = 1;
  search = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: { isActive: 'dropdown' },
  });

  constructor(
    private teamsService: TeamsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  onSearch = (): void => {
    this.page = 1;
    this.search.pageIndex = 1;
    this.loadTeams();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.search.pageIndex = page;
    this.loadTeams();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.search.pageSize = size;
    this.page = 1;
    this.search.pageIndex = 1;
    this.loadTeams();
  }

  openCreateForm(): void {
    const modalRef = this.modalService.open(AdminTeamCreateComponent, { centered: true, size: 'xl', scrollable: true });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) this.loadTeams();
    });
  }

  loadTeams(): void {
    this.teamsService
      .getAll(buildPagedListQuery(this.search) as TeamRequest)
      .subscribe(res => {
        const paged = res.data;
        this.teams = (paged?.data ?? []).map(t => ({
          ...t,
          activeLabel: t.isActive ? 'Yes' : 'No',
        }));
        this.total = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.total / this.entries));
      });
  }
}
