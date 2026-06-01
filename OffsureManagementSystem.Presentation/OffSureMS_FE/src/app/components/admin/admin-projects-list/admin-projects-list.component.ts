import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { ProjectsService } from 'app/core/services/projects.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_PROJECT_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-projects-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './admin-projects-list.component.html',
})
export class AdminProjectsListComponent implements OnInit {
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
    private projectsService: ProjectsService,
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
    this.router.navigate(['/admin/projects', row.id]);
  }

  private loadProjects(): void {
    this.projectsService
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        sortColumn: this.searchCriteria.sortColumn,
        sortDirection: this.searchCriteria.sortDirection,
        status: this.searchCriteria['status'],
        searchKey: this.searchCriteria.searchKey,
      } as any)
      .subscribe({
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
