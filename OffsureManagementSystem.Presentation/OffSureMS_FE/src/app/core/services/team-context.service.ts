import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { TeamMemberDto } from '../models/team-members/team-member.models';
import { TeamPortalService } from './team-portal.service';

@Injectable({ providedIn: 'root' })
export class TeamContextService {
  private profile: TeamMemberDto | null = null;

  constructor(private teamPortal: TeamPortalService) {}

  loadProfile(force = false): Observable<TeamMemberDto | null> {
    if (this.profile && !force) {
      return of(this.profile);
    }

    return this.teamPortal.getProfile().pipe(
      map(res => res.data ?? null),
      tap(p => {
        this.profile = p;
      })
    );
  }

  getProfileSnapshot(): TeamMemberDto | null {
    return this.profile;
  }

  getTeamMemberId(): number | null {
    return this.profile?.id ?? null;
  }

  clear(): void {
    this.profile = null;
  }
}
