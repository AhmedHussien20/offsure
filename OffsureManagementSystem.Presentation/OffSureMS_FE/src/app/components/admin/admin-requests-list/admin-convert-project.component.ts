import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateProjectDto, ProjectBudgetMode } from 'app/core/models/projects/project.models';
import { ServiceRequestDto } from 'app/core/models/services/service.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ProjectsService } from 'app/core/services/projects.service';
import {
  resolveProjectBudget,
  updateProjectBudgetValidators,
} from 'app/core/utils/project-budget-form.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ProjectBudgetFieldsComponent } from 'app/shared/components/project-budget-fields/project-budget-fields.component';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-convert-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, ProjectBudgetFieldsComponent],
  templateUrl: './admin-convert-project.component.html',
  styleUrl: './admin-convert-project.component.scss',
})
export class AdminConvertProjectComponent implements OnInit, OnDestroy {
  @Input() request!: ServiceRequestDto;

  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  creating = false;

  private minDate = new Date().toISOString().split('T')[0];
  private readonly destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const defaultName = `${this.request.clientName} — ${this.request.serviceName}`;
    this.form = this.fb.group({
      name: [defaultName, Validators.required],
      startDate: [this.minDate, Validators.required],
      targetEndDate: [''],
      budgetMode: ['sameAsRequest' as ProjectBudgetMode],
      customBudgetType: ['total'],
      totalBudget: [null],
      hourlyRate: [null],
      expectedHours: [null],
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
        type: 'date',
        name: 'startDate',
        label: 'Start date',
        icon: 'fe fe-calendar',
        validations: { required: true },
      },
      {
        type: 'date',
        name: 'targetEndDate',
        label: 'Deadline',
        icon: 'fe fe-calendar',
      },
    ];

    this.form
      .get('budgetMode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => updateProjectBudgetValidators(this.form, 'convert'));

    this.form
      .get('customBudgetType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => updateProjectBudgetValidators(this.form, 'convert'));

    updateProjectBudgetValidators(this.form, 'convert');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.creating) {
      this.form.markAllAsTouched();
      return;
    }

    const budget = resolveProjectBudget(this.form, this.request.budget);
    if (this.form.get('budgetMode')?.value === 'custom' && budget == null) {
      this.toastr.warning('Enter a valid budget.');
      return;
    }

    const raw = this.form.getRawValue();
    const dto: CreateProjectDto = {
      serviceRequestId: this.request.id,
      name: String(raw.name).trim(),
      description: this.request.description,
      startDate: raw.startDate || undefined,
      targetEndDate: raw.targetEndDate || undefined,
      budget,
    };

    this.creating = true;
    this.projectsService.create(dto).subscribe({
      next: res => {
        this.toastr.success('Project created. Assign your team on the next screen.');
        const projectId = res.data?.id;
        this.activeModal.close(true);
        if (projectId) {
          this.router.navigate(['/admin/projects', projectId]);
        }
      },
      error: err => {
        this.creating = false;
        this.toastr.error(err?.error?.message || 'Failed to create project.');
      },
    });
  }
}
