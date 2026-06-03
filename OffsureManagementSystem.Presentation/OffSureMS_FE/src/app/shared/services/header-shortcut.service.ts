import { Injectable, Type } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminClientCreateComponent } from 'app/components/admin/admin-clients-list/admin-client-create.component';
import { AdminPortfolioCreateComponent } from 'app/components/admin/admin-portfolios-list/admin-portfolio-create.component';
import { AdminProjectCreateComponent } from 'app/components/admin/admin-projects-list/admin-project-create.component';
import { AdminServiceCreateComponent } from 'app/components/admin/admin-services/admin-service-create.component';
import { AdminTeamCreateComponent } from 'app/components/admin/admin-team-list/admin-team-create.component';
import { ClientRequestCreateComponent } from 'app/components/client/client-request-form/client-request-create.component';
import { ServiceCategoriesService } from 'app/core/services/service-categories.service';
import { ServicesService } from 'app/core/services/services.service';
import {
  HeaderShortcut,
  HeaderShortcutModalKey,
} from '../models/header-shortcut.model';

type ModalEntry = {
  component: Type<unknown>;
  size?: 'sm' | 'lg' | 'xl';
  prepare?: (modalRef: { componentInstance: Record<string, unknown> }) => void | Promise<void>;
};

@Injectable({ providedIn: 'root' })
export class HeaderShortcutService {
  private readonly modals: Record<HeaderShortcutModalKey, ModalEntry> = {
    'client-request-create': { component: ClientRequestCreateComponent, size: 'lg' },
    'admin-team-create': { component: AdminTeamCreateComponent, size: 'lg' },
    'admin-client-create': { component: AdminClientCreateComponent, size: 'lg' },
    'admin-project-create': { component: AdminProjectCreateComponent, size: 'lg' },
    'admin-service-create': {
      component: AdminServiceCreateComponent,
      size: 'lg',
      prepare: modalRef => this.prepareServiceCreate(modalRef),
    },
    'admin-portfolio-create': {
      component: AdminPortfolioCreateComponent,
      size: 'lg',
      prepare: modalRef => this.preparePortfolioCreate(modalRef),
    },
  };

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private categoriesService: ServiceCategoriesService,
    private servicesService: ServicesService
  ) {}

  execute(shortcut: HeaderShortcut): void {
    const action = shortcut.action ?? (shortcut.modalKey ? 'modal' : 'navigate');

    if (action === 'modal' && shortcut.modalKey) {
      this.openModal(shortcut);
      return;
    }

    if (shortcut.path) {
      this.router.navigate([shortcut.path], {
        queryParams: shortcut.queryParams,
      });
    }
  }

  private openModal(shortcut: HeaderShortcut): void {
    const key = shortcut.modalKey;
    if (!key) {
      return;
    }

    const entry = this.modals[key];
    if (!entry) {
      return;
    }

    const modalRef = this.modalService.open(entry.component, {
      centered: true,
      size: shortcut.modalSize ?? entry.size ?? 'lg',
    });

    if (entry.prepare) {
      const result = entry.prepare(modalRef as { componentInstance: Record<string, unknown> });
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    }
  }

  private prepareServiceCreate(modalRef: { componentInstance: Record<string, unknown> }): void {
    this.categoriesService
      .getAll({ pageIndex: 1, pageSize: 500 } as Record<string, unknown>)
      .subscribe({
        next: res => {
          const rows = res.data?.data ?? [];
          modalRef.componentInstance['categoryOptions'] = rows.map(c => ({
            id: c.id,
            name: c.name,
          }));
        },
        error: () => {
          modalRef.componentInstance['categoryOptions'] = [];
        },
      });
  }

  private preparePortfolioCreate(modalRef: { componentInstance: Record<string, unknown> }): void {
    this.servicesService
      .getAll({ pageIndex: 1, pageSize: 500 } as Record<string, unknown>)
      .pipe(
        map(res => (res.data?.data ?? []).map(s => ({ id: s.id, name: s.name }))),
        catchError(() => of([]))
      )
      .subscribe(options => {
        modalRef.componentInstance['serviceOptions'] = options;
      });
  }
}
