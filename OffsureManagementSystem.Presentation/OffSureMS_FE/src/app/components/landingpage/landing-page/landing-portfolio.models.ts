export interface LandingPortfolioCard {
  id: number;
  serviceId: number | null;
  title: string;
  summary: string;
  description: string;
  categoryName: string;
  serviceName: string;
  clientName: string;
  year: string;
  cardClass: string;
  imageUrls: string[];
}

export interface LandingPortfolioCategoryFilter {
  key: string;
  label: string;
}
