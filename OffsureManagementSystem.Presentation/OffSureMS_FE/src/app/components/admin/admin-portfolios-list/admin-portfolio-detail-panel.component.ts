import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PortfolioDto,
  PortfolioImageDto,
  UpdatePortfolioDto,
} from 'app/core/models/portfolios/portfolio.models';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { portfolioImageUrl } from 'app/core/utils/portfolio-image.util';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-portfolio-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-portfolio-detail-panel.component.html',
  styleUrl: './admin-portfolio-detail-panel.component.scss',
})
export class AdminPortfolioDetailPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) portfolioId!: number;
  @Output() changed = new EventEmitter<void>();

  loading = false;
  publishing = false;
  deleting = false;
  uploading = false;
  loadError: string | null = null;
  portfolio: PortfolioDto | null = null;

  uploadAltText = '';
  uploadFile: File | null = null;
  activeImageIndex = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private portfoliosService: PortfoliosService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId'] && this.portfolioId) {
      this.loadPortfolio();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get sortedImages(): PortfolioImageDto[] {
    const images = this.portfolio?.images ?? [];
    return [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  get activeImageUrl(): string {
    const images = this.sortedImages;
    if (!images.length) {
      return this.thumbnailUrl;
    }
    const image = images[this.activeImageIndex] ?? images[0];
    return portfolioImageUrl(image.imageUrl);
  }

  get thumbnailUrl(): string {
    return portfolioImageUrl(this.portfolio?.thumbnailUrl);
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  imageUrl(image: PortfolioImageDto): string {
    return portfolioImageUrl(image.imageUrl);
  }

  selectImage(index: number): void {
    this.activeImageIndex = index;
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] ?? null;
  }

  togglePublished(): void {
    if (!this.portfolio) {
      return;
    }

    const dto: UpdatePortfolioDto = {
      title: this.portfolio.title,
      description: this.portfolio.description,
      clientName: this.portfolio.clientName,
      thumbnailUrl: this.portfolio.thumbnailUrl,
      completedDate: this.portfolio.completedDate ?? this.todayIsoDate(),
      projectValue: this.portfolio.projectValue ?? undefined,
      isPublished: !this.portfolio.isPublished,
    };

    this.publishing = true;
    this.portfoliosService
      .update(this.portfolio.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(dto.isPublished ? 'Portfolio published.' : 'Portfolio unpublished.');
          this.publishing = false;
          this.changed.emit();
          this.loadPortfolio();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update portfolio.');
          this.publishing = false;
        },
      });
  }

  deletePortfolio(): void {
    if (!this.portfolio) {
      return;
    }

    if (!confirm(`Delete portfolio "${this.portfolio.title}"?`)) {
      return;
    }

    this.deleting = true;
    this.portfoliosService
      .delete(this.portfolio.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Portfolio deleted.');
          this.deleting = false;
          this.changed.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to delete portfolio.');
          this.deleting = false;
        },
      });
  }

  uploadImage(): void {
    if (!this.portfolio) {
      return;
    }
    if (!this.uploadFile) {
      this.toastr.warning('Choose an image file first.');
      return;
    }

    this.uploading = true;
    this.portfoliosService
      .uploadImage(
        this.portfolio.id,
        this.uploadFile,
        this.uploadAltText.trim() || undefined,
        this.sortedImages.length
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Image uploaded.');
          this.uploadFile = null;
          this.uploadAltText = '';
          this.uploading = false;
          this.changed.emit();
          this.loadPortfolio();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to upload image.');
          this.uploading = false;
        },
      });
  }

  private loadPortfolio(): void {
    this.loading = true;
    this.loadError = null;
    this.portfolio = null;
    this.activeImageIndex = 0;
    this.uploadFile = null;
    this.uploadAltText = '';

    this.portfoliosService
      .getById(this.portfolioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.portfolio = res.data ?? null;
          if (!this.portfolio) {
            this.loadError = 'Portfolio not found.';
          }
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load portfolio.';
          this.loading = false;
        },
      });
  }

  private todayIsoDate(): string {
    return new Date().toISOString();
  }
}
