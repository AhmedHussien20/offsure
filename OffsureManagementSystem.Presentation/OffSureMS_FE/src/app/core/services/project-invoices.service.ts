import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ProjectInvoiceDto,
  UpdateProjectInvoiceStatusDto,
} from '../models/projects/project-invoice.models';
import { BaseResponse } from '../models/base.response';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProjectInvoicesService {
  constructor(private api: ApiService) {}

  private root(projectId: number): string {
    return `projects/${projectId}/invoices`;
  }

  getAll(projectId: number): Observable<BaseResponse<ProjectInvoiceDto[]>> {
    return this.api.get<BaseResponse<ProjectInvoiceDto[]>>(`projects/${projectId}`, 'invoices');
  }

  upsertMilestone(
    projectId: number,
    milestoneId: number,
    invoices: File[],
    purchaseOrder?: File | null,
    notes?: string
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    const form = this.buildForm(invoices, purchaseOrder, notes);
    return this.api.postFormData<BaseResponse<ProjectInvoiceDto>>(
      this.root(projectId),
      `milestone/${milestoneId}`,
      form
    );
  }

  upsertMonthly(
    projectId: number,
    billingYear: number,
    billingMonth: number,
    invoices: File[],
    purchaseOrder?: File | null,
    notes?: string
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    const form = this.buildForm(invoices, purchaseOrder, notes);
    form.append('billingYear', String(billingYear));
    form.append('billingMonth', String(billingMonth));
    return this.api.postFormData<BaseResponse<ProjectInvoiceDto>>(this.root(projectId), 'monthly', form);
  }

  upsertWhole(
    projectId: number,
    invoices: File[],
    purchaseOrder?: File | null,
    notes?: string
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    const form = this.buildForm(invoices, purchaseOrder, notes);
    return this.api.postFormData<BaseResponse<ProjectInvoiceDto>>(this.root(projectId), 'whole', form);
  }

  addDocuments(
    projectId: number,
    invoiceId: number,
    invoices: File[]
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    const form = this.buildForm(invoices);
    return this.api.postFormData<BaseResponse<ProjectInvoiceDto>>(
      this.root(projectId),
      `${invoiceId}/documents`,
      form
    );
  }

  deleteDocument(
    projectId: number,
    invoiceId: number,
    documentId: number
  ): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(
      this.root(projectId),
      `${invoiceId}/documents/${documentId}`
    );
  }

  attachPurchaseOrder(
    projectId: number,
    invoiceId: number,
    purchaseOrder: File
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    const form = new FormData();
    form.append('purchaseOrder', purchaseOrder, purchaseOrder.name);
    return this.api.postFormData<BaseResponse<ProjectInvoiceDto>>(
      this.root(projectId),
      `${invoiceId}/purchase-order`,
      form
    );
  }

  updateStatus(
    projectId: number,
    invoiceId: number,
    dto: UpdateProjectInvoiceStatusDto
  ): Observable<BaseResponse<ProjectInvoiceDto>> {
    return this.api.patch<BaseResponse<ProjectInvoiceDto>>(
      this.root(projectId),
      `${invoiceId}/status`,
      dto
    );
  }

  delete(projectId: number, invoiceId: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.root(projectId), String(invoiceId));
  }

  private buildForm(invoices: File[], purchaseOrder?: File | null, notes?: string): FormData {
    const form = new FormData();
    for (const file of invoices) {
      form.append('invoices', file, file.name);
    }
    if (purchaseOrder) {
      form.append('purchaseOrder', purchaseOrder, purchaseOrder.name);
    }
    if (notes != null && notes.trim()) {
      form.append('notes', notes.trim());
    }
    return form;
  }
}
