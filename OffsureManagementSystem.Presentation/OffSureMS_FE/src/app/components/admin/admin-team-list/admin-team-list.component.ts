import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_TEAM_COLUMNS } from '../admin.constants';
import { AdminTeamCreateComponent } from './admin-team-create.component';

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
    private modalService: NgbModal
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
            fullName: teamMemberDisplayName(m),
            availabilityLabel: m.isAvailable ? 'Available' : 'Unavailable',
          }));
          this.totalItems = paged?.totalCount ?? 0;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
        },
      });
  }
}
