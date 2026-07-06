import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SkillsService } from 'app/core/services/skills.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-skill-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Add Skill</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (categoryOptions.length === 0) {
        <div class="alert alert-warning mb-3">Create at least one skill category before adding skills.</div>
      }
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving || categoryOptions.length === 0" (click)="submit()">
        {{ saving ? 'Saving...' : 'Save Skill' }}
      </button>
    </div>
  `,
})
export class AdminSkillCreateComponent {
  @Input() categoryOptions: { id: number; name: string }[] = [];

  saving = false;
  form!: FormGroup;

  formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'name', label: 'Skill Name', validations: { required: true } },
    { type: 'textarea', name: 'description', label: 'Description' },
    {
      type: 'select',
      name: 'skillCategoryId',
      label: 'Category',
      selectType: 'simple',
      options: [],
      validations: { required: true },
    },
    { type: 'checkbox', name: 'isActive', label: 'Active' },
  ];

  constructor(
    private fb: FormBuilder,
    private skillsService: SkillsService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      skillCategoryId: [null, Validators.required],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    const options = this.categoryOptions.map(c => ({ label: c.name, value: c.id }));
    this.formConfig = this.formConfig.map(field =>
      field.name === 'skillCategoryId' ? { ...field, options } : field
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.skillsService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        skillCategoryId: Number(raw.skillCategoryId),
        isActive: !!raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Skill created.');
          this.saving = false;
          this.activeModal.close(true);
        },
        error: err => {
          this.saving = false;
        },
      });
  }
}
