import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResourceManagerUserDto } from 'app/core/models/team-members/team-member.models';
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
import { ADMIN_RESOURCE_MANAGER_COLUMNS } from '../admin.constants';
import { AdminResourceManagerCreateComponent } from './admin-resource-manager-create.component';
import { AdminResourceManagerPanelComponent } from './admin-resource-manager-panel.component';

@Component({
  selector: 'app-admin-resource-managers-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent, AdminResourceManagerPanelComponent],
  templateUrl: './admin-resource-managers-list.component.html',
})
export class AdminResourceManagersListComponent implements OnInit {
  columns = ADMIN_RESOURCE_MANAGER_COLUMNS;
  data: Array<ResourceManagerUserDto & { accountStatusLabel?: string }> = [];
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

  onManagerSaved(): void {
    this.load();
  }

  onManagerDeleted(): void {
    this.load();
  }

  onAdd(): void {
    const modalRef = this.modalService.open(AdminResourceManagerCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.load();
      }
    });
  }

  private load(): void {
    this.teamMembersService.getResourceManagers(buildPagedListQuery(this.searchCriteria) as any).subscribe({
      next: res => {
        const paged = res.data;
        this.data = (paged?.data ?? []).map(manager => ({
          ...manager,
          fullName: manager.fullName || `${manager.firstName} ${manager.lastName}`.trim(),
          accountStatusLabel: manager.isActive ? 'Active' : 'Inactive',
        }));
        this.totalItems = paged?.totalCount ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to load resource managers.'),
    });
  }
}
