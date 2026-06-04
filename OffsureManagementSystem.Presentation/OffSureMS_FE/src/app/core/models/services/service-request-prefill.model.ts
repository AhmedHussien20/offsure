/** Draft values when opening client request create from landing portfolio (etc.). */
export interface ServiceRequestCreatePrefill {
  serviceId?: number | null;
  title?: string;
  description?: string;
  portfolioTitle?: string;
  categoryName?: string;
  serviceName?: string;
}

export const SERVICE_REQUEST_PREFILL_STORAGE_KEY = 'offsure.serviceRequestPrefill';

export function readServiceRequestPrefill(): ServiceRequestCreatePrefill | null {
  try {
    const raw = sessionStorage.getItem(SERVICE_REQUEST_PREFILL_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ServiceRequestCreatePrefill;
  } catch {
    return null;
  }
}

export function writeServiceRequestPrefill(prefill: ServiceRequestCreatePrefill): void {
  sessionStorage.setItem(SERVICE_REQUEST_PREFILL_STORAGE_KEY, JSON.stringify(prefill));
}

export function clearServiceRequestPrefill(): void {
  sessionStorage.removeItem(SERVICE_REQUEST_PREFILL_STORAGE_KEY);
}
