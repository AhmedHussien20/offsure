import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './authentication/login/login.component';
import { WarningMessageComponent } from './components/pages/warning-message/warning-message.component';
//import { EmployeeManagementComponent } from './components/employee-management/employee-management.component';
//import { EmployeeFormComponent } from './components/employee-management/employee-form.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  //{ path: 'forbidden', component: WarningMessageComponent },
  { path: '', component: HomeComponent }, 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
