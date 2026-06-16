import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogChoice, ConfirmDialogOptions } from '../components/confirm-dialog/confirm-dialog.models';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private modalService: NgbModal) {}

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
      size: 'sm',
      backdrop: 'static',
      keyboard: true,
      windowClass: 'confirm-dialog-window',
    });

    modalRef.componentInstance.options = options;

    return modalRef.result
      .then(result => result === 'confirm' || result === true)
      .catch(() => false);
  }

  /** Resolves `'confirm'`, `'alternate'`, or `false` when dismissed. */
  confirmChoice(options: ConfirmDialogOptions): Promise<ConfirmDialogChoice | false> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
      size: 'sm',
      backdrop: 'static',
      keyboard: true,
      windowClass: 'confirm-dialog-window',
    });

    modalRef.componentInstance.options = options;

    return modalRef.result
      .then((result: ConfirmDialogChoice | boolean) => {
        if (result === 'alternate') return 'alternate';
        if (result === 'confirm' || result === true) return 'confirm';
        return false;
      })
      .catch(() => false);
  }
}
