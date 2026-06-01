import { TableColumn } from 'app/shared/components/generic-table/generic-table.component';
import { PROJECT_STATUS_BADGES } from '../client/client.constants';

export const TEAM_PROJECT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Project', type: 'text' },
  { key: 'clientName', label: 'Client', type: 'text' },
  { key: 'myRole', label: 'My Role', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: PROJECT_STATUS_BADGES },
  { key: 'progressLabel', label: 'Progress', type: 'text' },
  { key: 'targetEndDate', label: 'Target End', type: 'date' },
];

export const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
  5: 'Expert+',
};
