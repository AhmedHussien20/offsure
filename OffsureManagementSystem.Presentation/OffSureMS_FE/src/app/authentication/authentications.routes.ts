import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forget-password/forget-password.component';
import { DomainGuard } from 'app/core/auth/domain.guard';

export const admin: Routes = [
  {
    path: 'login',
    canActivate: [DomainGuard],
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forget-password/forget-password.component').then(
        m => m.ForgotPasswordComponent
      ),
  },
  // Backwards-compatible redirects (old route names)
  { path: 'verify-code', redirectTo: 'login' },
  { path: 'reset-password', redirectTo: 'change-password-first-login' },

  {
    path: 'forbidden',
    loadComponent: () =>
      import('../components/pages/warning-message/warning-message.component').then(
        m => m.WarningMessageComponent
      ),

  },
  { path: '**', redirectTo: 'login' },
  
];

@NgModule({
  imports: [RouterModule.forChild(admin)],
  exports: [RouterModule],
})
export class authenticationsRoutingModule {
  static routes = admin;
}