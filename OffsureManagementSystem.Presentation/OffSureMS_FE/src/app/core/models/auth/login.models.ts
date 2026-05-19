export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: UserInfo;
}
