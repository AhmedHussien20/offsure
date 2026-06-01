export enum ServiceRequestStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
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
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateServiceCategoryDto {
  name: string;
  description?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ServiceCategoryDto {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  displayOrder: number;
  isActive: boolean;
  servicesCount: number;
}

// --- Service ---

export interface ServiceFilterRequest {
  serviceCategoryId?: number;
  isVisible?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface PublicServiceFilterRequest {
  serviceCategoryId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  serviceCategoryId: number;
  iconUrl?: string;
  isVisible?: boolean;
}

export interface UpdateServiceDto {
  name: string;
  description?: string;
  serviceCategoryId: number;
  iconUrl?: string;
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
  iconUrl: string;
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
  serviceId: number;
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
  clientEmail: string;
  serviceId: number;
  serviceName: string;
  serviceCategoryName: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  requestedDate: string;
  dueDate: string | null;
  budget: number | null;
  priority: number | null;
}
