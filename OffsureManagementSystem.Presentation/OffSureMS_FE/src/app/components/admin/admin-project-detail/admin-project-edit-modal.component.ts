import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientDto } from 'app/core/models/clients/client.models';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ProjectsService } from 'app/core/services/projects.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import {
  PaginatedSelectComponent,
  PaginatedSelectLoader,
} from 'app/shared/components/paginated-select/paginated-select.component';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-project-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, PaginatedSelectComponent],
  templateUrl: './admin-project-edit-modal.component.html',
  styleUrl: './admin-project-edit-modal.component.scss',
})
export class AdminProjectEditModalComponent implements OnInit {
  @Input({ required: true }) project!: ProjectDto;

  form!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  companyMembers: ClientDto[] = [];
  loadingMembers = false;
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

  get companyName(): string {
    return this.project?.clientName || this.companyMembers[0]?.companyName || '—';
  }

  isOwner(client: ClientDto): boolean {
    return client.accountRole === 1 || client.accountRole === 'Owner' || !client.parentClientId;
  }

  memberLabel(member: ClientDto): string {
    const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email || '—';
    const role = this.isOwner(member) ? 'Owner' : 'Member';
    return `${name} (${role})`;
  }

  loadCompanyMemberOptions: PaginatedSelectLoader = (search, pageIndex) => {
    const fetch$: Observable<ClientDto[]> =
      this.companyMembers.length > 0
        ? of(this.companyMembers)
        : this.projectsService.getEligibleClients(this.project.id).pipe(
            map(res => {
              this.companyMembers = res.data ?? [];
              return this.companyMembers;
            })
          );

    return fetch$.pipe(
      map(members => {
        const term = (search || '').trim().toLowerCase();
        const filtered = !term
          ? members
          : members.filter(m => {
              const label = this.memberLabel(m).toLowerCase();
              const email = (m.email ?? '').toLowerCase();
              return label.includes(term) || email.includes(term);
            });

        const pageSize = 20;
        const start = Math.max(0, (pageIndex - 1) * pageSize);
        const page = filtered.slice(start, start + pageSize);

        return {
          items: page.map(m => ({ label: this.memberLabel(m), value: m.id })),
          totalCount: filtered.length,
        };
      })
    );
  };

  ngOnInit(): void {
    this.form = this.fb.group({
      clientId: [this.project.clientId ?? null, Validators.required],
      name: [this.project.name ?? '', Validators.required],
      description: [this.project.description ?? ''],
      startDate: [this.toDateInput(this.project.startDate)],
      targetEndDate: [this.toDateInput(this.project.targetEndDate)],
      budget: [this.project.budget ?? null],
      hourlyRate: [this.project.hourlyRate ?? null],
    });

    this.loadEligibleClients();

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
      this.isHourlyBudget
        ? {
            type: 'input',
            inputType: 'number',
            name: 'hourlyRate',
            label: 'Hourly rate ($/hr)',
            icon: 'fe fe-dollar-sign',
            validations: { required: true, min: 0.01 },
          }
        : {
            type: 'input',
            inputType: 'number',
            name: 'budget',
            label: 'Budget ($)',
            icon: 'fe fe-dollar-sign',
            validations: { min: 0 },
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
        budget: this.isHourlyBudget
          ? undefined
          : raw.budget != null && raw.budget !== ''
            ? Number(raw.budget)
            : undefined,
        hourlyRate: this.isHourlyBudget
          ? raw.hourlyRate != null && raw.hourlyRate !== ''
            ? Number(raw.hourlyRate)
            : undefined
          : undefined,
        progress: this.project.progress ?? undefined,
        clientId: raw.clientId ? Number(raw.clientId) : undefined,
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

  private loadEligibleClients(): void {
    if (!this.project?.id) return;
    this.loadingMembers = true;
    this.projectsService.getEligibleClients(this.project.id).subscribe({
      next: res => {
        this.companyMembers = res.data ?? [];
        this.loadingMembers = false;
        if (!this.form.get('clientId')?.value && this.companyMembers.length > 0) {
          const defaultClient = this.companyMembers.find(c => this.isOwner(c)) ?? this.companyMembers[0];
          this.form.get('clientId')?.setValue(defaultClient.id);
        }
      },
      error: () => {
        this.loadingMembers = false;
      },
    });
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
}
