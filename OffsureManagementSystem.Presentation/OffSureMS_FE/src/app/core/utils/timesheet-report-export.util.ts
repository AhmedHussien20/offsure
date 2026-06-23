import type { Borders, Fill, Worksheet } from 'exceljs';
import {
  HourlyProjectOverviewDto,
  HourlyProjectResourceSummaryDto,
  TimesheetReportDto,
} from 'app/core/models/timesheets/timesheet.models';
import { sumResourceLineCost } from './timesheet-report.util';

export type TimesheetExportFormat = 'excel' | 'pdf';

export interface TimesheetExportOptions {
  hideRevenue?: boolean;
  includeTimeEntries?: boolean;
  includeTimeColumn?: boolean;
  resources?: HourlyProjectResourceSummaryDto[];
  estimatedCost?: number;
}

const PRIMARY = 'FF4F46E5';
const PRIMARY_LIGHT = 'FFEEF2FF';
const HEADER_TEXT = 'FFFFFFFF';
const LABEL_BG = 'FFF8FAFC';
const BORDER_COLOR = 'FFE2E8F0';
const ALT_ROW_BG = 'FFF1F5F9';
const TEXT_DARK = 'FF1E293B';
const TEXT_MUTED = 'FF64748B';

const PDF_PRIMARY: [number, number, number] = [79, 70, 229];
const PDF_PRIMARY_LIGHT: [number, number, number] = [238, 242, 255];
const PDF_ALT_ROW: [number, number, number] = [241, 245, 249];
const PDF_LABEL_BG: [number, number, number] = [248, 250, 252];

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim() || 'timesheet-report';
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatHours(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
}

function buildBaseFileName(report: TimesheetReportDto): string {
  return safeFileName(`${report.projectName}-${report.rangeStart}-${report.rangeEnd}`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function resourceRows(resources: HourlyProjectResourceSummaryDto[]): (string | number)[][] {
  return resources.map(r => {
    const lineCost = r.costRate != null ? r.totalHours * r.costRate : null;
    return [
      r.teamMemberName,
      r.role,
      r.costRate != null ? formatCurrency(r.costRate) + '/hr' : '—',
      formatHours(r.totalHours),
      lineCost != null ? formatCurrency(lineCost) : '—',
    ];
  });
}

function entryRows(report: TimesheetReportDto, includeTimeColumn: boolean): (string | number)[][] {
  return report.rows.map(r => {
    if (includeTimeColumn) {
      return [
        formatDateLabel(r.workDate),
        r.teamMemberName,
        `${r.startTime} – ${r.endTime}`,
        r.description,
        formatHours(r.hours),
      ];
    }
    return [
      formatDateLabel(r.workDate),
      r.teamMemberName,
      r.description,
      formatHours(r.hours),
    ];
  });
}

function entryHeaders(includeTimeColumn: boolean): string[] {
  return includeTimeColumn
    ? ['Date', 'Resource', 'Time', 'Description', 'Hours']
    : ['Date', 'Resource', 'Description', 'Hours'];
}

function summaryItems(
  report: TimesheetReportDto,
  overview: HourlyProjectOverviewDto | null | undefined,
  estimatedCost: number | undefined,
  hideRevenue: boolean
): [string, string][] {
  const items: [string, string][] = [
    ['Project', report.projectName],
    ['Period', `${formatDateLabel(report.rangeStart)} – ${formatDateLabel(report.rangeEnd)}`],
    ['Total hours', formatHours(report.totalHours)],
  ];
  if (!hideRevenue && report.estimatedRevenue != null) {
    items.push(['Est. revenue', formatCurrency(report.estimatedRevenue)]);
  }
  if (estimatedCost != null) {
    items.push([hideRevenue ? 'Team est. cost' : 'Est. cost', formatCurrency(estimatedCost)]);
  }
  if (!hideRevenue && overview?.hourlyRate != null && overview.hourlyRate > 0) {
    items.push(['Billing rate', `${formatCurrency(overview.hourlyRate)}/hr`]);
  }
  items.push(['Generated', new Date().toLocaleString()]);
  return items;
}

export async function exportTimesheetReport(
  format: TimesheetExportFormat,
  report: TimesheetReportDto,
  overview: HourlyProjectOverviewDto | null | undefined,
  options: TimesheetExportOptions = {}
): Promise<void> {
  const resources = options.resources ?? [];
  const includeTimeEntries = options.includeTimeEntries ?? true;
  const includeTimeColumn = options.includeTimeColumn ?? false;
  const estimatedCost = options.estimatedCost ?? sumResourceLineCost(resources);
  const hideRevenue = options.hideRevenue ?? false;

  if (!resources.length && (!includeTimeEntries || !report.rows.length)) {
    return;
  }

  if (format === 'excel') {
    await exportExcel(report, overview, resources, estimatedCost, hideRevenue, includeTimeEntries, includeTimeColumn);
  } else {
    await exportPdf(report, overview, resources, estimatedCost, hideRevenue, includeTimeEntries, includeTimeColumn);
  }
}

function thinBorder(): Partial<Borders> {
  const side = { style: 'thin' as const, color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

function fillSolid(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleTitleRow(sheet: Worksheet, row: number, text: string, colSpan = 5): void {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: TEXT_DARK } };
  cell.fill = fillSolid(PRIMARY_LIGHT);
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = thinBorder();
  sheet.getRow(row).height = 24;
}

function styleHeaderRow(sheet: Worksheet, row: number, headers: string[]): void {
  headers.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: HEADER_TEXT } };
    cell.fill = fillSolid(PRIMARY);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder();
  });
  sheet.getRow(row).height = 22;
}

function styleDataRow(
  sheet: Worksheet,
  row: number,
  values: (string | number)[],
  alt = false,
  wrapColIndex?: number
): void {
  values.forEach((value, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = value;
    cell.font = { size: 10, color: { argb: TEXT_DARK } };
    cell.fill = fillSolid(alt ? ALT_ROW_BG : 'FFFFFFFF');
    cell.alignment = {
      vertical: 'middle',
      horizontal: index === values.length - 1 ? 'right' : 'left',
      wrapText: wrapColIndex != null ? index === wrapColIndex : index === values.length - 2,
    };
    cell.border = thinBorder();
  });
  sheet.getRow(row).height = 20;
}

function styleSummaryRow(sheet: Worksheet, row: number, label: string, value: string, colSpan = 5): void {
  const labelCell = sheet.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 10, color: { argb: TEXT_MUTED } };
  labelCell.fill = fillSolid(LABEL_BG);
  labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  labelCell.border = thinBorder();

  sheet.mergeCells(row, 2, row, colSpan);
  const valueCell = sheet.getCell(row, 2);
  valueCell.value = value;
  valueCell.font = { size: 10, color: { argb: TEXT_DARK } };
  valueCell.fill = fillSolid('FFFFFFFF');
  valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  valueCell.border = thinBorder();
  sheet.getRow(row).height = 20;
}

function styleResourceTotalRow(
  sheet: Worksheet,
  row: number,
  totalHours: number,
  totalCost: number
): void {
  sheet.mergeCells(row, 1, row, 3);
  const labelCell = sheet.getCell(row, 1);
  labelCell.value = 'Total';
  labelCell.font = { bold: true, size: 10, color: { argb: TEXT_DARK } };
  labelCell.fill = fillSolid(PRIMARY_LIGHT);
  labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  labelCell.border = thinBorder();

  const hoursCell = sheet.getCell(row, 4);
  hoursCell.value = formatHours(totalHours);
  hoursCell.font = { bold: true, size: 10, color: { argb: PRIMARY } };
  hoursCell.fill = fillSolid(PRIMARY_LIGHT);
  hoursCell.alignment = { vertical: 'middle', horizontal: 'right' };
  hoursCell.border = thinBorder();

  const costCell = sheet.getCell(row, 5);
  costCell.value = formatCurrency(totalCost);
  costCell.font = { bold: true, size: 10, color: { argb: PRIMARY } };
  costCell.fill = fillSolid(PRIMARY_LIGHT);
  costCell.alignment = { vertical: 'middle', horizontal: 'right' };
  costCell.border = thinBorder();
  sheet.getRow(row).height = 22;
}

function styleEntryTotalRow(sheet: Worksheet, row: number, totalHours: number, colSpan: number): void {
  sheet.mergeCells(row, 1, row, colSpan);
  const labelCell = sheet.getCell(row, 1);
  labelCell.value = 'Total for this period';
  labelCell.font = { bold: true, size: 10, color: { argb: TEXT_DARK } };
  labelCell.fill = fillSolid(PRIMARY_LIGHT);
  labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  labelCell.border = thinBorder();

  const hoursCell = sheet.getCell(row, colSpan + 1);
  hoursCell.value = formatHours(totalHours);
  hoursCell.font = { bold: true, size: 10, color: { argb: PRIMARY } };
  hoursCell.fill = fillSolid(PRIMARY_LIGHT);
  hoursCell.alignment = { vertical: 'middle', horizontal: 'right' };
  hoursCell.border = thinBorder();
  sheet.getRow(row).height = 22;
}

async function exportExcel(
  report: TimesheetReportDto,
  overview: HourlyProjectOverviewDto | null | undefined,
  resources: HourlyProjectResourceSummaryDto[],
  estimatedCost: number,
  hideRevenue: boolean,
  includeTimeEntries: boolean,
  includeTimeColumn: boolean
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OffSure';
  workbook.created = new Date();

  const entryHeaderList = entryHeaders(includeTimeColumn);
  const colCount = Math.max(5, entryHeaderList.length);

  const sheet = workbook.addWorksheet('Hours & costs', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 20 },
  });

  sheet.columns = [
    { width: 16 },
    { width: 26 },
    { width: 16 },
    { width: 44 },
    { width: 14 },
  ];

  sheet.mergeCells(1, 1, 1, colCount);
  const banner = sheet.getCell(1, 1);
  banner.value = 'Timesheet Report';
  banner.font = { bold: true, size: 16, color: { argb: HEADER_TEXT } };
  banner.fill = fillSolid(PRIMARY);
  banner.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 34;

  let row = 3;
  for (const [label, value] of summaryItems(report, overview, estimatedCost, hideRevenue)) {
    styleSummaryRow(sheet, row, label, value, colCount);
    row += 1;
  }

  const resourceData = resourceRows(resources);
  if (resourceData.length) {
    row += 1;
    styleTitleRow(sheet, row, 'Logged hours by resource', colCount);
    row += 1;
    styleHeaderRow(sheet, row, ['Resource', 'Role', 'Cost rate', 'Hours logged', 'Line cost']);
    row += 1;
    resourceData.forEach((data, index) => {
      styleDataRow(sheet, row, data, index % 2 === 1);
      row += 1;
    });
    styleResourceTotalRow(
      sheet,
      row,
      resources.reduce((sum, r) => sum + r.totalHours, 0),
      estimatedCost
    );
    row += 1;
  }

  if (includeTimeEntries && report.rows.length) {
    row += 1;
    styleTitleRow(sheet, row, 'Time entries', colCount);
    row += 1;
    styleHeaderRow(sheet, row, entryHeaderList);
    row += 1;
    const wrapCol = includeTimeColumn ? 3 : 2;
    entryRows(report, includeTimeColumn).forEach((data, index) => {
      styleDataRow(sheet, row, data, index % 2 === 1, wrapCol);
      row += 1;
    });
    styleEntryTotalRow(sheet, row, report.totalHours, entryHeaderList.length - 1);
  }

  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${buildBaseFileName(report)}.xlsx`
  );
}

type JsPdfDoc = import('jspdf').jsPDF & { lastAutoTable: { finalY: number } };

function drawPdfBanner(doc: import('jspdf').jsPDF, pageWidth: number): void {
  doc.setFillColor(...PDF_PRIMARY);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Timesheet Report', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
}

function pdfTableTheme() {
  return {
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.1,
      textColor: [30, 41, 59] as [number, number, number],
    },
    headStyles: {
      fillColor: PDF_PRIMARY,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      halign: 'center' as const,
    },
    alternateRowStyles: {
      fillColor: PDF_ALT_ROW,
    },
  };
}

async function exportPdf(
  report: TimesheetReportDto,
  overview: HourlyProjectOverviewDto | null | undefined,
  resources: HourlyProjectResourceSummaryDto[],
  estimatedCost: number,
  hideRevenue: boolean,
  includeTimeEntries: boolean,
  includeTimeColumn: boolean
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  drawPdfBanner(doc, pageWidth);

  let y = 28;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    body: summaryItems(report, overview, estimatedCost, hideRevenue),
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 38,
        fillColor: PDF_LABEL_BG,
        textColor: [100, 116, 139],
      },
      1: { cellWidth: 'auto' },
    },
  });

  y = (doc as JsPdfDoc).lastAutoTable.finalY + 10;

  const resourceData = resourceRows(resources);
  if (resourceData.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PDF_PRIMARY);
    doc.text('Logged hours by resource', marginX, y);
    y += 4;

    const totalHours = resources.reduce((sum, r) => sum + r.totalHours, 0);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Resource', 'Role', 'Cost rate', 'Hours logged', 'Line cost']],
      body: resourceData.map(row => row.map(cell => String(cell))),
      foot: [['Total', '', '', formatHours(totalHours), formatCurrency(estimatedCost)]],
      showFoot: 'lastPage',
      ...pdfTableTheme(),
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      didParseCell: data => {
        if (data.section === 'foot') {
          data.cell.styles.fillColor = PDF_PRIMARY_LIGHT;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = PDF_PRIMARY;
        }
      },
    });
    y = (doc as JsPdfDoc).lastAutoTable.finalY + 10;
  }

  if (includeTimeEntries && report.rows.length) {
    const headers = entryHeaders(includeTimeColumn);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PDF_PRIMARY);
    doc.text('Time entries', marginX, y);
    y += 4;

    const entries = entryRows(report, includeTimeColumn).map(row => row.map(cell => String(cell)));
    const footRow = headers.map((_, index) =>
      index === 0 ? 'Total for this period' : index === headers.length - 1 ? formatHours(report.totalHours) : ''
    );

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [headers],
      body: entries,
      foot: [footRow],
      showFoot: 'lastPage',
      ...pdfTableTheme(),
      columnStyles: {
        [headers.length - 1]: { halign: 'right' },
      },
      didParseCell: data => {
        if (data.section === 'foot') {
          data.cell.styles.fillColor = PDF_PRIMARY_LIGHT;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = PDF_PRIMARY;
          if (data.column.index === headers.length - 1) {
            data.cell.styles.halign = 'right';
          }
        }
      },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  doc.save(`${buildBaseFileName(report)}.pdf`);
}
