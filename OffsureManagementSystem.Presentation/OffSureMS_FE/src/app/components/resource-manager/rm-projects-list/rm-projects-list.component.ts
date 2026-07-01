import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_PROJECT_COLUMNS } from '../../admin/admin.constants';

@Component({
  selector: 'app-rm-projects-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './rm-projects-list.component.html',
})
export class RmProjectsListComponent implements OnInit {
  columns = ADMIN_PROJECT_COLUMNS.filter(c => c.key !== 'budget');
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

  constructor(
    private portal: ResourceManagerPortalService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
    this.router.navigate(['/resource-manager/projects', row.id]);
  }

  private loadProjects(): void {
    this.portal.getProjects(buildPagedListQuery(this.searchCriteria) as any).subscribe({
      next: res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(p => ({
          ...p,
          progressLabel: p.progress != null ? `${p.progress}%` : '—',
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      },
    });
  }
}
