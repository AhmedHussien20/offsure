export interface AccountProfileDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface UpdateAccountProfileDto {
  firstName: string;
  lastName: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
