import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Injectable({ providedIn: 'root' })
export class ModalService {

  private currentModal?: NgbModalRef;
  private nextId = 0;

  constructor(private ngbModal: NgbModal) {}

  open(content: any, options?: any): NgbModalRef {
    const id = ++this.nextId;

    const { windowClass: userWindowClass, ...restOptions } = options ?? {};
    const windowClass = `effect-scale npe-modal-${id} ${userWindowClass ?? ''}`.trim();

    const ref = this.ngbModal.open(content, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
      windowClass,
      ...restOptions,
    });

    this.currentModal = ref;

    setTimeout(() => this.ensureCloseButton(ref, id));

    return ref;
  }

  private ensureCloseButton(ref: NgbModalRef, id: number): void {
    const host = document.querySelector(`.npe-modal-${id}`);
    if (!host) return;

    const header = host.querySelector('.modal-header') as HTMLElement | null;
    if (header) {
      if (!header.querySelector('.btn-close')) {
        header.appendChild(this.createCloseButton(() => ref.dismiss()));
      }
      return;
    }

    const content = host.querySelector('.modal-content');
    if (!content) return;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'modal-header';
    const title = document.createElement('h6');
    title.className = 'modal-title invisible';
    headerDiv.appendChild(title);
    headerDiv.appendChild(this.createCloseButton(() => ref.dismiss()));
    content.prepend(headerDiv);
  }

  private createCloseButton(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-close';
    btn.setAttribute('aria-label', 'Close');
    btn.addEventListener('click', onClick);
    return btn;
  }

  closeAll(): void {
    this.ngbModal.dismissAll();
    this.currentModal = undefined;
  }

  close(): void {
    this.currentModal?.close();
    this.currentModal = undefined;
  }
}