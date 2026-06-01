export enum ProjectStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  OnHold = 'OnHold',
  Cancelled = 'Cancelled',
}

export interface ProjectFilterRequest {
  status?: ProjectStatus;
  serviceRequestId?: number;
  clientId?: number;
  serviceId?: number;
  teamMemberId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateProjectDto {
  serviceRequestId: number;
  name: string;
  description?: string;
  targetEndDate?: string;
  budget?: number;
}

export interface UpdateProjectDto {
  name: string;
  description?: string;
  targetEndDate?: string;
  budget?: number;
  progress?: number;
}

export interface AssignProjectTeamMemberDto {
  teamMemberId: number;
  role?: string;
  hourlyRate?: number;
  allocatedHours?: number;
}

export interface UpdateProjectStatusDto {
  status: ProjectStatus;
}

export interface ProjectAssignmentDto {
  id: number;
  teamMemberId: number;
  teamMemberName: string;
  teamMemberTitle: string;
  role: string;
  assignedDate: string;
  hourlyRate: number | null;
  allocatedHours: number | null;
}

export interface ProjectDto {
  id: number;
  name: string;
  description: string;
  serviceRequestId: number;
  serviceRequestTitle: string;
  clientId: number;
  clientName: string;
  serviceId: number;
  serviceName: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  targetEndDate: string | null;
  budget: number | null;
  progress: number | null;
  teamMembers: ProjectAssignmentDto[];
}
