import { ProjectStatus } from '../models/projects/project.models';

import { ServiceRequestStatus } from '../models/services/service.models';



/** Backend `ServiceRequestStatus`: Pending=0, PrimaryAccepted=1, Completed=2, Cancelled=3, AcceptedWithProject=4 */

const SERVICE_REQUEST_BY_NUMBER: Record<number, ServiceRequestStatus> = {

  0: ServiceRequestStatus.Pending,

  1: ServiceRequestStatus.PrimaryAccepted,

  2: ServiceRequestStatus.Completed,

  3: ServiceRequestStatus.Cancelled,

  4: ServiceRequestStatus.AcceptedWithProject,

};



const SERVICE_REQUEST_BY_NAME: Record<string, ServiceRequestStatus> = {

  Pending: ServiceRequestStatus.Pending,

  PrimaryAccepted: ServiceRequestStatus.PrimaryAccepted,

  AcceptedWithProject: ServiceRequestStatus.AcceptedWithProject,

  Completed: ServiceRequestStatus.Completed,

  Cancelled: ServiceRequestStatus.Cancelled,

  /** Legacy API values */

  InProgress: ServiceRequestStatus.PrimaryAccepted,

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



/** True when the API sent a service-request status name (not a project-only status like OnHold). */
export function isKnownServiceRequestStatusName(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return value.trim() in SERVICE_REQUEST_BY_NAME;
}

/** Badge map keys (e.g. `Pending`, `PrimaryAccepted`). */

export function serviceRequestStatusKey(value: unknown): string {

  const status = normalizeServiceRequestStatus(value);

  if (status === ServiceRequestStatus.PrimaryAccepted) {

    return 'PrimaryAccepted';

  }

  if (status === ServiceRequestStatus.AcceptedWithProject) {

    return 'AcceptedWithProject';

  }

  return status;

}



export function projectStatusKey(value: unknown): string {

  return normalizeProjectStatus(value);

}


