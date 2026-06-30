import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommissionType, ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectSalesAssignmentFieldsComponent } from 'app/shared/components/project-sales-assignment-fields/project-sales-assignment-fields.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-project-sales-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProjectSalesAssignmentFieldsComponent],
  templateUrl: './admin-project-sales-modal.component.html',
  styleUrl: './admin-project-sales-modal.component.scss',
})
export class AdminProjectSalesModalComponent implements OnInit {
  @Input({ required: true }) project!: ProjectDto;

  form!: FormGroup;
  editing = false;
  saving = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private toastr: ToastrService
  ) {}

  get hasSalesAssignment(): boolean {
    return !!this.project.salesId;
  }

  get commissionTypeLabel(): string {
    return this.project.commissionType === 'Percentage' ? 'Percentage' : 'Fixed';
  }

  get commissionValueLabel(): string {
    if (this.project.commissionType === 'Percentage') {
      return this.project.commissionValue != null ? `${this.project.commissionValue}%` : '—';
    }
    return this.project.commissionValue != null
      ? `$${this.project.commissionValue}`
      : '—';
  }

  ngOnInit(): void {
    this.buildForm();
    this.editing = !this.hasSalesAssignment;
  }

  startEdit(): void {
    this.buildForm();
    this.editing = true;
  }

  cancelEdit(): void {
    if (!this.hasSalesAssignment) {
      this.activeModal.dismiss();
      return;
    }
    this.editing = false;
    this.buildForm();
  }

  removeAssignment(): void {
    this.saving = true;
    this.projectsService
      .updateSalesAssignment(this.project.id, {
        salesId: null,
        commissionType: null,
        commissionValue: null,
      })
      .subscribe({
        next: res => {
          this.toastr.success('Sales assignment removed.');
          this.saving = false;
          this.activeModal.close(res.data ?? null);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to remove sales assignment.');
          this.saving = false;
        },
      });
  }

  save(): void {
    const raw = this.form.getRawValue();
    const salesId = raw.salesId != null && raw.salesId !== '' ? Number(raw.salesId) : null;

    if (!salesId) {
      if (this.hasSalesAssignment) {
        this.removeAssignment();
      } else {
        this.toastr.warning('Select a sales person or cancel.');
      }
      return;
    }

    const commissionType = raw.commissionType as CommissionType | null;
    const commissionValue =
      raw.commissionValue != null && raw.commissionValue !== ''
        ? Number(raw.commissionValue)
        : null;

    if (!commissionType || commissionValue == null) {
      this.toastr.warning('Select commission type and value.');
      return;
    }

    this.saving = true;
    this.projectsService
      .updateSalesAssignment(this.project.id, {
        salesId,
        commissionType,
        commissionValue,
      })
      .subscribe({
        next: res => {
          this.toastr.success('Sales assignment updated.');
          this.saving = false;
          this.activeModal.close(res.data ?? null);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update sales assignment.');
          this.saving = false;
        },
      });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      salesId: [this.project.salesId ?? null],
      commissionType: [this.project.commissionType ?? null],
      commissionValue: [this.project.commissionValue ?? null],
    });
  }
}
