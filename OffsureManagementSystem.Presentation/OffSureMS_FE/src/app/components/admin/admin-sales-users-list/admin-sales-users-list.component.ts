import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SalesUserDto } from 'app/core/models/team-members/team-member.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import {
  ACTIVE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
} from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_SALES_USER_COLUMNS } from '../admin.constants';
import { AdminSalesUserCreateComponent } from './admin-sales-user-create.component';
import { AdminSalesUserPanelComponent } from './admin-sales-user-panel.component';

@Component({
  selector: 'app-admin-sales-users-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, AdminSalesUserPanelComponent],
  templateUrl: './admin-sales-users-list.component.html',
})
export class AdminSalesUsersListComponent implements OnInit {
  columns = ADMIN_SALES_USER_COLUMNS;
  data: Array<SalesUserDto & { accountStatusLabel?: string }> = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'Id',
    sortDirection: 'ASC',
    filterTypes: { isActive: 'dropdown' },
  });

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions = { isActive: ACTIVE_FILTER_OPTIONS };

  constructor(
    private teamMembersService: TeamMembersService,
    private modalService: NgbModal,
    private toastr: ToastrService
  ) {}

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

  onAdd(): void {
    const modalRef = this.modalService.open(AdminSalesUserCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.load();
      }
    });
  }

  onSalesUserSaved(): void {
    this.load();
  }

  onSalesUserDeleted(): void {
    this.load();
  }

  private load(): void {
    this.teamMembersService.getSalesUsers(buildPagedListQuery(this.searchCriteria) as any).subscribe({
      next: res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(user => ({
          ...user,
          fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
          accountStatusLabel: user.isActive ? 'Active' : 'Inactive',
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to load sales users.'),
    });
  }
}
