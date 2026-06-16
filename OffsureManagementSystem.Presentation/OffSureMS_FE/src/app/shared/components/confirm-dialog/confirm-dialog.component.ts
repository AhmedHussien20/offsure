import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogOptions, ConfirmDialogVariant } from './confirm-dialog.models';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  @Input() options!: ConfirmDialogOptions;

  constructor(public activeModal: NgbActiveModal) {}

  get title(): string {
    return this.options?.title ?? 'Are you sure?';
  }

  get message(): string {
    return this.options?.message ?? '';
  }

  get confirmLabel(): string {
    return this.options?.confirmLabel ?? 'Confirm';
  }

  get cancelLabel(): string {
    return this.options?.cancelLabel ?? 'Cancel';
  }

  get alternateConfirmLabel(): string | null {
    return this.options?.alternateConfirmLabel?.trim() || null;
  }

  get hasAlternateAction(): boolean {
    return !!this.alternateConfirmLabel;
  }

  get variant(): ConfirmDialogVariant {
    return this.options?.variant ?? 'danger';
  }

  get iconClass(): string {
    if (this.options?.icon) {
      return this.options.icon;
    }
    if (this.variant === 'warning') {
      return 'ti-alert-triangle';
    }
    if (this.variant === 'primary') {
      return 'ti-info-circle';
    }
    return 'ti-trash';
  }

  confirm(): void {
    this.activeModal.close('confirm');
  }

  alternateConfirm(): void {
    this.activeModal.close('alternate');
  }

  dismiss(): void {
    this.activeModal.dismiss(false);
  }
}
