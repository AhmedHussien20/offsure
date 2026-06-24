export type ClientTeamExperienceBand = '' | '3-5' | '5+' | '10+';

export interface ClientTeamMemberBrowseRequest {
  skillSearch?: string;
  experienceBand?: ClientTeamExperienceBand;
  projectId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface ClientTeamMemberCardDto {
  id: number;
  fullName: string;
  title: string;
  yearsOfExperience: number;
  profilePhotoUrl?: string | null;
  skills: string[];
  projectNames: string[];
}

export interface ClientTeamMemberDetailDto extends ClientTeamMemberCardDto {
  certificates: ClientTeamMemberCertificateDto[];
  experiences: ClientTeamMemberExperienceDto[];
}

export interface ClientTeamMemberCertificateDto {
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string | null;
}

export interface ClientTeamMemberExperienceDto {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string | null;
  description: string;
}

export const CLIENT_TEAM_EXPERIENCE_BANDS: Array<{ value: ClientTeamExperienceBand; label: string }> = [
  { value: '', label: 'All experience' },
  { value: '3-5', label: '3–5 years' },
  { value: '5+', label: '5+ years' },
  { value: '10+', label: '10+ years' },
];
