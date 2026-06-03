import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateProjectDto } from 'app/core/models/projects/project.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import {
  resolveProjectBudget,
  updateProjectBudgetValidators,
} from 'app/core/utils/project-budget-form.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import {
  PaginatedSelectComponent,
  PaginatedSelectLoader,
} from 'app/shared/components/paginated-select/paginated-select.component';
import { ProjectBudgetFieldsComponent } from 'app/shared/components/project-budget-fields/project-budget-fields.component';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, of, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    PaginatedSelectComponent,
    ProjectBudgetFieldsComponent,
  ],
  templateUrl: './admin-project-create.component.html',
  styleUrl: './admin-project-create.component.scss',
})
export class AdminProjectCreateComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  creating = false;
  serviceResetToken = 0;

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
      .subscribe(() => updateProjectBudgetValidators(this.form, 'standalone'));

    updateProjectBudgetValidators(this.form, 'standalone');
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

    const budget = resolveProjectBudget(this.form);
    const raw = this.form.getRawValue();
    const dto: CreateProjectDto = {
      serviceRequestId: 0,
      clientId: Number(raw.clientId),
      serviceId: Number(raw.serviceId),
      name: String(raw.name).trim(),
      description: raw.description || undefined,
      startDate: raw.startDate || undefined,
      targetEndDate: raw.targetEndDate || undefined,
      budget,
    };

    this.creating = true;
    this.projectsService.create(dto).subscribe({
      next: res => {
        this.toastr.success('Project created.');
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
