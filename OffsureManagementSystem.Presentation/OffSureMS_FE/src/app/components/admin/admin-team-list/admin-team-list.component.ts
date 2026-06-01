import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TeamMemberDto } from 'app/core/models/team-members/team-member.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_TEAM_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-team-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './admin-team-list.component.html',
})
export class AdminTeamListComponent implements OnInit {
  columns = ADMIN_TEAM_COLUMNS;
  data: Array<TeamMemberDto & { availabilityLabel?: string }> = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'ASC',
    filterTypes: {},
  });

  constructor(
    private teamMembersService: TeamMembersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTeam();
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

  onAdd(): void {
    this.router.navigate(['/admin/team/new']);
  }

  private loadTeam(): void {
    this.teamMembersService
      .getAll({
        pageIndex: this.searchCriteria.pageIndex,
        pageSize: this.searchCriteria.pageSize,
        searchKey: this.searchCriteria.searchKey,
      } as any)
      .subscribe({
        next: res => {
          const paged = res.data;
          this.data = (paged?.data ?? []).map(m => ({
            ...m,
            availabilityLabel: m.isAvailable ? 'Available' : 'Unavailable',
          }));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
        },
      });
  }
}
