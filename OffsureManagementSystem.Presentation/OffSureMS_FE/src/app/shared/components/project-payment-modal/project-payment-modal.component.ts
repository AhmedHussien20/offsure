import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectPaymentSectionComponent } from '../project-payment-section/project-payment-section.component';

@Component({
  selector: 'app-project-payment-modal',
  standalone: true,
  imports: [CommonModule, ProjectPaymentSectionComponent],
  templateUrl: './project-payment-modal.component.html',
})
export class ProjectPaymentModalComponent {
  @Input({ required: true }) project!: ProjectDto;
  @Input() editable = false;

  constructor(public activeModal: NgbActiveModal) {}
}
