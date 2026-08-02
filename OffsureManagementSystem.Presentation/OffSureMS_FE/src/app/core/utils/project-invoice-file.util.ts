import { environment } from '../../../environments/environment';

/** Resolves API-stored invoice/PO paths to a browser-loadable URL. */
export function projectInvoiceFileUrl(fileUrl: string | null | undefined): string {
  const raw = fileUrl?.trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${apiOrigin()}${raw}`;
  return `${apiOrigin()}/storage/project-invoices/${encodeURIComponent(raw.split(/[/\\]/).pop() ?? raw)}`;
}

function apiOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/i, '');
}
