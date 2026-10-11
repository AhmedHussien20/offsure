import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { CreateTeamDto, TeamDto } from 'app/core/models/teams/team.models';

export const ADMIN_TEAM_FORM_CONFIG: FormFieldConfig[] = [
  { type: 'input', inputType: 'text', name: 'name', label: 'Team Name', validations: { required: true } },
  { type: 'textarea', name: 'description', label: 'Description (one line shown on the team card)' },
  { type: 'input', inputType: 'number', name: 'displayOrder', label: 'Display Order (lower shows first)' },
  { type: 'checkbox', name: 'isActive', label: 'Show in Offshore TechX' },
];

export function buildAdminTeamForm(fb: FormBuilder, team?: TeamDto | null): FormGroup {
  return fb.group({
    name: [team?.name ?? '', Validators.required],
    description: [team?.description ?? ''],
    displayOrder: [team?.displayOrder ?? 0],
    isActive: [team?.isActive ?? true],
  });
}

export function adminTeamFormValue(form: FormGroup): CreateTeamDto {
  const raw = form.getRawValue();
  return {
    name: String(raw.name).trim(),
    description: raw.description ? String(raw.description).trim() : undefined,
    displayOrder: Number(raw.displayOrder) || 0,
    isActive: !!raw.isActive,
  };
}
