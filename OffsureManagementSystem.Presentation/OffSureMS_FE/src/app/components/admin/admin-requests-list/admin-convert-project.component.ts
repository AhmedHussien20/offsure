import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateProjectDto, ProjectBudgetMode } from 'app/core/models/projects/project.models';
import { ServiceRequestDto } from 'app/core/models/services/service.models';
import { ProjectsService } from 'app/core/services/projects.service';
import {
  buildProjectBudgetFields,
  isCustomProjectBudgetValid,
  updateProjectBudgetValidators,
} from 'app/core/utils/project-budget-form.util';
import { ProjectBudgetFieldsComponent } from 'app/shared/components/project-budget-fields/project-budget-fields.component';
import { ProjectMilestoneCreateFieldsComponent } from 'app/shared/components/project-milestone-create-fields/project-milestone-create-fields.component';
import { ProjectRmAssignmentFieldsComponent } from 'app/shared/components/project-rm-assignment-fields/project-rm-assignment-fields.component';
import { ProjectSalesAssignmentFieldsComponent } from 'app/shared/components/project-sales-assignment-fields/project-sales-assignment-fields.component';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  buildProjectSalesFields,
  resolveProjectBudgetForSales,
} from 'app/core/utils/project-sales-form.util';

@Component({
  selector: 'app-admin-convert-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProjectBudgetFieldsComponent,
    ProjectMilestoneCreateFieldsComponent,
    ProjectRmAssignmentFieldsComponent,
    ProjectSalesAssignmentFieldsComponent,
  ],
  templateUrl: './admin-convert-project.component.html',
  styleUrl: './admin-convert-project.component.scss',
})
export class AdminConvertProjectComponent implements OnInit, OnDestroy {
  @Input() request!: ServiceRequestDto;

  form!: FormGroup;
  creating = false;
  salesBudgetPreview: number | null = null;
  currentStep = 1;

  private minDate = new Date().toISOString().split('T')[0];
  private readonly destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  get stepDefs(): { id: string; label: string }[] {
    return [
      { id: 'details', label: 'Details' },
      { id: 'budget', label: 'Budget & milestones' },
      { id: 'team', label: 'Team setup' },
    ];
  }

  get showMilestonesInBudgetStep(): boolean {
    const budgetMode = this.form?.get('budgetMode')?.value;
    const customType = this.form?.get('customBudgetType')?.value;
    return budgetMode === 'sameAsRequest' || customType === 'total';
  }

  get activeStepId(): string {
    return this.stepDefs[this.currentStep - 1]?.id ?? 'details';
  }

  isFirstStep(): boolean {
    return this.currentStep === 1;
  }

  isLastStep(): boolean {
    return this.currentStep === this.stepDefs.length;
  }

  goBack(): void {
    if (!this.isFirstStep()) {
      this.currentStep--;
    }
  }

  goNext(): void {
    if (!this.validateCurrentStep() || this.isLastStep()) {
      return;
    }
    this.currentStep++;
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.currentStep || step === this.currentStep || this.creating) {
      return;
    }
    this.currentStep = step;
  }

  hasSalesPerson(): boolean {
    return this.request.salesId != null && this.request.salesId > 0;
  }

  salesPersonLabel(): string {
    return this.request.salesPersonName?.trim() || 'Linked sales user';
  }

  ngOnInit(): void {
    const serviceOrTitle = this.request.serviceName?.trim() || this.request.title?.trim() || 'Project';
    const defaultName = `${this.request.clientName} — ${serviceOrTitle}`;
    this.form = this.fb.group({
      name: [defaultName, Validators.required],
      startDate: [this.minDate, Validators.required],
      targetEndDate: [''],
      budgetMode: ['sameAsRequest' as ProjectBudgetMode],
      customBudgetType: ['total'],
      totalBudget: [null],
      hourlyRate: [null],
      expectedHours: [null],
      usesMilestones: [false],
      milestoneCount: [null],
      salesId: [this.request.salesId ?? null],
      commissionType: [null],
      commissionValue: [null],
      resourceManagerIds: [[] as number[]],
    });

    this.form
      .get('budgetMode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        updateProjectBudgetValidators(this.form, 'convert');
        this.refreshDerivedState();
      });

    this.form
      .get('customBudgetType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        updateProjectBudgetValidators(this.form, 'convert');
        this.refreshDerivedState();
      });

    this.form
      .get('totalBudget')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshDerivedState());

    updateProjectBudgetValidators(this.form, 'convert');
    this.refreshDerivedState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshDerivedState(): void {
    this.salesBudgetPreview = resolveProjectBudgetForSales(this.form, this.request.budget);
  }

  private validateCurrentStep(): boolean {
    switch (this.activeStepId) {
      case 'details': {
        const name = this.form.get('name');
        const startDate = this.form.get('startDate');
        name?.markAsTouched();
        startDate?.markAsTouched();
        if (name?.invalid || startDate?.invalid) {
          this.toastr.warning('Fill in the required project details.');
          return false;
        }
        return true;
      }
      case 'budget': {
        if (
          this.form.get('budgetMode')?.value === 'custom' &&
          !isCustomProjectBudgetValid(this.form, this.request.budget)
        ) {
          this.toastr.warning('Enter a valid budget.');
          return false;
        }
        if (this.showMilestonesInBudgetStep && this.form.get('usesMilestones')?.value) {
          const count = this.form.get('milestoneCount');
          count?.markAsTouched();
          if (count?.invalid) {
            this.toastr.warning('Enter a valid number of milestones.');
            return false;
          }
        }
        return true;
      }
      case 'team': {
        return this.validateSalesAssignment();
      }
      default:
        return true;
    }
  }

  private validateSalesAssignment(): boolean {
    const salesId = this.form.get('salesId')?.value;
    if (salesId == null || salesId === '') {
      return true;
    }
    const commissionType = this.form.get('commissionType')?.value;
    const commissionValue = this.form.get('commissionValue')?.value;
    if (!commissionType) {
      this.toastr.warning('Select a commission type or remove the sales person.');
      return false;
    }
    if (commissionValue == null || commissionValue === '') {
      this.toastr.warning('Enter a commission value.');
      return false;
    }
    return true;
  }

  submit(): void {
    if (this.form.invalid || this.creating) {
      this.form.markAllAsTouched();
      return;
    }

    if (
      this.form.get('budgetMode')?.value === 'custom' &&
      !isCustomProjectBudgetValid(this.form, this.request.budget)
    ) {
      this.toastr.warning('Enter a valid budget.');
      return;
    }

    if (!this.validateSalesAssignment()) {
      return;
    }

    const raw = this.form.getRawValue();
    const isFixedBudget = raw.budgetMode === 'sameAsRequest' || raw.customBudgetType === 'total';
    const dto: CreateProjectDto = {
      serviceRequestId: this.request.id,
      name: String(raw.name).trim(),
      description: this.request.description,
      startDate: raw.startDate || undefined,
      targetEndDate: raw.targetEndDate || undefined,
      ...buildProjectBudgetFields(this.form, this.request.budget),
      usesMilestones: !!raw.usesMilestones && isFixedBudget,
      milestoneCount:
        raw.usesMilestones && isFixedBudget && raw.milestoneCount != null
          ? Number(raw.milestoneCount)
          : undefined,
      ...buildProjectSalesFields(this.form),
    };

    this.creating = true;
    this.projectsService.create(dto).subscribe({
      next: res => {
        const projectId = res.data?.id;
        this.assignResourceManagersThenClose(projectId, !!dto.usesMilestones);
      },
      error: err => {
        this.creating = false;
        },
    });
  }

  private assignResourceManagersThenClose(projectId: number | undefined, usesMilestones: boolean): void {
    const rmIds: number[] = (this.form.get('resourceManagerIds')?.value ?? []).filter(
      (id: number) => id != null && id > 0
    );

    const finish = (): void => {
      this.activeModal.close(true);
      if (projectId) {
        this.router.navigate(['/admin/projects', projectId], {
          queryParams: usesMilestones ? { tab: 'milestones' } : undefined,
        });
      }
    };

    if (!projectId || rmIds.length === 0) {
      this.toastr.success('Project created. Assign your team on the next screen.');
      finish();
      return;
    }

    this.projectsService.setResourceManagers(projectId, rmIds).subscribe({
      next: () => {
        this.toastr.success('Project created and resource managers assigned.');
        finish();
      },
      error: () => {
        this.toastr.warning(
          'Project created, but resource managers could not be assigned. Set them from the project page.'
        );
        finish();
      },
    });
  }
}
