export enum ServiceRequestStatus {
  Pending = 'Pending',
  PrimaryAccepted = 'PrimaryAccepted',
  AcceptedWithProject = 'AcceptedWithProject',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

/** Backend stores priority as int 1–5 (default 3 = Medium). */
export enum ServiceRequestPriority {
  Low = 1,
  Medium = 3,
  High = 4,
  Urgent = 5,
}

// --- Service Category ---

export interface ServiceCategoryRequest {
  isActive?: boolean;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateServiceCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface ServiceCategoryDto {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  servicesCount: number;
}

export interface ServiceCatalogItemDto {
  id: number;
  name: string;
  description: string;
}

export interface ServiceCatalogCategoryDto {
  id: number;
  name: string;
  description: string;
  services: ServiceCatalogItemDto[];
}

// --- Service ---

export interface ServiceFilterRequest {
  serviceCategoryId?: number;
  isVisible?: boolean;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PublicServiceFilterRequest {
  serviceCategoryId?: number;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  serviceCategoryId: number;
  isVisible?: boolean;
}

export interface UpdateServiceDto {
  name: string;
  description?: string;
  serviceCategoryId: number;
  isVisible?: boolean;
}

export interface UpdateServiceVisibilityDto {
  isVisible: boolean;
}

export interface ServiceDto {
  id: number;
  name: string;
  description: string;
  serviceCategoryId: number;
  serviceCategoryName: string;
  isVisible: boolean;
}

// --- Service Request ---

export interface ServiceRequestFilterRequest {
  status?: ServiceRequestStatus;
  clientId?: number;
  serviceId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateServiceRequestDto {
  serviceId?: number | null;
  title: string;
  description?: string;
  dueDate?: string;
  budget?: number;
  priority?: number;
}

export interface UpdateServiceRequestStatusDto {
  status: ServiceRequestStatus;
}

export interface ServiceRequestDto {
  id: number;
  clientId: number;
  clientName: string;
  /** Person (owner or member) who submitted the request. */
  clientMemberName?: string;
  clientEmail: string;
  serviceId?: number | null;
  serviceName: string;
  serviceCategoryName: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  requestedDate: string;
  dueDate: string | null;
  budget: number | null;
  priority: number | null;
  projectId?: number | null;
  projectStatus?: string | null;
  salesId?: number | null;
  salesPersonName?: string;
}
