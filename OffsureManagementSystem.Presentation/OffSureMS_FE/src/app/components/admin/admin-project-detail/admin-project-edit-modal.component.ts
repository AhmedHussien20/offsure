import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ProjectsService } from 'app/core/services/projects.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-project-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-project-edit-modal.component.html',
})
export class AdminProjectEditModalComponent implements OnInit {
  @Input({ required: true }) project!: ProjectDto;

  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  saving = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private toastr: ToastrService
  ) {}

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.project.name ?? '', Validators.required],
      description: [this.project.description ?? ''],
      startDate: [this.toDateInput(this.project.startDate)],
      targetEndDate: [this.toDateInput(this.project.targetEndDate)],
      budget: [this.project.budget ?? null],
      hourlyRate: [this.project.hourlyRate ?? null],
    });

    this.formConfig = [
      {
        type: 'input',
        inputType: 'text',
        name: 'name',
        label: 'Project name',
        icon: 'fe fe-edit-2',
        validations: { required: true },
      },
      {
        type: 'textarea',
        name: 'description',
        label: 'Description',
        icon: 'fe fe-file-text',
      },
      {
        type: 'date',
        name: 'startDate',
        label: 'Start date',
        icon: 'fe fe-calendar',
      },
      {
        type: 'date',
        name: 'targetEndDate',
        label: 'Deadline',
        icon: 'fe fe-calendar',
      },
    ];

    if (this.isHourlyBudget) {
      this.form.get('hourlyRate')?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      this.form.get('budget')?.setValidators([Validators.min(0)]);
    }
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;

    this.projectsService
      .update(this.project.id, {
        name: String(raw.name).trim(),
        description: raw.description || undefined,
        startDate: raw.startDate || undefined,
        targetEndDate: raw.targetEndDate || undefined,
        budgetType: this.project.budgetType,
        budget: this.isHourlyBudget ? undefined : raw.budget ?? undefined,
        hourlyRate: this.isHourlyBudget ? raw.hourlyRate ?? undefined : undefined,
        progress: this.project.progress ?? undefined,
      })
      .subscribe({
        next: res => {
          this.toastr.success('Project updated.');
          this.saving = false;
          this.activeModal.close(res.data ?? null);
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
}
