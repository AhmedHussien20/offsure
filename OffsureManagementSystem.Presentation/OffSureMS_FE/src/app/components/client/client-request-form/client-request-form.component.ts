import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import {
  CreateServiceRequestDto,
  ServiceRequestPriority,
} from 'app/core/models/services/service.models';
import { ServiceDto } from 'app/core/models/services/service.models';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { SharedModule } from 'app/shared/shared.module';

@Component({
  selector: 'app-client-request-form',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './client-request-form.component.html',
})
export class ClientRequestFormComponent implements OnInit {
  formGroup!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  services: ServiceDto[] = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private servicesService: ServicesService,
    private serviceRequestsService: ServiceRequestsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      serviceId: [null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      dueDate: [''],
      budget: [null],
      priority: [ServiceRequestPriority.Medium],
    });

    this.servicesService.getPublic({ pageIndex: 1, pageSize: 200 }).subscribe({
      next: res => {
        this.services = res.data?.data ?? [];
        this.buildFormConfig();
      },
      error: () => {
        this.toastr.error('Failed to load services.');
      },
    });
  }

  onSubmit(): void {
    if (this.formGroup.invalid || this.submitting) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const raw = this.formGroup.getRawValue();
    const dto: CreateServiceRequestDto = {
      serviceId: Number(raw.serviceId),
      title: String(raw.title).trim(),
      description: raw.description?.trim() || undefined,
      dueDate: raw.dueDate || undefined,
      budget: raw.budget != null && raw.budget !== '' ? Number(raw.budget) : undefined,
      priority:
        raw.priority != null && raw.priority !== ''
          ? Number(raw.priority)
          : ServiceRequestPriority.Medium,
    };

    this.submitting = true;
    this.serviceRequestsService.create(dto).subscribe({
      next: () => {
        this.toastr.success('Service request submitted successfully.');
        this.router.navigate(['/client/requests']);
      },
      error: err => {
        this.submitting = false;
        this.toastr.error(err?.error?.message || err?.message || 'Failed to create request.');
      },
    });
  }

  private buildFormConfig(): void {
    this.formConfig = [
      {
        type: 'select',
        name: 'serviceId',
        label: 'Service',
        selectType: 'simple',
        options: this.services.map(s => ({ value: s.id, label: s.name })),
        validations: { required: true },
      },
      {
        type: 'input',
        inputType: 'text',
        name: 'title',
        label: 'Request Title',
        validations: { required: true, maxlength: 200 },
      },
      {
        type: 'textarea',
        name: 'description',
        label: 'Description',
      },
      {
        type: 'input',
        inputType: 'number',
        name: 'budget',
        label: 'Budget (optional)',
      },
      {
        type: 'date',
        name: 'dueDate',
        label: 'Preferred Due Date',
      },
      {
        type: 'select',
        name: 'priority',
        label: 'Priority',
        selectType: 'simple',
        options: [
          { value: ServiceRequestPriority.Low, label: 'Low' },
          { value: ServiceRequestPriority.Medium, label: 'Medium' },
          { value: ServiceRequestPriority.High, label: 'High' },
          { value: ServiceRequestPriority.Urgent, label: 'Urgent' },
        ],
      },
    ];
  }
}
