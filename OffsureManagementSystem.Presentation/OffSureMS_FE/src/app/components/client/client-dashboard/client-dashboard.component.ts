import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ClientContextService } from 'app/core/services/client-context.service';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { SharedModule } from 'app/shared/shared.module';
import { SERVICE_REQUEST_STATUS_BADGES } from '../client.constants';

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
  ongoingProjects: ClientServiceRequestSummaryDto[] = [];
  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string }[] = [];

  constructor(private clientContext: ClientContextService) {}

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
            value: String(this.countOngoingProjects(profile)),
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

        this.recentRequests = (profile.serviceRequests ?? []).slice(0, 5);
        this.ongoingProjects = (profile.serviceRequests ?? []).filter(
          r => r.projectId && r.projectStatus === 'InProgress'
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusBadgeClass(status: string): string {
    return SERVICE_REQUEST_STATUS_BADGES[status]?.class ?? 'bg-light';
  }

  statusLabel(status: string): string {
    return SERVICE_REQUEST_STATUS_BADGES[status]?.text ?? status;
  }

  private countOngoingProjects(profile: ClientDto): number {
    return (profile.serviceRequests ?? []).filter(
      r => r.projectId && r.projectStatus === 'InProgress'
    ).length;
  }
}
