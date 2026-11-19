import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import {
  PROJECT_BUDGET_TYPE_FILTER_OPTIONS,
  PROJECT_STATUS_FILTER_OPTIONS,
} from 'app/core/constants/list-filter.constants';
import { ADMIN_PROJECT_COLUMNS } from 'app/components/admin/admin.constants';

@Component({
  selector: 'app-viewer-projects-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './viewer-projects-list.component.html',
})
export class ViewerProjectsListComponent implements OnInit {
  columns = ADMIN_PROJECT_COLUMNS;
  data: Array<ProjectDto & { progressLabel?: string }> = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'DESC',
    filterTypes: { status: 'dropdown', budgetType: 'dropdown' },
  });

  labels: Record<string, string> = {
    status: 'Status',
    budgetType: 'Budget type',
    searchKey: 'Search',
  };
  dropdownOptions = {
    status: PROJECT_STATUS_FILTER_OPTIONS,
    budgetType: PROJECT_BUDGET_TYPE_FILTER_OPTIONS,
  };

  constructor(
    private projectsService: ProjectsService,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.viewState.seedListPaging(this.router.url, this);
    this.loadProjects();
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
    this.router.navigate(['/viewer/projects', row.id]);
  }

  private loadProjects(): void {
    this.projectsService
      .getAll(buildPagedListQuery(this.searchCriteria) as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = (paged?.data ?? []).map(p => ({
            ...p,
            budgetType:
              p.budgetType === 'Hourly' || (p.budgetType as unknown) === 1 ? 'Hourly' : 'Total',
            progressLabel: p.progress != null ? `${p.progress}%` : '—',
          }));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
        },
      });
  }
}
