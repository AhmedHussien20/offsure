export interface PortfolioFilterRequest {
  serviceId?: number;
  completedFrom?: string;
  completedTo?: string;
  includeUnpublished?: boolean;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface AddPortfolioImageDto {
  imageUrl: string;
  imageAltText?: string;
  displayOrder?: number;
}

export interface AddPortfolioDto {
  serviceId: number;
  title: string;
  description?: string;
  clientName?: string;
  thumbnailUrl?: string;
  completedDate?: string;
  isPublished?: boolean;
  images?: AddPortfolioImageDto[];
}

export interface UpdatePortfolioDto {
  title: string;
  description?: string;
  clientName?: string;
  thumbnailUrl?: string;
  completedDate?: string;
  isPublished?: boolean;
}

export interface LinkPortfolioToServiceDto {
  serviceId: number;
}

export interface PortfolioImageDto {
  id: number;
  imageUrl: string;
  imageAltText: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdatePortfolioImageDto {
  isActive: boolean;
}

export interface PortfolioDto {
  id: number;
  serviceId: number | null;
  serviceName: string | null;
  serviceCategoryName: string | null;
  title: string;
  description: string;
  clientName: string;
  thumbnailUrl: string;
  completedDate: string | null;
  isPublished: boolean;
  images: PortfolioImageDto[];
}

export interface PortfolioServiceSummaryDto {
  serviceId: number;
  serviceName: string;
  serviceCategoryName: string;
  projectCount: number;
}
