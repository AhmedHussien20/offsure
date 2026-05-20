// register-request.model.ts
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  contactPersonPhone?: string;
  companyAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  description?: string;
}
export interface RegisterResponse {
  id: number;
  workspaceId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  workspace: string;
  companyName: string;
}
