import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SkillCategoriesService } from 'app/core/services/skill-categories.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-skill-category-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Skill Category</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Category' }}
      </button>
    </div>
  `,
})
export class AdminSkillCategoryCreateComponent {
  saving = false;
  form!: FormGroup;

  formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'name', label: 'Category Name', validations: { required: true } },
    { type: 'textarea', name: 'description', label: 'Description' },
    { type: 'checkbox', name: 'isActive', label: 'Active' },
  ];

  constructor(
    private fb: FormBuilder,
    private skillCategoriesService: SkillCategoriesService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.skillCategoriesService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        isActive: !!raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Skill category created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create category.');
          this.saving = false;
        },
      });
  }
}
