import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  ClientDto,
  ClientFilterRequest,
  UpdateClientProfileDto,
} from '../models/clients/client.models';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly service = 'clients';

  constructor(private api: ApiService) {}

  getAll(request?: ClientFilterRequest): Observable<BaseResponse<PagedResponse<ClientDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ClientDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<ClientDto>> {
    return this.api.get<BaseResponse<ClientDto>>(this.service, `${id}`);
  }

  getProfile(): Observable<BaseResponse<ClientDto>> {
    return this.api.get<BaseResponse<ClientDto>>(this.service, 'profile');
  }

  updateProfile(dto: UpdateClientProfileDto): Observable<BaseResponse<ClientDto>> {
    return this.api.put<BaseResponse<ClientDto>>(this.service, 'profile', dto);
  }

  deactivate(id: number): Observable<BaseResponse<ClientDto>> {
    return this.api.patch<BaseResponse<ClientDto>>(this.service, `${id}/deactivate`, {});
  }
}
