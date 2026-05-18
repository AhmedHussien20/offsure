export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmedPassword: string;
  workspace: string;
  companyName: string;
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
