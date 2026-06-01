import { ProjectStatus } from '../models/projects/project.models';
import { ServiceRequestStatus } from '../models/services/service.models';

/** Backend `ServiceRequestStatus`: Pending=0, InProgress=1, Completed=2, Cancelled=3 */
const SERVICE_REQUEST_BY_NUMBER: Record<number, ServiceRequestStatus> = {
  0: ServiceRequestStatus.Pending,
  1: ServiceRequestStatus.InProgress,
  2: ServiceRequestStatus.Completed,
  3: ServiceRequestStatus.Cancelled,
};

const SERVICE_REQUEST_BY_NAME: Record<string, ServiceRequestStatus> = {
  Pending: ServiceRequestStatus.Pending,
  InProgress: ServiceRequestStatus.InProgress,
  Completed: ServiceRequestStatus.Completed,
  Cancelled: ServiceRequestStatus.Cancelled,
};

/** Backend `ProjectStatus`: Pending=0, InProgress=1, Completed=2, OnHold=3, Cancelled=4 */
const PROJECT_BY_NUMBER: Record<number, ProjectStatus> = {
  0: ProjectStatus.Pending,
  1: ProjectStatus.InProgress,
  2: ProjectStatus.Completed,
  3: ProjectStatus.OnHold,
  4: ProjectStatus.Cancelled,
};

const PROJECT_BY_NAME: Record<string, ProjectStatus> = {
  Pending: ProjectStatus.Pending,
  InProgress: ProjectStatus.InProgress,
  Completed: ProjectStatus.Completed,
  OnHold: ProjectStatus.OnHold,
  Cancelled: ProjectStatus.Cancelled,
};

export function normalizeServiceRequestStatus(value: unknown): ServiceRequestStatus {
  if (value === null || value === undefined) {
    return ServiceRequestStatus.Pending;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return SERVICE_REQUEST_BY_NUMBER[value] ?? ServiceRequestStatus.Pending;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed in SERVICE_REQUEST_BY_NAME) {
      return SERVICE_REQUEST_BY_NAME[trimmed];
    }
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
      return SERVICE_REQUEST_BY_NUMBER[asNum] ?? ServiceRequestStatus.Pending;
    }
  }
  return ServiceRequestStatus.Pending;
}

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  if (value === null || value === undefined) {
    return ProjectStatus.Pending;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return PROJECT_BY_NUMBER[value] ?? ProjectStatus.Pending;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed in PROJECT_BY_NAME) {
      return PROJECT_BY_NAME[trimmed];
    }
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
      return PROJECT_BY_NUMBER[asNum] ?? ProjectStatus.Pending;
    }
  }
  return ProjectStatus.Pending;
}

/** Badge map keys (e.g. `Pending`, `InProgress`). */
export function serviceRequestStatusKey(value: unknown): string {
  return normalizeServiceRequestStatus(value);
}

export function projectStatusKey(value: unknown): string {
  return normalizeProjectStatus(value);
}
