import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { LightboxModule } from 'ng-gallery/lightbox';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ClientsService } from 'app/core/services/clients.service';
import { ClientDto, UpdateClientProfileDto } from 'app/core/models/clients/client.models';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    SharedModule,
    NgbModule,
    NgSelectModule,
    LightboxModule,
    RouterModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GenericFormComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProfileComponent implements OnInit {
  title = 'PROFILE.PROFILE';
  activeitem = 'PROFILE.PROFILE';
  breadcrumbs = ['MENU.HOME', 'PROFILE.PROFILE'];

  user: any;
  employeeId!: number;
  defaultAvatar = 'assets/images/user.png';

  isClientPortal = false;
  clientProfile: ClientDto | null = null;
  profileForm!: FormGroup;
  profileFormConfig: FormFieldConfig[] = [];
  savingProfile = false;

  constructor(
    private route: ActivatedRoute,
    private clientsService: ClientsService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isClientPortal = this.route.snapshot.data['clientPortal'] === true;

    if (this.isClientPortal) {
      this.title = 'Company Profile';
      this.activeitem = 'Company Profile';
      this.breadcrumbs = ['Client', 'Profile'];
      this.loadClientProfile();
      return;
    }

    const userData = localStorage.getItem('userData');
    if (userData) {
      this.user = JSON.parse(userData);
      this.employeeId = this.user.userId ?? this.user.id;
    }
  }

  get profileImage(): string {
    if (this.user?.profileImage) {
      return this.user.profileImage;
    }
    return this.defaultAvatar;
  }

  get displayName(): string {
    if (this.isClientPortal && this.clientProfile) {
      return this.clientProfile.companyName;
    }
    return this.user?.fullName ?? '';
  }

  get displaySubtitle(): string {
    if (this.isClientPortal && this.clientProfile) {
      return `${this.clientProfile.firstName} ${this.clientProfile.lastName}`.trim();
    }
    return this.user?.title || '';
  }

  onProfileUpdated(): void {
    const userData = localStorage.getItem('userData');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  onClientProfileSubmit(): void {
    if (!this.profileForm || this.profileForm.invalid || this.savingProfile) {
      this.profileForm?.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const dto: UpdateClientProfileDto = {
      companyName: String(raw.companyName).trim(),
      contactPersonPhone: raw.contactPersonPhone?.trim(),
      companyAddress: raw.companyAddress?.trim(),
      city: raw.city?.trim(),
      country: raw.country?.trim(),
      postalCode: raw.postalCode?.trim(),
    };

    this.savingProfile = true;
    this.clientsService.updateProfile(dto).subscribe({
      next: res => {
        this.clientProfile = res.data ?? null;
        this.savingProfile = false;
        this.toastr.success('Company profile updated successfully.');
      },
      error: err => {
        this.savingProfile = false;
        this.toastr.error(err?.error?.message || err?.message || 'Failed to update profile.');
      },
    });
  }

  private loadClientProfile(): void {
    this.clientsService.getProfile().subscribe({
      next: res => {
        this.clientProfile = res.data ?? null;
        if (this.clientProfile) {
          this.buildClientProfileForm(this.clientProfile);
        }
      },
      error: () => {
        this.toastr.error('Failed to load company profile.');
      },
    });
  }

  private buildClientProfileForm(profile: ClientDto): void {
    this.profileForm = this.fb.group({
      companyName: [profile.companyName, Validators.required],
      contactPersonPhone: [profile.contactPersonPhone],
      companyAddress: [profile.companyAddress],
      city: [profile.city],
      country: [profile.country],
      postalCode: [profile.postalCode],
    });

    this.profileFormConfig = [
      { type: 'input', inputType: 'text', name: 'companyName', label: 'Company Name', validations: { required: true } },
      { type: 'input', inputType: 'text', name: 'contactPersonPhone', label: 'Contact Phone' },
      { type: 'input', inputType: 'text', name: 'companyAddress', label: 'Address' },
      { type: 'input', inputType: 'text', name: 'city', label: 'City' },
      { type: 'input', inputType: 'text', name: 'country', label: 'Country' },
      { type: 'input', inputType: 'text', name: 'postalCode', label: 'Postal Code' },
    ];
  }
}
