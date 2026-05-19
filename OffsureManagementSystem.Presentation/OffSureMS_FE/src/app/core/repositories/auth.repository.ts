import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../services/api.service';
import { BaseResponse } from '../../models/base.response.model';
import { RegisterRequest, RegisterResponse } from '../models/auth/register-request.model';
import { LoginResponse } from '../models/auth/login.models';

@Injectable({
  providedIn: 'root',
})
export class AuthRepository {

  private readonly service = 'Auth';

  constructor(private apiService: ApiService) {}

  login(
    email: string,
    password: string
  ): Observable<BaseResponse<LoginResponse>> {
    return this.apiService.post<BaseResponse<LoginResponse>>(
      this.service,
      'login',
      { email, password }
    );
  }

  register(dto: RegisterRequest): Observable<BaseResponse<RegisterResponse>> {
    return this.apiService.post<BaseResponse<RegisterResponse>>(
      this.service,
      'register',
      dto
    );
  }
}

