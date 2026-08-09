import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto } from 'app/core/models/clients/client.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import {
  ACTIVE_FILTER_OPTIONS,
  CLIENT_ACCOUNT_ROLE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
} from 'app/core/constants/list-filter.constants';
import { ClientsService } from 'app/core/services/clients.service';
import { RouteViewStateService } from 'app/core/services/route-view-state.service';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ADMIN_CLIENT_MEMBER_COLUMNS } from '../admin.constants';
import { AdminClientMemberCreateComponent } from './admin-client-member-create.component';

@Component({
  selector: 'app-admin-client-members-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  templateUrl: './admin-client-members-list.component.html',
})
export class AdminClientMembersListComponent implements OnInit {
  columns = ADMIN_CLIENT_MEMBER_COLUMNS;
  data: Array<ClientDto & Record<string, unknown>> = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  entries = 10;

  searchCriteria = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    sortColumn: 'CompanyName',
    sortDirection: 'ASC',
    filterTypes: {
      organizationClientId: 'dropdown',
      accountRole: 'dropdown',
      isActive: 'dropdown',
    },
  });

  labels: Record<string, string> = { ...LIST_FILTER_LABELS };
  dropdownOptions: {
    organizationClientId: { id: number; name: string }[];
    accountRole: { id: number; name: string }[];
    isActive: typeof ACTIVE_FILTER_OPTIONS;
  } = {
    organizationClientId: [],
    accountRole: CLIENT_ACCOUNT_ROLE_FILTER_OPTIONS,
    isActive: ACTIVE_FILTER_OPTIONS,
  };

  constructor(
    private clientsService: ClientsService,
    private modalService: NgbModal,
    private router: Router,
    private viewState: RouteViewStateService
  ) {}

  ngOnInit(): void {
    this.viewState.seedListPaging(this.router.url, this);
    this.loadCompanyFilterOptions();
    this.loadMembers();
  }

  onSearch = (): void => {
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadMembers();
  };

  onPageChange(page: number): void {
    this.page = page;
    this.searchCriteria.pageIndex = page;
    this.loadMembers();
  }

  onEntriesChange(size: number): void {
    this.entries = size;
    this.searchCriteria.pageSize = size;
    this.page = 1;
    this.searchCriteria.pageIndex = 1;
    this.loadMembers();
  }

  onAdd(): void {
    const modalRef = this.modalService.open(AdminClientMemberCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.selectCompany = true;
    modalRef.result.then(
      created => {
        if (created) {
          this.loadMembers();
        }
      },
      () => undefined
    );
  }

  private loadCompanyFilterOptions(): void {
    this.clientsService
      .getAll({
        pageIndex: 1,
        pageSize: 200,
        ownersOnly: true,
        sortColumn: 'CompanyName',
        sortDirection: 'ASC',
      } as any)
      .subscribe(res => {
        this.dropdownOptions = {
          ...this.dropdownOptions,
          organizationClientId: (res.data?.data ?? []).map(c => ({
            id: c.id,
            name: c.companyName,
          })),
        };
      });
  }

  private loadMembers(): void {
    const query = buildPagedListQuery(this.searchCriteria, {
      extra: { ownersOnly: false },
    });

    this.clientsService.getAll(query as any).subscribe(res => {
      const paged = res.data;
      this.data = (paged?.data ?? []).map(client => ({
        ...client,
        fullName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || '—',
        accountRoleLabel: this.roleLabel(client.accountRole),
        accountStatusLabel: client.isActive ? 'Active' : 'Inactive',
      }));
      this.totalItems = paged?.totalCount ?? 0;
      this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.entries));
    });
  }

  private roleLabel(role: ClientDto['accountRole']): string {
    if (role === 'Member' || role === 2) {
      return 'Member';
    }
    return 'Owner';
  }
}
