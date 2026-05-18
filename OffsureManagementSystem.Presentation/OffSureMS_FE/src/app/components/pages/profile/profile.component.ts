import { Component, ViewEncapsulation } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { LightboxModule } from 'ng-gallery/lightbox';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [SharedModule,
    NgbModule,
    NgSelectModule,
    LightboxModule,RouterModule,
    FormsModule,CommonModule,ReactiveFormsModule,TranslateModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None

})
export class ProfileComponent {
  title = 'PROFILE.PROFILE';
 activeitem = 'PROFILE.PROFILE';
  breadcrumbs = [
    'MENU.HOME',
    'PROFILE.PROFILE',
  ];

  user: any;
  employeeId!: number;
  defaultAvatar = 'assets/images/user.png';


  constructor(
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('userData');
    if (userData) {
      this.user = JSON.parse(userData);
      this.employeeId = this.user.userId;
    }
  }
  get profileImage(): string {
  if (this.user?.profileImage) {
    return this.user.profileImage;
  }

  return this.defaultAvatar;
}

  onProfileUpdated() {
    const userData = localStorage.getItem('userData');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }




}

