import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SalesProjectSummaryDto } from 'app/core/models/projects/project.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { SalesService } from 'app/core/services/sales.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import {
  LIST_FILTER_LABELS,
  PROJECT_STATUS_FILTER_OPTIONS,
} from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { normalizeProjectStatus } from 'app/core/utils/enum-status.util';

const SALES_PROJECT_COLUMNS = [
  { key: 'name', label: 'Project', type: 'text' as const },
  { key: 'clientName', label: 'Client', type: 'text' as const },
  { key: 'statusLabel', label: 'Status', type: 'text' as const },
  { key: 'teamMembersLabel', label: 'Team', type: 'text' as const },
  { key: 'commissionLabel', label: 'My commission', type: 'text' as const },
];

@Component({
  selector: 'app-sales-projects-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './sales-projects-list.component.html',
})
export class SalesProjectsListComponent implements OnInit {
  columns = SALES_PROJECT_COLUMNS;
  data: Array<
    SalesProjectSummaryDto & {
      statusLabel?: string;
      teamMembersLabel?: string;
      commissionLabel?: string;
    }
  > = [];
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

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions = { status: PROJECT_STATUS_FILTER_OPTIONS };

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    this.load();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.load();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.load();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.load();
  }

  private load(): void {
    this.salesService.getMyProjects(buildPagedListQuery(this.searchCriteria) as any).subscribe({
      next: res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(project => ({
          ...project,
          statusLabel: String(normalizeProjectStatus(project.status) ?? project.status),
          teamMembersLabel: project.teamMemberNames?.length
            ? project.teamMemberNames.join(', ')
            : '—',
          commissionLabel: this.formatCommission(project),
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      },
    });
  }

  private formatCommission(project: SalesProjectSummaryDto): string {
    if (project.calculatedCommissionAmount != null) {
      return `$${project.calculatedCommissionAmount.toFixed(2)}`;
    }
    if (project.commissionType === 'Fixed' && project.commissionValue != null) {
      return `$${project.commissionValue.toFixed(2)}`;
    }
    if (project.commissionType === 'Percentage' && project.commissionValue != null) {
      return `${project.commissionValue}%`;
    }
    return '—';
  }
}
