import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ClientContextService } from 'app/core/services/client-context.service';
import { ClientsService } from 'app/core/services/clients.service';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';
import { SharedModule } from 'app/shared/shared.module';
import { serviceRequestStatusKey } from 'app/core/utils/enum-status.util';
import { forkJoin } from 'rxjs';
import { SERVICE_REQUEST_STATUS_BADGES } from '../client.constants';
import { ClientRequestCreateComponent } from '../client-request-form/client-request-create.component';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss',
})
export class ClientDashboardComponent implements OnInit {
  profile: ClientDto | null = null;
  recentRequests: ClientServiceRequestSummaryDto[] = [];
  ongoingProjects: ProjectDto[] = [];
  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string }[] = [];

  constructor(
    private clientContext: ClientContextService,
    private clientsService: ClientsService,
    private projectsService: ProjectsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.clientContext.loadProfile().subscribe({
      next: profile => {
        this.profile = profile;
        if (!profile) {
          this.loading = false;
          return;
        }

        this.statCards = [
          {
            label: 'Total Requests',
            value: String(profile.requestsCount),
            icon: 'ti-clipboard',
            description: 'All service requests',
            subValue: '',
          },
          {
            label: 'Active Projects',
            value: '0',
            icon: 'ti-folder',
            description: 'Projects in progress',
            subValue: '',
          },
          {
            label: 'Company',
            value: profile.companyName || '—',
            icon: 'ti-briefcase',
            description: profile.email,
            subValue: '',
          },
        ];

        forkJoin({
          recent: this.clientsService.getProfileRecentRequests(5),
          ongoing: this.projectsService.getMy({
            pageIndex: 1,
            pageSize: 10,
            status: ProjectStatus.InProgress,
          }),
        }).subscribe({
          next: ({ recent, ongoing }) => {
            this.recentRequests = recent.data ?? [];
            const ongoingPaged = ongoing.data;
            this.ongoingProjects = ongoingPaged?.data ?? [];
            const activeCard = this.statCards.find(c => c.label === 'Active Projects');
            if (activeCard) {
              activeCard.value = String(ongoingPaged?.totalCount ?? this.ongoingProjects.length);
            }
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusBadgeClass(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return (
      SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.text ??
      String(status ?? '')
    );
  }

  openNewRequestModal(): void {
    this.modalService.open(ClientRequestCreateComponent, {
      centered: true,
      size: 'lg',
    });
  }

}
