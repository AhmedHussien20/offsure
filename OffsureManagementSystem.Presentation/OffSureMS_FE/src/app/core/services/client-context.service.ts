import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { ClientsService } from './clients.service';
import { ClientDto } from '../models/clients/client.models';

@Injectable({ providedIn: 'root' })
export class ClientContextService {
  private profile: ClientDto | null = null;

  constructor(private clientsService: ClientsService) {}

  loadProfile(force = false): Observable<ClientDto | null> {
    if (this.profile && !force) {
      return of(this.profile);
    }

    return this.clientsService.getProfile().pipe(
      map(res => res.data ?? null),
      tap(p => {
        this.profile = p;
      })
    );
  }

  getProfileSnapshot(): ClientDto | null {
    return this.profile;
  }

  getClientId(): number | null {
    return this.profile?.id ?? null;
  }

  clear(): void {
    this.profile = null;
  }
}
