import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneComponent, DropzoneConfigInterface, DropzoneModule } from 'ngx-dropzone-wrapper';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, DropzoneModule,MatDatepickerModule,MatInputModule,MatFormFieldModule
  
  ],
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

  onSubmit() {
    console.log('GenericFormComponent onSubmit triggered');

    if (this.formGroup.valid) {
      console.log('Form is valid, emitting:', this.formGroup.value);
      this.formSubmit.emit(this.formGroup.value);
    } else {
      console.warn('Form invalid → marking all touched');
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
