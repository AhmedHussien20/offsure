import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import {
  PortfolioDto,
  PortfolioImageDto,
  UpdatePortfolioDto,
} from 'app/core/models/portfolios/portfolio.models';
import { PortfoliosService } from 'app/core/services/portfolios.service';
import { portfolioImageUrl } from 'app/core/utils/portfolio-image.util';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-portfolio-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GenericFormComponent],
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
  saving = false;
  editing = false;
  togglingImageId: number | null = null;
  loadError: string | null = null;
  portfolio: PortfolioDto | null = null;
  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'title', label: 'Title', validations: { required: true } },
    { type: 'textarea', name: 'description', label: 'Description' },
    { type: 'input', inputType: 'text', name: 'clientName', label: 'Client name' },
    { type: 'date', name: 'completedDate', label: 'Completed date' },
    { type: 'input', inputType: 'text', name: 'thumbnailUrl', label: 'Thumbnail URL' },
    { type: 'checkbox', name: 'isPublished', label: 'Published' },
  ];

  uploadAltText = '';
  uploadFile: File | null = null;
  activeImageIndex = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private portfoliosService: PortfoliosService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      clientName: [''],
      completedDate: [''],
      thumbnailUrl: [''],
      isPublished: [false],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId'] && this.portfolioId) {
      this.editing = false;
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

  get activeLandingImagesCount(): number {
    return this.sortedImages.filter(image => image.isActive).length;
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

  isTogglingImage(imageId: number): boolean {
    return this.togglingImageId === imageId;
  }

  toggleImageActive(image: PortfolioImageDto, event: Event): void {
    event.stopPropagation();

    if (!this.portfolio || this.isTogglingImage(image.id)) {
      return;
    }

    const nextActive = !image.isActive;
    this.togglingImageId = image.id;

    this.portfoliosService
      .setImageActive(this.portfolio.id, image.id, { isActive: nextActive })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            nextActive ? 'Image is visible on the landing page.' : 'Image hidden from the landing page.'
          );
          this.togglingImageId = null;
          this.changed.emit();
          this.loadPortfolio();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update image visibility.');
          this.togglingImageId = null;
        },
      });
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] ?? null;
  }

  startEdit(): void {
    if (!this.portfolio) {
      return;
    }
    this.patchForm(this.portfolio);
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.portfolio) {
      this.patchForm(this.portfolio);
    }
  }

  saveEdit(): void {
    if (!this.portfolio || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: UpdatePortfolioDto = {
      title: String(raw.title).trim(),
      description: raw.description ? String(raw.description).trim() : undefined,
      clientName: raw.clientName ? String(raw.clientName).trim() : undefined,
      thumbnailUrl: raw.thumbnailUrl ? String(raw.thumbnailUrl).trim() : undefined,
      completedDate: raw.completedDate ? String(raw.completedDate) : undefined,
      isPublished: !!raw.isPublished,
    };

    this.saving = true;
    this.portfoliosService
      .update(this.portfolio.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Portfolio updated.');
          this.saving = false;
          this.editing = false;
          this.changed.emit();
          this.loadPortfolio();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update portfolio.');
          this.saving = false;
        },
      });
  }

  togglePublished(): void {
    if (!this.portfolio || this.editing) {
      return;
    }

    const dto: UpdatePortfolioDto = {
      title: this.portfolio.title,
      description: this.portfolio.description,
      clientName: this.portfolio.clientName,
      thumbnailUrl: this.portfolio.thumbnailUrl,
      completedDate: this.portfolio.completedDate ?? this.todayIsoDate(),
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

  async deletePortfolio(): Promise<void> {
    if (!this.portfolio) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete portfolio',
      message: `Delete "${this.portfolio.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) {
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

  private patchForm(portfolio: PortfolioDto): void {
    this.form.patchValue({
      title: portfolio.title,
      description: portfolio.description ?? '',
      clientName: portfolio.clientName ?? '',
      completedDate: this.toDateInputValue(portfolio.completedDate),
      thumbnailUrl: portfolio.thumbnailUrl ?? '',
      isPublished: portfolio.isPublished,
    });
  }

  private toDateInputValue(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.length >= 10 ? value.slice(0, 10) : value;
    }
    return date.toISOString().split('T')[0];
  }

  private loadPortfolio(): void {
    this.loading = true;
    this.loadError = null;
    this.portfolio = null;
    this.activeImageIndex = 0;
    this.uploadFile = null;
    this.uploadAltText = '';

    this.portfoliosService
      .getById(this.portfolioId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.portfolio = res.data ?? null;
          if (!this.portfolio) {
            this.loadError = 'Portfolio not found.';
          } else {
            this.patchForm(this.portfolio);
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
