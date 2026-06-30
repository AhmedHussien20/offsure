import { TableColumn } from 'app/shared/components/generic-table/generic-table.component';

export const SALES_CLIENT_COLUMNS: TableColumn[] = [
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'contactName', label: 'Contact', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'requestsCount', label: 'Requests', type: 'text' },
  { key: 'accountStatusLabel', label: 'Status', type: 'text' },
];
