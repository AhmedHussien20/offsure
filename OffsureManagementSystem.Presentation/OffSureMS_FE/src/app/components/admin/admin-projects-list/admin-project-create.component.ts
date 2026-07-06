import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateProjectDto } from 'app/core/models/projects/project.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import {
  buildProjectBudgetFields,
  updateProjectBudgetValidators,
} from 'app/core/utils/project-budget-form.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import {
  PaginatedSelectComponent,
  PaginatedSelectLoader,
} from 'app/shared/components/paginated-select/paginated-select.component';
import { ProjectBudgetFieldsComponent } from 'app/shared/components/project-budget-fields/project-budget-fields.component';
import { ProjectMilestoneCreateFieldsComponent } from 'app/shared/components/project-milestone-create-fields/project-milestone-create-fields.component';
import { ProjectRmAssignmentFieldsComponent } from 'app/shared/components/project-rm-assignment-fields/project-rm-assignment-fields.component';
import { ProjectSalesAssignmentFieldsComponent } from 'app/shared/components/project-sales-assignment-fields/project-sales-assignment-fields.component';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, of, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import {
  buildProjectSalesFields,
  resolveStandaloneProjectBudget,
} from 'app/core/utils/project-sales-form.util';

@Component({
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    PaginatedSelectComponent,
    ProjectBudgetFieldsComponent,
    ProjectMilestoneCreateFieldsComponent,
    ProjectRmAssignmentFieldsComponent,
    ProjectSalesAssignmentFieldsComponent,
  ],
  templateUrl: './admin-project-create.component.html',
  styleUrl: './admin-project-create.component.scss',
})
export class AdminProjectCreateComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  creating = false;
  serviceResetToken = 0;
  salesBudgetPreview: number | null = null;
  currentStep = 1;

  private minDate = new Date().toISOString().split('T')[0];
  private clientNameById = new Map<number, string>();
  private serviceNameById = new Map<number, string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private categoriesService: ServiceCategoriesService,
    private servicesService: ServicesService,
    private projectsService: ProjectsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  get stepDefs(): { id: string; label: string }[] {
    return [
      { id: 'project', label: 'Project' },
      { id: 'budget', label: 'Budget & milestones' },
      { id: 'team', label: 'Team setup' },
    ];
  }

  get showMilestonesInBudgetStep(): boolean {
    return this.form?.get('customBudgetType')?.value === 'total';
  }

  get activeStepId(): string {
    return this.stepDefs[this.currentStep - 1]?.id ?? 'project';
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

  get serviceCategoryId(): number | null {
    const v = this.form?.get('serviceCategoryId')?.value;
    return v != null ? Number(v) : null;
  }

  loadClients: PaginatedSelectLoader = (search, pageIndex) =>
    this.clientsService
      .getAll({ pageIndex, pageSize: 20, searchKey: search.trim() || undefined })
      .pipe(
        map(res => {
          const rows = res.data?.data ?? [];
          rows.forEach(c => this.clientNameById.set(c.id, c.companyName));
          return {
            items: rows.map(c => ({ label: c.companyName, value: c.id })),
            totalCount: res.data?.totalCount ?? 0,
          };
        })
      );

  loadCategories: PaginatedSelectLoader = (search, pageIndex) =>
    this.categoriesService
      .getAll({ pageIndex, pageSize: 10, isActive: true, searchKey: search.trim() || undefined })
      .pipe(
        map(res => ({
          items: (res.data?.data ?? []).map(c => ({ label: c.name, value: c.id })),
          totalCount: res.data?.totalCount ?? 0,
        }))
      );

  loadServices: PaginatedSelectLoader = (search, pageIndex) => {
    const categoryId = this.serviceCategoryId;
    if (!categoryId) {
      return of({ items: [], totalCount: 0 });
    }
    return this.servicesService
      .getAll({
        pageIndex,
        pageSize: 10,
        serviceCategoryId: categoryId,
        searchKey: search.trim() || undefined,
      })
      .pipe(
        map(res => {
          const rows = res.data?.data ?? [];
          rows.forEach(s => this.serviceNameById.set(s.id, s.name));
          return {
            items: rows.map(s => ({ label: s.name, value: s.id })),
            totalCount: res.data?.totalCount ?? 0,
          };
        })
      );
  };

  ngOnInit(): void {
    this.form = this.fb.group({
      clientId: [null, Validators.required],
      serviceCategoryId: [null, Validators.required],
      serviceId: [null, Validators.required],
      name: ['', Validators.required],
      description: [''],
      startDate: [this.minDate, Validators.required],
      targetEndDate: [''],
      customBudgetType: ['total'],
      totalBudget: [null],
      hourlyRate: [null],
      expectedHours: [null],
      usesMilestones: [false],
      milestoneCount: [null],
      salesId: [null],
      commissionType: [null],
      commissionValue: [null],
      resourceManagerIds: [[] as number[]],
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
      .get('clientId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.suggestName());

    this.form
      .get('serviceId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.suggestName());

    this.form
      .get('serviceCategoryId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.patchValue({ serviceId: null }, { emitEvent: false });
        this.serviceResetToken++;
      });

    this.form
      .get('customBudgetType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        updateProjectBudgetValidators(this.form, 'standalone');
        this.refreshDerivedState();
      });

    this.form
      .get('totalBudget')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.salesBudgetPreview = resolveStandaloneProjectBudget(this.form);
      });

    updateProjectBudgetValidators(this.form, 'standalone');
    this.refreshDerivedState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshDerivedState(): void {
    this.salesBudgetPreview = resolveStandaloneProjectBudget(this.form);
  }

  private validateCurrentStep(): boolean {
    switch (this.activeStepId) {
      case 'project': {
        const clientId = this.form.get('clientId');
        const serviceCategoryId = this.form.get('serviceCategoryId');
        const serviceId = this.form.get('serviceId');
        const name = this.form.get('name');
        const startDate = this.form.get('startDate');
        clientId?.markAsTouched();
        serviceCategoryId?.markAsTouched();
        serviceId?.markAsTouched();
        name?.markAsTouched();
        startDate?.markAsTouched();
        if (clientId?.invalid || serviceCategoryId?.invalid || serviceId?.invalid) {
          this.toastr.warning('Select a client, service category, and service.');
          return false;
        }
        if (name?.invalid || startDate?.invalid) {
          this.toastr.warning('Fill in the required project details.');
          return false;
        }
        return true;
      }
      case 'budget': {
        const customType = this.form.get('customBudgetType')?.value;
        if (customType === 'total') {
          this.form.get('totalBudget')?.markAsTouched();
          if (this.form.get('totalBudget')?.invalid) {
            this.toastr.warning('Enter a valid total budget.');
            return false;
          }
        } else {
          this.form.get('hourlyRate')?.markAsTouched();
          if (this.form.get('hourlyRate')?.invalid) {
            this.toastr.warning('Enter a valid hourly rate.');
            return false;
          }
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

    if (!this.validateSalesAssignment()) {
      return;
    }

    const raw = this.form.getRawValue();
    const isFixedBudget = raw.customBudgetType === 'total';
    const dto: CreateProjectDto = {
      serviceRequestId: 0,
      clientId: Number(raw.clientId),
      serviceId: Number(raw.serviceId),
      name: String(raw.name).trim(),
      description: raw.description || undefined,
      startDate: raw.startDate || undefined,
      targetEndDate: raw.targetEndDate || undefined,
      ...buildProjectBudgetFields(this.form),
      usesMilestones: isFixedBudget && !!raw.usesMilestones,
      milestoneCount:
        isFixedBudget && raw.usesMilestones && raw.milestoneCount != null
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
      this.toastr.success('Project created.');
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

  private suggestName(): void {
    if (this.form.get('name')?.dirty) return;
    const clientId = Number(this.form.get('clientId')?.value);
    const serviceId = Number(this.form.get('serviceId')?.value);
    const client = this.clientNameById.get(clientId);
    const service = this.serviceNameById.get(serviceId);
    if (client && service) {
      this.form.patchValue({ name: `${client} — ${service}` }, { emitEvent: false });
    }
  }
}
