import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientDto, UpdateClientProfileDto } from 'app/core/models/clients/client.models';
import { ClientsService } from 'app/core/services/clients.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule, RouterModule],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.scss',
})
export class ClientProfileComponent implements OnInit {
  profile: ClientDto | null = null;
  loading = true;
  saving = false;

  profileForm!: FormGroup;

  constructor(
    private clientsService: ClientsService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      companyName: ['', Validators.required],
      contactPersonPhone: [''],
      companyAddress: [''],
      city: [''],
      country: [''],
      postalCode: [''],
      website: [''],
      description: [''],
    });

    this.loadProfile();
  }

  get initials(): string {
    if (!this.profile?.companyName) {
      return 'CL';
    }
    return this.profile.companyName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  get recentRequests() {
    return (this.profile?.serviceRequests ?? []).slice(0, 5);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.saving) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const dto: UpdateClientProfileDto = {
      companyName: raw.companyName?.trim() || undefined,
      contactPersonPhone: raw.contactPersonPhone?.trim() || undefined,
      companyAddress: raw.companyAddress?.trim() || undefined,
      city: raw.city?.trim() || undefined,
      country: raw.country?.trim() || undefined,
      postalCode: raw.postalCode?.trim() || undefined,
      website: raw.website?.trim() || undefined,
      description: raw.description?.trim() || undefined,
    };

    this.saving = true;
    this.clientsService.updateProfile(dto).subscribe({
      next: res => {
        this.profile = res.data ?? this.profile;
        if (this.profile) {
          this.patchForm(this.profile);
        }
        this.saving = false;
        this.toastr.success('Profile updated successfully.');
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'Failed to update profile.');
      },
    });
  }

  private loadProfile(): void {
    this.clientsService.getProfile().subscribe({
      next: res => {
        this.profile = res.data ?? null;
        if (this.profile) {
          this.patchForm(this.profile);
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Failed to load profile.');
      },
    });
  }

  private patchForm(profile: ClientDto): void {
    this.profileForm.patchValue({
      companyName: profile.companyName ?? '',
      contactPersonPhone: profile.contactPersonPhone ?? '',
      companyAddress: profile.companyAddress ?? '',
      city: profile.city ?? '',
      country: profile.country ?? '',
      postalCode: profile.postalCode ?? '',
      website: profile.website ?? '',
      description: profile.description ?? '',
    });
  }
}
