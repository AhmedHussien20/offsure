import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../client.constants';

@Component({
  selector: 'app-client-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './client-project-detail.component.html',
})
export class ClientProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading = false;
      return;
    }

    this.projectsService.getMyById(id).subscribe({
      next: res => {
        this.project = res.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusBadgeClass(status: string): string {
    return PROJECT_STATUS_BADGES[status]?.class ?? 'bg-light';
  }

  statusLabel(status: string): string {
    return PROJECT_STATUS_BADGES[status]?.text ?? status;
  }
}
