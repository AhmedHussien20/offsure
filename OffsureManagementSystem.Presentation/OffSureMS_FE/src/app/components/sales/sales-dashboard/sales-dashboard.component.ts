import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  template: `
    <app-page-header></app-page-header>
    <div class="row g-3">
      <div class="col-md-4">
        <a routerLink="/sales/team-members" class="card custom-card text-decoration-none h-100">
          <div class="card-body">
            <h5 class="mb-2">Browse Team Members</h5>
            <p class="text-muted mb-0 small">Search active team members by name, skill, and experience.</p>
          </div>
        </a>
      </div>
      <div class="col-md-4">
        <a routerLink="/sales/projects" class="card custom-card text-decoration-none h-100">
          <div class="card-body">
            <h5 class="mb-2">My Projects</h5>
            <p class="text-muted mb-0 small">View projects you are linked to and your commission details.</p>
          </div>
        </a>
      </div>
      <div class="col-md-4">
        <a routerLink="/sales/clients" class="card custom-card text-decoration-none h-100">
          <div class="card-body">
            <h5 class="mb-2">My Clients</h5>
            <p class="text-muted mb-0 small">View clients you created and register new ones.</p>
          </div>
        </a>
      </div>
    </div>
  `,
})
export class SalesDashboardComponent {}
