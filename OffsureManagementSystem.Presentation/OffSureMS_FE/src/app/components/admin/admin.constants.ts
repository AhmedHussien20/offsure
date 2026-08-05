import { TableColumn } from 'app/shared/components/generic-table/generic-table.component';

export const SERVICE_REQUEST_STATUS_BADGES: Record<string, { text: string; class: string }> = {
  Pending: { text: 'Pending', class: 'bg-warning-transparent' },
  PrimaryAccepted: { text: 'Accepted', class: 'bg-primary-transparent' },
  AcceptedWithProject: { text: 'With project', class: 'bg-info-transparent' },
  Completed: { text: 'Completed', class: 'bg-success-transparent' },
  Cancelled: { text: 'Cancelled', class: 'bg-secondary-transparent' },
  /** Legacy rows before migration */
  InProgress: { text: 'Accepted', class: 'bg-primary-transparent' },
};

export const PROJECT_STATUS_BADGES: Record<string, { text: string; class: string }> = {
  Pending: { text: 'Pending', class: 'bg-warning-transparent' },
  InProgress: { text: 'In Progress', class: 'bg-primary-transparent' },
  Completed: { text: 'Completed', class: 'bg-success-transparent' },
  OnHold: { text: 'On Hold', class: 'bg-info-transparent' },
  Cancelled: { text: 'Cancelled', class: 'bg-secondary-transparent' },
};

export const PROJECT_BUDGET_TYPE_BADGES: Record<string, { text: string; class: string }> = {
  Total: { text: 'Fixed', class: 'bg-primary-transparent' },
  Hourly: { text: 'Hourly', class: 'bg-info-transparent' },
};

export const ADMIN_REQUEST_COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'clientName', label: 'Company', type: 'text' },
  { key: 'clientMemberName', label: 'Member', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: SERVICE_REQUEST_STATUS_BADGES },
  { key: 'requestedDate', label: 'Requested', type: 'date' },
];

export const ADMIN_PROJECT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Project', type: 'text' },
  { key: 'clientName', label: 'Company', type: 'text' },
  { key: 'clientMemberName', label: 'Member', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'budgetType', label: 'Budget type', type: 'badge', badgeMap: PROJECT_BUDGET_TYPE_BADGES },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: PROJECT_STATUS_BADGES },
  { key: 'progressLabel', label: 'Progress', type: 'text' },
];

export const ADMIN_TEAM_COLUMNS: TableColumn[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'resourceManagerName', label: 'Resource manager', type: 'text' },
  { key: 'availabilityLabel', label: 'Availability', type: 'text' },
  { key: 'accountStatusLabel', label: 'Account', type: 'text' },
];

export const RM_TEAM_COLUMNS: TableColumn[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'availabilityLabel', label: 'Availability', type: 'text' },
  { key: 'accountStatusLabel', label: 'Account', type: 'text' },
];

export const ADMIN_RESOURCE_MANAGER_COLUMNS: TableColumn[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'accountStatusLabel', label: 'Account', type: 'text' },
];

export const ADMIN_SALES_USER_COLUMNS: TableColumn[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'accountStatusLabel', label: 'Account', type: 'text' },
];

export const ADMIN_TIMESHEET_ENTRY_COLUMNS: TableColumn[] = [
  { key: 'workDate', label: 'Date', type: 'date' },
  { key: 'teamMemberName', label: 'Resource', type: 'text' },
  { key: 'timeRange', label: 'Time', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'hoursDisplay', label: 'Hours', type: 'text' },
];

export const ADMIN_TIMESHEET_ENTRY_COLUMNS_NO_TIME: TableColumn[] = [
  { key: 'workDate', label: 'Date', type: 'date' },
  { key: 'teamMemberName', label: 'Resource', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'hoursDisplay', label: 'Hours', type: 'text' },
];

export const ADMIN_CLIENT_COLUMNS: TableColumn[] = [
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'requestsCount', label: 'Requests', type: 'text' },
];

export const ADMIN_CLIENT_MEMBER_COLUMNS: TableColumn[] = [
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'fullName', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'accountRoleLabel', label: 'Role', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'accountStatusLabel', label: 'Status', type: 'text' },
  { key: 'requestsCount', label: 'Requests', type: 'text' },
];

export const ADMIN_PORTFOLIO_COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'serviceName', label: 'Service', type: 'text' },
  { key: 'clientName', label: 'Client', type: 'text' },
  { key: 'completedDateLabel', label: 'Completed', type: 'text' },
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

export const ADMIN_SKILL_CATEGORY_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Category', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'skillsCount', label: 'Skills', type: 'text' },
  { key: 'activeLabel', label: 'Active', type: 'text' },
];

export const ADMIN_SKILL_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Skill', type: 'text' },
  { key: 'skillCategoryName', label: 'Category', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'assignedCountLabel', label: 'Team Members', type: 'text' },
  { key: 'activeLabel', label: 'Active', type: 'text' },
];
