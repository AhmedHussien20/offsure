import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import {
  CreateServiceRequestDto,
  ServiceDto,
  ServiceRequestPriority,
} from 'app/core/models/services/service.models';
import {
  ServiceRequestCreatePrefill,
  clearServiceRequestPrefill,
} from 'app/core/models/services/service-request-prefill.model';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { ServicesService } from 'app/core/services/services.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';

/** Preferred due date must be today or later (requested date is now on create). */
function dueDateNotBeforeTodayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || raw === '') {
      return null;
    }

    const selected = parseDateOnly(raw);
    if (!selected) {
      return { minDate: true };
    }

    const today = startOfLocalDay(new Date());
    return selected < today ? { minDate: true } : null;
  };
}

function parseDateOnly(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfLocalDay(value);
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Component({
  selector: 'app-client-request-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">New Service Request</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info d-flex align-items-start gap-2 py-2 px-3 mb-3 border-0 bg-info-subtle text-info-emphasis rounded-3">
        <i class="ti ti-info-circle fs-5 mt-1 flex-shrink-0"></i>
        <div class="small">
          <strong>Not sure which service you need?</strong>
          <div>You can leave the <strong>Service</strong> field empty and describe your goals or problem in the <strong>Description</strong> field below.</div>
        </div>
      </div>
      @if (formConfig.length) {
        <app-generic-form
          [formGroup]="formGroup"
          [formConfig]="formConfig"
          [showSubmit]="false">
        </app-generic-form>
      } @else {
        <div class="text-muted py-4">Loading form...</div>
      }
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="submitting || !formConfig.length"
        (click)="onSubmit()">
        {{ submitting ? 'Submitting...' : 'Submit Request' }}
      </button>
    </div>
  `,
})
export class ClientRequestCreateComponent implements OnInit {
  @Input() prefill: ServiceRequestCreatePrefill | null = null;

  formGroup!: FormGroup;
  formConfig: FormFieldConfig[] = [];
  services: ServiceDto[] = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private servicesService: ServicesService,
    private serviceRequestsService: ServiceRequestsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      serviceId: [null],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      dueDate: ['', [dueDateNotBeforeTodayValidator()]],
      budget: [null, [Validators.required]],
      priority: [ServiceRequestPriority.Medium],
    });

    this.servicesService.getPublic({ pageIndex: 1, pageSize: 200 }).subscribe({
      next: res => {
        this.services = res.data?.data ?? [];
        this.buildFormConfig();
        this.applyPrefill();
      },
      error: () => {
        },
    });
  }

  onSubmit(): void {
    if (this.formGroup.invalid || this.submitting) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const raw = this.formGroup.getRawValue();
    const serviceIdValue = raw.serviceId != null && raw.serviceId !== '' ? Number(raw.serviceId) : null;
    const desc = raw.description?.trim() || '';

    if (!serviceIdValue && !desc) {
      this.toastr.warning('Please provide a description of your request if no service is selected.');
      const descControl = this.formGroup.get('description');
      descControl?.setErrors({ required: true });
      descControl?.markAsTouched();
      return;
    }

    const dto: CreateServiceRequestDto = {
      serviceId: serviceIdValue && serviceIdValue > 0 ? serviceIdValue : undefined,
      title: String(raw.title).trim(),
      description: desc || undefined,
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
        this.submitting = false;
        this.activeModal.close(true);
      },
      error: err => {
        this.submitting = false;
        },
    });
  }

  private buildFormConfig(): void {
    this.formConfig = [
      {
        type: 'select',
        name: 'serviceId',
        label: 'Service (Optional)',
        placeholder: 'Select a service or leave blank if unsure...',
        selectType: 'simple',
        options: this.services.map(s => ({ value: s.id, label: s.name })),
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
        placeholder: 'Describe what you want to achieve, features you need, or the problem you are facing...',
      },
      {
        type: 'input',
        inputType: 'number',
        name: 'budget',
        label: 'Budget',
        validations: { required: true },
      },
      {
        type: 'date',
        name: 'dueDate',
        label: 'Preferred Due Date',
        minDate: startOfLocalDay(new Date()),
        errorMessages: {
          minDate: 'must be today or later (not before the request date).',
        },
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

  private applyPrefill(): void {
    if (!this.prefill) {
      return;
    }

    const serviceId =
      this.prefill.serviceId != null &&
      this.services.some(s => s.id === this.prefill!.serviceId)
        ? this.prefill.serviceId
        : null;

    this.formGroup.patchValue({
      serviceId,
      title: this.prefill.title ?? '',
      description: this.prefill.description ?? '',
    });

    clearServiceRequestPrefill();
  }
}
