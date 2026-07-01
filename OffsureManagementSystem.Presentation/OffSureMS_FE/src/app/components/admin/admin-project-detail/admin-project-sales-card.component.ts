import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { AdminProjectSalesModalComponent } from './admin-project-sales-modal.component';

@Component({
  selector: 'app-admin-project-sales-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-project-sales-card.component.html',
  styleUrl: './admin-project-sales-card.component.scss',
})
export class AdminProjectSalesCardComponent {
  @Input({ required: true }) project!: ProjectDto;
  @Output() projectChange = new EventEmitter<ProjectDto>();

  constructor(private modalService: NgbModal) {}

  get hasSalesAssignment(): boolean {
    return !!this.project.salesId;
  }

  get salesValueLabel(): string {
    if (!this.hasSalesAssignment) {
      return 'None';
    }
    const name = this.project.salesPersonName?.trim();
    return name || 'Assigned';
  }

  get salesHintLabel(): string {
    if (!this.hasSalesAssignment) {
      return 'View or assign';
    }
    if (this.project.commissionType === 'Percentage' && this.project.commissionValue != null) {
      return `${this.project.commissionValue}% commission`;
    }
    if (this.project.commissionValue != null) {
      return 'Fixed commission';
    }
    return 'View details';
  }

  openModal(): void {
    const modalRef = this.modalService.open(AdminProjectSalesModalComponent, {
      centered: true,
      size: 'md',
      backdrop: 'static',
      windowClass: 'sales-assignment-modal',
      modalDialogClass: 'sales-assignment-modal__dialog',
    });
    modalRef.componentInstance.project = this.project;

    modalRef.closed.subscribe((updated: ProjectDto | null) => {
      if (updated) {
        this.projectChange.emit(updated);
      }
    });
  }
}
