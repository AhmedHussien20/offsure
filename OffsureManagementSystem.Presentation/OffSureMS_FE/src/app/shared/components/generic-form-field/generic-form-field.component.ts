import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';   
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-generic-form-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],   
  templateUrl: './generic-form-field.component.html',
  styleUrls: ['./generic-form-field.component.scss']
})
export class GenericFormFieldComponent {
  @Input() field: any;
  @Input() form!: FormGroup;

  hasError(errorType: string): boolean {
    return this.form?.get(this.field.name)?.hasError(errorType) && this.form?.get(this.field.name)?.touched || false;
  }

  onChecklistChange(event: any, value: any) {
    let formArray = this.form.get(this.field.name)?.value || [];

    if (event.target.checked) {
      formArray.push(value);
    } else {
      formArray = formArray.filter((item: any) => item !== value);
    }

    this.form.get(this.field.name)?.setValue(formArray);
  }
 togglePassword(field: any) {
  field.showPassword = !field.showPassword;
}

}
