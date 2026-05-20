export interface PortfolioFilterRequest {
  serviceId?: number;
  completedFrom?: string;
  completedTo?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface AddPortfolioImageDto {
  imageUrl: string;
  imageAltText?: string;
  displayOrder?: number;
}

export interface AddPortfolioDto {
  serviceId?: number;
  title: string;
  description?: string;
  clientName?: string;
  thumbnailUrl?: string;
  completedDate?: string;
  projectValue?: number;
  isPublished?: boolean;
  images?: AddPortfolioImageDto[];
}

export interface UpdatePortfolioDto {
  title: string;
  description?: string;
  clientName?: string;
  thumbnailUrl?: string;
  completedDate?: string;
  projectValue?: number;
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
  projectValue: number | null;
  isPublished: boolean;
  images: PortfolioImageDto[];
}
