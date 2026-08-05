import { PagedResponse } from '../paged-response.model';

export interface ClientFilterRequest {
  userId?: number;
  isActive?: boolean;
  city?: string;
  country?: string;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
  ownersOnly?: boolean;
  organizationClientId?: number;
  accountRole?: ClientAccountRole;
}

export type ClientAccountRole = 'Owner' | 'Member' | 1 | 2;

export interface CreateClientDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  contactPersonPhone?: string;
  companyAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface CreateClientMemberDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactPersonPhone?: string;
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
  salesId?: number | null;
  salesPersonName?: string;
  accountRole?: ClientAccountRole;
  parentClientId?: number | null;
  membersCount?: number;
  requestsCount: number;
  projectsCount: number;
  serviceRequests: ClientServiceRequestSummaryDto[];
}
