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

export const CLIENT_REQUEST_COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: SERVICE_REQUEST_STATUS_BADGES },
  { key: 'requestedDate', label: 'Requested', type: 'date' },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
];

export const CLIENT_PROJECT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Project', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: PROJECT_STATUS_BADGES },
  { key: 'progressLabel', label: 'Progress', type: 'text' },
  { key: 'targetEndDate', label: 'Target End', type: 'date' },
];
