import { PagedResponse } from '../paged-response.model';

export interface ClientFilterRequest {
  userId?: number;
  isActive?: boolean;
  city?: string;
  country?: string;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface UpdateClientProfileDto {
  companyName?: string;
  contactPersonPhone?: string;
  companyAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface ClientServiceRequestSummaryDto {
  id: number;
  serviceId: number;
  serviceName: string;
  title: string;
  status: string;
  requestedDate: string;
  projectId: number | null;
  projectName: string | null;
  projectStatus: string | null;
}

export interface ClientDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  isUserActive: boolean;
  isEmailVerified: boolean;
  companyName: string;
  contactPersonPhone: string;
  companyAddress: string;
  city: string;
  country: string;
  postalCode: string;
  isActive: boolean;
  requestsCount: number;
  projectsCount: number;
  serviceRequests: ClientServiceRequestSummaryDto[];
}
