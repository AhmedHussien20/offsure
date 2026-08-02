import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDto, ProjectMilestoneDto } from 'app/core/models/projects/project.models';
import {
  ProjectInvoiceDocumentDto,
  ProjectInvoiceDto,
} from 'app/core/models/projects/project-invoice.models';
import { ProjectInvoicesService } from 'app/core/services/project-invoices.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { projectInvoiceFileUrl } from 'app/core/utils/project-invoice-file.util';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';

type PaymentMode = 'milestone' | 'monthly' | 'whole';

interface PaymentRow {
  key: string;
  label: string;
  subLabel?: string;
  milestoneId?: number;
  billingYear?: number;
  billingMonth?: number;
  invoice?: ProjectInvoiceDto | null;
}

@Component({
  selector: 'app-project-payment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NgTemplateOutlet, NgbDropdownModule],
  templateUrl: './project-payment-section.component.html',
  styleUrl: './project-payment-section.component.scss',
})
export class ProjectPaymentSectionComponent implements OnChanges {
  @Input({ required: true }) project!: ProjectDto;
  @Input() editable = false;
  /** When true, render body only (for use inside a modal). */
  @Input() embedded = false;

  loading = false;
  savingKey: string | null = null;
  invoices: ProjectInvoiceDto[] = [];
  rows: PaymentRow[] = [];

  monthlyYear = new Date().getFullYear();
  monthlyMonth = new Date().getMonth() + 1;

  readonly monthOptions = [
    { value: 1, label: '1 — January' },
    { value: 2, label: '2 — February' },
    { value: 3, label: '3 — March' },
    { value: 4, label: '4 — April' },
    { value: 5, label: '5 — May' },
    { value: 6, label: '6 — June' },
    { value: 7, label: '7 — July' },
    { value: 8, label: '8 — August' },
    { value: 9, label: '9 — September' },
    { value: 10, label: '10 — October' },
    { value: 11, label: '11 — November' },
    { value: 12, label: '12 — December' },
  ];

  private invoiceFiles = new Map<string, File[]>();
  private poFiles = new Map<string, File>();

  constructor(
    private invoicesService: ProjectInvoicesService,
    private confirmDialog: ConfirmDialogService,
    private toastr: ToastrService
  ) {}

  get mode(): PaymentMode {
    if (isHourlyBudgetProject(this.project)) return 'monthly';
    if (this.project.usesMilestones || this.invoices.some(i => !!i.milestoneId)) return 'milestone';
    if (this.invoices.some(i => !!i.billingYear && !!i.billingMonth)) return 'monthly';
    return 'whole';
  }

  get modeHint(): string {
    switch (this.mode) {
      case 'milestone':
        return 'Upload invoice documentation and a purchase order for each payment phase.';
      case 'monthly':
        return 'Upload monthly invoice documentation and a purchase order for this hourly project.';
      default:
        return 'Upload invoice documentation and a purchase order for this project.';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project?.id) {
      this.load();
    }
  }

  fileUrl(url: string | null | undefined): string {
    return projectInvoiceFileUrl(url);
  }

  statusClass(status: string | undefined): string {
    return status === 'Completed' ? 'bg-success-transparent' : 'bg-warning-transparent';
  }

  onInvoiceSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.invoiceFiles.set(key, files);
    const label = files.length === 1 ? files[0].name : `${files.length} files`;
    this.toastr.info(`Invoice docs selected: ${label}. Click Save to upload.`);
  }

  onPoSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.poFiles.set(key, file);

    const row = this.rows.find(r => r.key === key);
    // If invoice already exists, save PO immediately.
    if (row?.invoice?.id) {
      this.savePurchaseOrderOnly(row, file);
      return;
    }

    this.toastr.info(`PO selected: ${file.name}. Add invoice docs, then click Save.`);
  }

  selectedInvoiceLabel(key: string): string {
    const files = this.invoiceFiles.get(key);
    if (!files?.length) return '';
    if (files.length === 1) return files[0].name;
    return `${files.length} files selected`;
  }

  selectedPoName(key: string): string {
    return this.poFiles.get(key)?.name ?? '';
  }

  canSaveRow(key: string): boolean {
    return (this.invoiceFiles.get(key)?.length ?? 0) > 0;
  }

  invoiceDocuments(invoice: ProjectInvoiceDto | null | undefined): ProjectInvoiceDocumentDto[] {
    if (!invoice) return [];
    if (invoice.documents?.length) {
      return [...invoice.documents].sort(
        (a, b) =>
          (b.displayOrder ?? 0) - (a.displayOrder ?? 0) || (b.id ?? 0) - (a.id ?? 0)
      );
    }
    if (invoice.invoiceFileUrl) {
      return [
        {
          id: 0,
          fileName: invoice.invoiceFileName || 'Invoice',
          fileUrl: invoice.invoiceFileUrl,
          displayOrder: 1,
        },
      ];
    }
    return [];
  }

  hasRemovableDocuments(invoice: ProjectInvoiceDto | null | undefined): boolean {
    return this.invoiceDocuments(invoice).some(doc => doc.id > 0);
  }

  async saveRow(row: PaymentRow): Promise<void> {
    if (!this.editable || this.savingKey) return;
    const invoices = this.invoiceFiles.get(row.key) ?? [];
    const po = this.poFiles.get(row.key) ?? null;

    if (!invoices.length && po && row.invoice?.id) {
      this.savePurchaseOrderOnly(row, po);
      return;
    }

    if (!invoices.length) {
      this.toastr.warning('Choose at least one invoice document to upload.');
      return;
    }

    this.savingKey = row.key;
    const request$ =
      row.invoice?.id
        ? this.invoicesService.addDocuments(this.project.id, row.invoice.id, invoices)
        : this.mode === 'milestone' && row.milestoneId
          ? this.invoicesService.upsertMilestone(this.project.id, row.milestoneId, invoices, po)
          : this.mode === 'monthly' && row.billingYear && row.billingMonth
            ? this.invoicesService.upsertMonthly(
                this.project.id,
                row.billingYear,
                row.billingMonth,
                invoices,
                po
              )
            : this.invoicesService.upsertWhole(this.project.id, invoices, po);

    request$.subscribe({
      next: () => {
        this.toastr.success(row.invoice ? 'Invoice documentation added.' : 'Invoice documentation saved.');
        this.invoiceFiles.delete(row.key);
        this.poFiles.delete(row.key);
        this.savingKey = null;
        this.load();
      },
      error: () => {
        this.savingKey = null;
      },
    });
  }

  async deleteDocument(row: PaymentRow, doc: ProjectInvoiceDocumentDto): Promise<void> {
    if (!this.editable || !row.invoice?.id || !doc.id || this.savingKey) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete invoice document',
      message: `Delete "${doc.fileName}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (!confirmed) return;

    this.savingKey = row.key;
    this.invoicesService.deleteDocument(this.project.id, row.invoice.id, doc.id).subscribe({
      next: () => {
        this.toastr.success('Document deleted.');
        this.savingKey = null;
        this.load();
      },
      error: () => {
        this.savingKey = null;
      },
    });
  }

  private savePurchaseOrderOnly(row: PaymentRow, po: File): void {
    if (!row.invoice?.id || this.savingKey) return;

    this.savingKey = row.key;
    this.invoicesService.attachPurchaseOrder(this.project.id, row.invoice.id, po).subscribe({
      next: () => {
        this.toastr.success('Purchase order saved.');
        this.poFiles.delete(row.key);
        this.savingKey = null;
        this.load();
      },
      error: () => {
        this.savingKey = null;
      },
    });
  }

  async markCompleted(row: PaymentRow): Promise<void> {
    if (!this.editable || !row.invoice || this.savingKey) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Mark payment completed',
      message: `Mark payment for "${row.label}" as completed?`,
      confirmLabel: 'Mark completed',
      variant: 'primary',
      icon: 'ti-check',
    });
    if (!confirmed) return;

    this.savingKey = row.key;
    this.invoicesService
      .updateStatus(this.project.id, row.invoice.id, { status: 'Completed' })
      .subscribe({
        next: () => {
          this.toastr.success('Payment marked completed.');
          this.savingKey = null;
          this.load();
        },
        error: () => {
          this.savingKey = null;
        },
      });
  }

  async deleteInvoice(row: PaymentRow): Promise<void> {
    if (!this.editable || !row.invoice || this.savingKey) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete invoice',
      message: `Delete the invoice for "${row.label}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (!confirmed) return;

    this.savingKey = row.key;
    this.invoicesService.delete(this.project.id, row.invoice.id).subscribe({
      next: () => {
        this.toastr.success('Invoice deleted.');
        this.savingKey = null;
        this.load();
      },
      error: () => {
        this.savingKey = null;
      },
    });
  }

  addMonthlyRow(): void {
    if (this.mode !== 'monthly') return;
    const key = `m-${this.monthlyYear}-${this.monthlyMonth}`;
    if (this.rows.some(r => r.key === key)) {
      this.toastr.info('That month is already listed.');
      return;
    }
    this.rows = this.sortMonthlyRows([
      ...this.rows,
      {
        key,
        label: this.monthLabel(this.monthlyYear, this.monthlyMonth),
        billingYear: this.monthlyYear,
        billingMonth: this.monthlyMonth,
        invoice: this.findMonthlyInvoice(this.monthlyYear, this.monthlyMonth),
      },
    ]);
  }

  private load(): void {
    this.loading = true;
    this.invoicesService.getAll(this.project.id).subscribe({
      next: res => {
        this.invoices = res.data ?? [];
        this.rows = this.buildRows();
        this.loading = false;
      },
      error: () => {
        this.invoices = [];
        this.rows = this.buildRows();
        this.loading = false;
      },
    });
  }

  private buildRows(): PaymentRow[] {
    if (this.mode === 'milestone') {
      const milestones = [...(this.project.milestones ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      if (milestones.length > 0) {
        return milestones.map(m => this.milestoneRow(m));
      }

      // Client DTOs strip milestones; rebuild rows from uploaded invoices.
      return this.invoices
        .filter(i => i.milestoneId)
        .map(i => ({
          key: `ms-${i.milestoneId}`,
          label: i.milestoneName?.trim() || `Phase ${i.milestoneId}`,
          subLabel: i.amount != null ? `Amount: $${Number(i.amount).toLocaleString()}` : undefined,
          milestoneId: i.milestoneId!,
          invoice: i,
        }))
        .sort((a, b) => (b.invoice?.id ?? 0) - (a.invoice?.id ?? 0));
    }

    if (this.mode === 'monthly') {
      return this.sortMonthlyRows(
        this.invoices
          .filter(i => i.billingYear && i.billingMonth)
          .map(i => ({
            key: `m-${i.billingYear}-${i.billingMonth}`,
            label: this.monthLabel(Number(i.billingYear), Number(i.billingMonth)),
            billingYear: Number(i.billingYear),
            billingMonth: Number(i.billingMonth),
            invoice: i,
          }))
      );
    }

    const whole = this.invoices.find(
      i => !i.milestoneId && !i.billingYear && !i.billingMonth
    );
    if (!this.editable && !whole) {
      return [];
    }
    return [
      {
        key: 'whole',
        label: 'Project invoice',
        subLabel: 'Fixed budget',
        invoice: whole ?? null,
      },
    ];
  }

  private milestoneRow(m: ProjectMilestoneDto): PaymentRow {
    return {
      key: `ms-${m.id}`,
      label: m.name,
      subLabel:
        m.paymentAmount != null
          ? `Phase amount: $${Number(m.paymentAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : undefined,
      milestoneId: m.id,
      invoice: this.invoices.find(i => i.milestoneId === m.id) ?? null,
    };
  }

  private findMonthlyInvoice(year: number, month: number): ProjectInvoiceDto | null {
    return (
      this.invoices.find(
        i => Number(i.billingYear) === year && Number(i.billingMonth) === month
      ) ?? null
    );
  }

  /** Newest billing period first (e.g. Aug 2026 above Jul 2026). */
  private sortMonthlyRows(rows: PaymentRow[]): PaymentRow[] {
    return [...rows].sort((a, b) => {
      const yearDiff = (b.billingYear ?? 0) - (a.billingYear ?? 0);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = (b.billingMonth ?? 0) - (a.billingMonth ?? 0);
      if (monthDiff !== 0) return monthDiff;
      return (b.invoice?.id ?? 0) - (a.invoice?.id ?? 0);
    });
  }

  private monthLabel(year: number, month: number): string {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
}
