import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamContextService } from 'app/core/services/team-context.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { TEAM_PROJECT_COLUMNS } from '../team.constants';

@Component({
  selector: 'app-team-projects-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './team-projects-list.component.html',
})
export class TeamProjectsListComponent implements OnInit {
  columns = TEAM_PROJECT_COLUMNS;
  data: Array<ProjectDto & { progressLabel?: string; myRole?: string }> = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;
  teamMemberId: number | null = null;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { status: 'dropdown' },
  });

  labels: Record<string, string> = { status: 'Status', searchKey: 'Search' };
  dropdownOptions = {
    status: [
      { id: 'Pending', name: 'Pending' },
      { id: 'InProgress', name: 'In Progress' },
      { id: 'Completed', name: 'Completed' },
      { id: 'OnHold', name: 'On Hold' },
      { id: 'Cancelled', name: 'Cancelled' },
    ],
  };

  constructor(private projectsService: ProjectsService,
    private teamContext: TeamContextService,
    private router: Router,
    private viewState: RouteViewStateService) {}

  ngOnInit(): void {
    this.viewState.seedListPaging(this.router.url, this);
    this.teamContext.loadProfile().subscribe(profile => {
      this.teamMemberId = profile?.id ?? null;
      if (this.teamMemberId) {
        this.loadProjects();
      }
    });
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadProjects();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadProjects();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadProjects();
  }

  onRowClick(row: ProjectDto): void {
    this.router.navigate(['/team/projects', row.id]);
  }

  private loadProjects(): void {
    if (!this.teamMemberId) return;

    this.projectsService
      .getTeamMy(buildPagedListQuery(this.searchCriteria) as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = (paged?.data ?? []).map(p => ({
            ...p,
            myRole: p.myRole?.trim() || '—',
            progressLabel: p.progress != null ? `${p.progress}%` : '—',
          }));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
        },
      });
  }
}
