export type PaymentStatus = 'Pending' | 'Completed';

export interface ProjectInvoiceDocumentDto {
  id: number;
  fileName: string;
  fileUrl: string;
  displayOrder: number;
}

export interface ProjectInvoiceDto {
  id: number;
  projectId: number;
  milestoneId?: number | null;
  milestoneName?: string | null;
  billingYear?: number | null;
  billingMonth?: number | null;
  invoiceFileName: string;
  invoiceFileUrl: string;
  documents?: ProjectInvoiceDocumentDto[];
  purchaseOrderFileName?: string | null;
  purchaseOrderFileUrl?: string | null;
  paymentStatus: PaymentStatus;
  amount?: number | null;
  notes?: string | null;
}

export interface UpdateProjectInvoiceStatusDto {
  status: PaymentStatus;
}
