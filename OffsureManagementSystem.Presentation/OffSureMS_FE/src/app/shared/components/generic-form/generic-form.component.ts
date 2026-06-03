import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneComponent, DropzoneConfigInterface, DropzoneModule } from 'ngx-dropzone-wrapper';
import { FormFieldConfig } from 'app/core/models/form-field-config';

@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, DropzoneModule],
  templateUrl: './generic-form.component.html',
  styleUrls: ['./generic-form.component.scss']
})
export class GenericFormComponent implements OnInit {

  @Input() title: string = '';
  @Input() breadcrumbs: string[] = [];
  @Input() activeitem: string = '';
  @Input() formConfig: any[] = [];
  @Output() formSubmitted = new EventEmitter<void>();

  @Input() formGroup!: FormGroup;

  @Output() formSubmit = new EventEmitter<any>();

  /** Button label translation key. Default matches previous behavior. */
  @Input() submitLabel: string = 'FORM.SAVE';

  /** When false, hides the submit button (read-only forms). */
  @Input() showSubmit: boolean = true;

  constructor(private location: Location) { }

  ngOnInit() { }

  isTextInput(field: FormFieldConfig): boolean {
    if (field.inputType === 'mobile') {
      return false;
    }
    if (field.type === 'textarea' || field.type === 'select' || field.type === 'checkbox' || field.type === 'date' || field.type === 'file') {
      return false;
    }
    return (
      field.type === 'input' ||
      field.type === 'text' ||
      field.type === 'number' ||
      !!field.inputType
    );
  }

  isInvalid(fieldName: string): boolean {
    const control = this.formGroup.controls[fieldName];
    if (!control) {
      return false;
    }
    return control.invalid && (control.dirty || control.touched);
  }

  getFieldIcon(field: FormFieldConfig): string {
    if (field.icon) {
      return field.icon;
    }

    const name = field.name.toLowerCase();

    if (field.inputType === 'email' || name.includes('email')) {
      return 'fe fe-mail';
    }
    if (field.inputType === 'password') {
      return 'fe fe-lock';
    }
    if (field.inputType === 'mobile' || name.includes('phone')) {
      return 'fe fe-phone';
    }
    if (name.includes('company')) {
      return 'fe fe-briefcase';
    }
    if (name.includes('address')) {
      return 'fe fe-map-pin';
    }
    if (name.includes('city')) {
      return 'fe fe-map';
    }
    if (name.includes('country')) {
      return 'fe fe-flag';
    }
    if (name.includes('postal') || name.includes('zip')) {
      return 'fe fe-mail';
    }
    if (field.type === 'date' || name.includes('date')) {
      return 'fe fe-calendar';
    }
    if (field.inputType === 'number' || name.includes('budget') || name.includes('amount') || name.includes('experience')) {
      return 'fe fe-hash';
    }
    if (name.includes('title') || name.includes('name')) {
      return 'fe fe-user';
    }
    if (field.type === 'textarea' || name.includes('description')) {
      return 'fe fe-file-text';
    }
    if (field.type === 'select') {
      return 'fe fe-list';
    }
    if (field.inputType === 'url') {
      return 'fe fe-link';
    }

    return 'fe fe-edit-2';
  }

  toggleFieldPassword(field: FormFieldConfig): void {
    field.showPassword = !field.showPassword;
  }

  formatDateBound(value: Date | string | undefined): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      return value.split('T')[0];
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit() {
    if (this.formGroup.valid) {
      this.formSubmit.emit(this.formGroup.value);
    } else {
      this.formGroup.markAllAsTouched();
    }
  }

  onGeneratePassword(fieldName: string): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const passwordLength = 12;

    const password = Array(passwordLength)
      .fill(chars)
      .map(x => x[Math.floor(Math.random() * x.length)])
      .join('');

    this.formGroup.get(fieldName)?.setValue(password);
  }

  goBack() {
    this.location.back();
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/user.png';
  }

  onFileAdded(event: any, field: any) {
  const control = this.formGroup.get(field.name);
  if (!control) return;

  if (field.multiple) {
    const currentFiles: File[] = control.value ?? [];
    control.setValue([...currentFiles, event]);
  } else {
    control.setValue(event);
  }
  console.log('Attachments value:', control.value);
}

 onFileRemoved(event: any, field: any) {
  const control = this.formGroup.get(field.name);
  if (!control) return;

  if (field.multiple) {
    const files = (control.value || []).filter((f: File) => f !== event);
    control.setValue(files);
  } else {
    control.setValue(null);
  }
}




  getDropzoneConfig(field: any): DropzoneConfigInterface {
    return {
      url: 'no-upload',
      autoProcessQueue: false,
      clickable: true,
      maxFiles: field.multiple ? (field.maxFiles ?? 10) : 1,
      acceptedFiles: field.accept ?? null
    };
  }

  get orderedFields(): any[] {
  if (!this.formConfig) return [];

  const normalFields = this.formConfig.filter(
    f => f.type !== 'textarea' && f.type !== 'file'
  );

  const fileFields = this.formConfig.filter(f => f.type === 'file');
  const textareas = this.formConfig.filter(f => f.type === 'textarea');

  // normal → file → textarea
  return [...normalFields, ...fileFields, ...textareas];
}




}
