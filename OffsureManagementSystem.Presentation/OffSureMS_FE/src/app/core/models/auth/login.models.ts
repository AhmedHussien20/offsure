export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  customerId: number;
  token: string;
  role: string | number;
  roleText?: string;
  forcePasswordChange: boolean;
  otpSessionToken?: string | null;
  expiresAtUtc?: string | null;
}

/** Request body for POST api/v1/admin/auth/login (username only; JSON uses camelCase `userName`). */
export interface AdminLoginRequest {
  userName: string;
  password: string;
}

export interface AdminLoginResponse {
  userId: number;
  roles: string[];
  token: string;
  /** Always `system` for internal staff JWTs. */
  type: 'system';
}

export interface OtpLoginRequest {
  usernameOrEmail: string;
  otp: string;
}

export interface OtpLoginResponse {
  userId: number;
  customerId: number;
  forcePasswordChange: true;
  otpSessionToken: string;
  expiresAtUtc: string;
}

export interface VerifyOtpRequest {
  userId: number;
  otpSessionToken: string;
}

export interface ChangePasswordFirstLoginRequest {
  userId: number;
  otpSessionToken: string;
  newPassword: string;
}
