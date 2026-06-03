import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectDetailReadonlyComponent } from 'app/shared/components/project-detail-readonly/project-detail-readonly.component';
import { SharedModule } from 'app/shared/shared.module';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { PROJECT_STATUS_BADGES } from '../client.constants';

@Component({
  selector: 'app-client-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ProjectDetailReadonlyComponent],
  templateUrl: './client-project-detail.component.html',
})
export class ClientProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private breadcrumbService: BreadcrumbService
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
        if (this.project?.name) {
          this.breadcrumbService.setDynamicLabel(this.project.name);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  readonly statusBadgeClassFn = (status: unknown): string =>
    PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';

  readonly statusLabelFn = (status: unknown): string =>
    PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
}
