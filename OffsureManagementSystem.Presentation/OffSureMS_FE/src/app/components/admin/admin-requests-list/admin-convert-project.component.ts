import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ServiceRequestDto } from 'app/core/models/services/service.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-convert-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Convert to Project</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="mb-3">
        Create a project from request <strong>{{ request.title }}</strong>?
      </p>
      <div class="mb-0">
        <label class="form-label fw-semibold" for="targetEndDate">Target end date</label>
        <input
          id="targetEndDate"
          type="date"
          class="form-control"
          [(ngModel)]="targetEndDate"
          [min]="minDate" />
        <small class="text-muted d-block mt-1">
          Set when this project should be completed (optional).
        </small>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()" [disabled]="creating">
        Cancel
      </button>
      <button type="button" class="btn btn-primary" [disabled]="creating" (click)="confirm()">
        {{ creating ? 'Creating...' : 'Create Project' }}
      </button>
    </div>
  `,
})
export class AdminConvertProjectComponent {
  @Input() request!: ServiceRequestDto;

  targetEndDate = '';
  creating = false;
  minDate = new Date().toISOString().split('T')[0];

  constructor(
    public activeModal: NgbActiveModal,
    private projectsService: ProjectsService,
    private toastr: ToastrService
  ) {}

  confirm(): void {
    this.creating = true;
    this.projectsService
      .create({
        serviceRequestId: this.request.id,
        name: this.request.title,
        description: this.request.description,
        budget: this.request.budget ?? undefined,
        targetEndDate: this.targetEndDate?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Project created from request.');
          this.activeModal.close(true);
        },
        error: err => {
          this.creating = false;
          this.toastr.error(err?.error?.message || 'Failed to create project.');
        },
      });
  }
}
