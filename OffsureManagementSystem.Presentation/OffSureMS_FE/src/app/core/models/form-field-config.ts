export interface FormFieldConfig {
  type: 'input' | 'select' | 'textarea' | 'date' | 'checkbox' | 'radio' | 'file' ; 

  inputType?: 'text' | 'number' | 'email' | 'password' | 'url' | 'mobile';
  countryCodes?: {
  label: string;
  value: string;
  maxLength: number;
   regex: RegExp;
}[];
  label: string;
  name: string;
  validations?: any;
  defaultValue?: any;

  options?: any[];

  group?: string; 

  
  selectType?: 'simple' | 'employee' | 'custom';
  multiple?: boolean;

  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  
  showPassword?: boolean;

  accept?: string;        
  maxFiles?: number;      
  maxFileSizeMB?: number;  
  
  errorMessages?: {
    required?: string;
    pattern?: string;
    min?: string;
    max?: string;
    minlength?: string;
    maxlength?: string;
    email?: string;
    [key: string]: string | undefined;
  };
}
