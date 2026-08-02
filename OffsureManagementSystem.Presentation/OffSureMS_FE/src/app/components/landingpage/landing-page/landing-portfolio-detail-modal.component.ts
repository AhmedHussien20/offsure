import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClientRequestCreateComponent } from 'app/components/client/client-request-form/client-request-create.component';
import {
  ServiceRequestCreatePrefill,
  writeServiceRequestPrefill,
} from 'app/core/models/services/service-request-prefill.model';
import { AuthService } from 'app/core/services/auth.service';
import { LandingPortfolioCard } from './landing-portfolio.models';

@Component({
  selector: 'app-landing-portfolio-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-portfolio-detail-modal.component.html',
  styleUrl: './landing-portfolio-detail-modal.component.scss',
})
export class LandingPortfolioDetailModalComponent {
  @Input() portfolio!: LandingPortfolioCard;

  activeImageIndex = 0;

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  constructor(public activeModal: NgbActiveModal) {}

  /** Visible for guests and clients only (hidden for admin / team). */
  get canRequestService(): boolean {
    if (!this.authService.isAuthenticated()) {
      return true;
    }
    return this.authService.isClient();
  }

  get activeImageUrl(): string {
    return this.portfolio.imageUrls[this.activeImageIndex] ?? '';
  }

  get hasMultipleImages(): boolean {
    return this.portfolio.imageUrls.length > 1;
  }

  get imagePositionLabel(): string {
    if (!this.portfolio.imageUrls.length) {
      return '';
    }
    return `${this.activeImageIndex + 1} / ${this.portfolio.imageUrls.length}`;
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.portfolio.imageUrls.length) {
      this.activeImageIndex = index;
    }
  }

  previousImage(): void {
    const len = this.portfolio.imageUrls.length;
    if (len < 2) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + len) % len;
  }

  nextImage(): void {
    const len = this.portfolio.imageUrls.length;
    if (len < 2) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % len;
  }

  requestService(): void {
    const prefill = this.buildRequestPrefill();

    // Logged-in clients: open create modal in place (stay on current page).
    if (this.authService.isAuthenticated() && this.authService.isClient()) {
      this.activeModal.close('request');
      const modalRef = this.modalService.open(ClientRequestCreateComponent, {
        centered: true,
        size: 'lg',
      });
      modalRef.componentInstance.prefill = prefill;
      return;
    }

    // Guests: stash prefill and route through requests (auth gate + create flow).
    writeServiceRequestPrefill(prefill);

    const queryParams: Record<string, string> = { new: '1' };
    if (prefill.serviceId != null) {
      queryParams['serviceId'] = String(prefill.serviceId);
    }

    this.activeModal.close('request');
    void this.router.navigate(['/client/requests'], { queryParams });
  }

  private buildRequestPrefill(): ServiceRequestCreatePrefill {
    const parts: string[] = [];
    if (this.portfolio.categoryName) {
      parts.push(`Category: ${this.portfolio.categoryName}`);
    }
    if (this.portfolio.serviceName) {
      parts.push(`Service: ${this.portfolio.serviceName}`);
    }
    parts.push(`Portfolio project: ${this.portfolio.title}`);
    if (this.portfolio.description?.trim()) {
      parts.push('');
      parts.push(this.portfolio.description.trim());
    }

    return {
      serviceId: this.portfolio.serviceId,
      title: `Request — ${this.portfolio.serviceName || this.portfolio.title}`,
      description: parts.join('\n'),
      portfolioTitle: this.portfolio.title,
      categoryName: this.portfolio.categoryName,
      serviceName: this.portfolio.serviceName,
    };
  }
}
