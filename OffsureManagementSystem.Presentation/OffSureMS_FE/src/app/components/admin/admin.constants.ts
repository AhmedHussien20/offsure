import { TableColumn } from 'app/shared/components/generic-table/generic-table.component';

export const SERVICE_REQUEST_STATUS_BADGES: Record<string, { text: string; class: string }> = {
  Pending: { text: 'Pending', class: 'bg-warning-transparent' },
  InProgress: { text: 'In Progress', class: 'bg-primary-transparent' },
  Completed: { text: 'Completed', class: 'bg-success-transparent' },
  Cancelled: { text: 'Cancelled', class: 'bg-secondary-transparent' },
};

export const PROJECT_STATUS_BADGES: Record<string, { text: string; class: string }> = {
  Pending: { text: 'Pending', class: 'bg-warning-transparent' },
  InProgress: { text: 'In Progress', class: 'bg-primary-transparent' },
  Completed: { text: 'Completed', class: 'bg-success-transparent' },
  OnHold: { text: 'On Hold', class: 'bg-info-transparent' },
  Cancelled: { text: 'Cancelled', class: 'bg-secondary-transparent' },
};

export const ADMIN_REQUEST_COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'clientName', label: 'Client', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: SERVICE_REQUEST_STATUS_BADGES },
  { key: 'requestedDate', label: 'Requested', type: 'date' },
];

export const ADMIN_PROJECT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Project', type: 'text' },
  { key: 'clientName', label: 'Client', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: PROJECT_STATUS_BADGES },
  { key: 'progressLabel', label: 'Progress', type: 'text' },
];

export const ADMIN_TEAM_COLUMNS: TableColumn[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'availabilityLabel', label: 'Availability', type: 'text' },
];

export const ADMIN_CLIENT_COLUMNS: TableColumn[] = [
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'requestsCount', label: 'Requests', type: 'text' },
];

export const ADMIN_PORTFOLIO_COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'clientName', label: 'Client', type: 'text' },
  { key: 'publishedLabel', label: 'Published', type: 'text' },
];

export const ADMIN_CATEGORY_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Category', type: 'text' },
  { key: 'servicesCount', label: 'Services', type: 'text' },
  { key: 'activeLabel', label: 'Active', type: 'text' },
];

export const ADMIN_SERVICE_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Service', type: 'text' },
  { key: 'serviceCategoryName', label: 'Category', type: 'text' },
  { key: 'visibleLabel', label: 'Visible', type: 'text' },
];
