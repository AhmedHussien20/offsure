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
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export type ProjectBudgetMode = 'sameAsRequest' | 'custom';
export type ProjectBudgetType = 'Total' | 'Hourly';
export type ProjectCustomBudgetType = 'total' | 'hourly';
export type CommissionType = 'Fixed' | 'Percentage';

export enum MilestoneStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

export interface CreateProjectDto {
  /** 0 = create without an existing client request (requires clientId + serviceId). */
  serviceRequestId: number;
  clientId?: number;
  serviceId?: number;
  name: string;
  description?: string;
  startDate?: string;
  targetEndDate?: string;
  budget?: number;
  budgetType?: ProjectBudgetType;
  hourlyRate?: number;
  expectedHours?: number;
  usesMilestones?: boolean;
  milestoneCount?: number;
  salesId?: number | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
}

export interface UpdateProjectSalesAssignmentDto {
  salesId?: number | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
}

export interface SalesProjectSummaryDto {
  id: number;
  name: string;
  description: string;
  clientName: string;
  status: ProjectStatus;
  teamMemberNames: string[];
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  calculatedCommissionAmount?: number | null;
}

export interface UpdateProjectDto {
  name: string;
  description?: string;
  targetEndDate?: string;
  budget?: number;
  budgetType?: ProjectBudgetType;
  hourlyRate?: number;
  expectedHours?: number;
  progress?: number;
  requiredSkillIds?: number[];
  assignTeamBySkill?: boolean;
}

export interface AssignProjectTeamMemberDto {
  teamMemberId: number;
  role?: string;
  skillId?: number;
  hourlyRate?: number;
  allocatedHours?: number;
}

export interface UpdateProjectStatusDto {
  status: ProjectStatus;
}

export interface ProjectAssignmentDto {
  id: number;
  teamMemberId: number;
  resourceManagerId?: number | null;
  teamMemberName: string;
  teamMemberTitle: string;
  role: string;
  skillId?: number | null;
  assignedDate: string;
  hourlyRate: number | null;
  allocatedHours: number | null;
}

export interface UpdateProjectDeliveryDto {
  status: ProjectStatus;
  progress: number;
}

export interface UpdateProjectStaffingModeDto {
  assignTeamBySkill: boolean;
}

export interface ProjectResourceManagerDto {
  userId: number;
  fullName: string;
  email: string;
  hourlyCostRate?: number | null;
}

export interface SetProjectResourceManagersDto {
  resourceManagerUserIds: number[];
}

export interface UpdateProjectRmHourlyCostRateDto {
  hourlyCostRate: number;
}

export interface ProjectMilestoneDto {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  order: number;
  paymentPercentage: number;
  paymentAmount: number;
  startDate?: string | null;
  endDate?: string | null;
  status: MilestoneStatus;
}

export interface UpsertProjectMilestoneItemDto {
  id?: number;
  name: string;
  description?: string;
  order: number;
  paymentPercentage: number;
  startDate?: string;
  endDate?: string;
}

export interface UpsertProjectMilestonesDto {
  milestones: UpsertProjectMilestoneItemDto[];
}

export interface UpdateProjectMilestoneStatusDto {
  status: MilestoneStatus;
}

export interface UpdateProjectRequiredSkillsDto {
  requiredSkillIds: number[];
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
  budgetType?: ProjectBudgetType;
  hourlyRate: number | null;
  expectedHours: number | null;
  progress: number | null;
  requiredSkillIds?: number[];
  resourceManagers?: ProjectResourceManagerDto[];
  teamMembers: ProjectAssignmentDto[];
  usesMilestones?: boolean;
  milestoneCount?: number | null;
  assignTeamBySkill?: boolean;
  milestones?: ProjectMilestoneDto[];
  /** Current RM's cost rate on this hourly project (resource manager portal). */
  myHourlyCostRate?: number | null;
  salesId?: number | null;
  salesPersonName?: string;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  calculatedCommissionAmount?: number | null;
}
