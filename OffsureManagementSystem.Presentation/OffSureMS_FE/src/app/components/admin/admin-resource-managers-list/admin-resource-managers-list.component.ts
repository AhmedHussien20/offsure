import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResourceManagerUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { AdminResourceManagerCreateComponent } from './admin-resource-manager-create.component';

@Component({
  selector: 'app-admin-resource-managers-list',
  standalone: true,
  imports: [CommonModule, SharedModule, GenericTableComponent],
  template: `
    <app-page-header></app-page-header>

    <div class="card custom-card">
      <app-generic-table
        [columns]="columns"
        [data]="data"
        [totalItems]="data.length"
        [totalPages]="1"
        [page]="1"
        [entries]="data.length || 10"
        [showPagination]="false"
        [showSearch]="false"
        [showEmployeeFilter]="false"
        [showExportExcel]="false"
        [showAddButton]="true"
        [addButtonLabel]="'Add resource manager'"
        (addClick)="onAdd()">
      </app-generic-table>
    </div>
  `,
})
export class AdminResourceManagersListComponent implements OnInit {
  columns = [
    { key: 'fullName', label: 'Name', type: 'text' as const },
    { key: 'email', label: 'Email', type: 'text' as const },
  ];
  data: ResourceManagerUserDto[] = [];

  constructor(
    private teamMembersService: TeamMembersService,
    private modalService: NgbModal,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
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
    this.teamMembersService.getResourceManagers({ pageIndex: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.data = res.data?.data ?? [];
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to load resource managers.'),
    });
  }
}
