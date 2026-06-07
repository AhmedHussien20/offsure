import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ServiceDto } from 'app/core/models/services/service.models';
import { ServicesService } from 'app/core/services/services.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-service-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-service-detail-panel.component.html',
  styleUrl: './admin-service-detail-panel.component.scss',
})
export class AdminServiceDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) serviceId!: number;
  @Output() changed = new EventEmitter<void>();

  loading = false;
  updating = false;
  loadError: string | null = null;
  service: ServiceDto | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private servicesService: ServicesService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serviceId'] && this.serviceId) {
      this.loadService();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  toggleVisibility(): void {
    if (!this.service) {
      return;
    }

    const willBeVisible = !this.service.isVisible;
    this.updating = true;
    this.servicesService
      .setVisibility(this.service.id, { isVisible: willBeVisible })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            willBeVisible ? 'Service shown on landing.' : 'Service hidden from landing.'
          );
          this.updating = false;
          this.changed.emit();
          this.loadService();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update visibility.');
          this.updating = false;
        },
      });
  }

  private loadService(): void {
    this.loading = true;
    this.loadError = null;
    this.service = null;

    this.servicesService
      .getById(this.serviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.service = res.data ?? null;
          if (!this.service) {
            this.loadError = 'Service not found.';
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load service.';
          this.loading = false;
        },
      });
  }
}
