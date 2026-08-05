/** Shared dropdown options for generic-table list filters. */

export const PROJECT_STATUS_FILTER_OPTIONS = [
  { id: 'Pending', name: 'Pending' },
  { id: 'InProgress', name: 'In Progress' },
  { id: 'Completed', name: 'Completed' },
  { id: 'OnHold', name: 'On Hold' },
  { id: 'Cancelled', name: 'Cancelled' },
];

export const PROJECT_BUDGET_TYPE_FILTER_OPTIONS = [
  { id: 'Total', name: 'Fixed' },
  { id: 'Hourly', name: 'Hourly' },
];

export const SERVICE_REQUEST_STATUS_FILTER_OPTIONS = [
  { id: 'Pending', name: 'Pending' },
  { id: 'PrimaryAccepted', name: 'Accepted' },
  { id: 'AcceptedWithProject', name: 'With project' },
  { id: 'Completed', name: 'Completed' },
  { id: 'Cancelled', name: 'Cancelled' },
];

export const ACTIVE_FILTER_OPTIONS = [
  { id: true, name: 'TABLE.ACTIVE' },
  { id: false, name: 'TABLE.INACTIVE' },
];

export const AVAILABILITY_FILTER_OPTIONS = [
  { id: true, name: 'Available' },
  { id: false, name: 'Unavailable' },
];

export const VISIBILITY_FILTER_OPTIONS = [
  { id: true, name: 'Visible' },
  { id: false, name: 'Hidden' },
];

export const LIST_FILTER_LABELS = {
  searchKey: 'TABLE.SEARCH',
  status: 'Status',
  isActive: 'Active',
  isAvailable: 'Availability',
  resourceManagerId: 'Resource manager',
  isVisible: 'Visible on landing',
  city: 'City',
  country: 'Country',
  serviceCategoryId: 'Category',
  skillCategoryId: 'Category',
  serviceId: 'Service',
  organizationClientId: 'Company',
  accountRole: 'Account role',
} as const;

export const CLIENT_ACCOUNT_ROLE_FILTER_OPTIONS = [
  { id: 1, name: 'Owner' },
  { id: 2, name: 'Member' },
];
