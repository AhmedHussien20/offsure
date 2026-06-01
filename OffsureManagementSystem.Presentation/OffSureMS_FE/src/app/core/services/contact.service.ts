import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { ContactMessageRequest } from '../models/contact/contact.models';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly service = 'contact';

  constructor(private api: ApiService) {}

  sendMessage(request: ContactMessageRequest): Observable<BaseResponse<boolean>> {
    return this.api.post<BaseResponse<boolean>>(this.service, '', request);
  }
}
