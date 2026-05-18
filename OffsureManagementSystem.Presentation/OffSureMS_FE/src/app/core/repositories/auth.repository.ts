import { Injectable } from '@angular/core';
import { Observable } from 'rxjs'; 
import { ApiService } from '../services/api.service';
import { BaseResponse } from '../../models/base.response.model';
import { RegisterRequest, RegisterResponse } from '../models/auth/register-request.model';
import {
  ChangePasswordFirstLoginRequest,
  LoginResponse,
} from '../models/auth/login.models';

@Injectable({
  providedIn: 'root',
})
export class AuthRepository {

  private readonly service = 'Auth';

  constructor(private apiService: ApiService) {}

  login(
    username: string,
    password: string
  ): Observable<BaseResponse<LoginResponse>>
 {
    return this.apiService.post<
      BaseResponse<LoginResponse>
    >(this.service, 'login', { username, password });
  }

  changePasswordFirstLogin(dto: ChangePasswordFirstLoginRequest): Observable<BaseResponse<'OK'>> {
    return this.apiService.post<BaseResponse<'OK'>>(this.service, 'change-password-first-login', dto);
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

   register(dto: RegisterRequest): Observable<BaseResponse<RegisterResponse>> {
    return this.apiService.post<BaseResponse<RegisterResponse>>(
      this.service,'register',dto);
  }
}

