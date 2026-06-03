import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ClientDto,
  ClientServiceRequestSummaryDto,
  UpdateClientProfileDto,
} from 'app/core/models/clients/client.models';
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
  recentRequests: ClientServiceRequestSummaryDto[] = [];
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
          this.loadRecentRequests();
          return;
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Failed to load profile.');
      },
    });
  }

  private loadRecentRequests(): void {
    this.clientsService.getProfileRecentRequests(5).subscribe({
      next: res => {
        this.recentRequests = res.data ?? [];
        this.loading = false;
      },
      error: err => {
        this.recentRequests = [];
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Failed to load recent requests.');
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
    });
  }
}
