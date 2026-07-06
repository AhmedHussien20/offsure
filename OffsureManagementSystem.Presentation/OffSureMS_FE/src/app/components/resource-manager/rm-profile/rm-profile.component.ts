import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { AccountProfileDto } from 'app/core/models/auth/account.models';
import { AuthService } from 'app/core/services/auth.service';
import { ChangePasswordCardComponent } from 'app/shared/components/change-password-card/change-password-card.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-rm-profile',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    NgbNavModule,
    ChangePasswordCardComponent,
  ],
  templateUrl: './rm-profile.component.html',
  styleUrl: './rm-profile.component.scss',
})
export class RmProfileComponent implements OnInit {
  profile: AccountProfileDto | null = null;
  loading = true;
  saving = false;
  activeTab = 'personal';
  profileForm!: FormGroup;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
    });
    this.loadProfile();
  }

  get initials(): string {
    const first = this.profile?.firstName?.charAt(0) ?? '';
    const last = this.profile?.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'RM';
  }

  get displayName(): string {
    if (!this.profile) {
      return '';
    }
    return `${this.profile.firstName} ${this.profile.lastName}`.trim();
  }

  get roleLabel(): string {
    return this.profile?.role || 'Resource Manager';
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.saving) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    this.saving = true;
    this.authService
      .updateAccountProfile({
        firstName: String(raw.firstName).trim(),
        lastName: String(raw.lastName).trim(),
      })
      .subscribe({
        next: res => {
          this.profile = res.data ?? this.profile;
          this.saving = false;
          this.toastr.success('Profile updated successfully.');
        },
        error: err => {
          this.saving = false;
          },
      });
  }

  private loadProfile(): void {
    this.authService.getAccountProfile().subscribe({
      next: res => {
        this.profile = res.data ?? null;
        if (this.profile) {
          this.profileForm.patchValue({
            firstName: this.profile.firstName,
            lastName: this.profile.lastName,
          });
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        },
    });
  }
}
