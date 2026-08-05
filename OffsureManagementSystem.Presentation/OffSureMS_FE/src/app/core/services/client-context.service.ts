import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, Observable, of, tap } from 'rxjs';
import { ClientsService } from './clients.service';
import { ClientDto } from '../models/clients/client.models';
import { AppState } from 'app/store/app.state';
import * as NavActions from 'app/store/nav/nav.actions';

@Injectable({ providedIn: 'root' })
export class ClientContextService {
  private profile: ClientDto | null = null;

  constructor(
    private clientsService: ClientsService,
    private store: Store<AppState>
  ) {}

  loadProfile(force = false): Observable<ClientDto | null> {
    if (this.profile && !force) {
      return of(this.profile);
    }

    return this.clientsService.getProfile().pipe(
      map(res => res.data ?? null),
      tap(p => {
        const hadProfile = !!this.profile;
        this.profile = p;
        // Refresh nav once profile is known so owner-only items (e.g. My Company Members) appear.
        if (p && !hadProfile) {
          this.store.dispatch(NavActions.initializeMenu());
        }
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
