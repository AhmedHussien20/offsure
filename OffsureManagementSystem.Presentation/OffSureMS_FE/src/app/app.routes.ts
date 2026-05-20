import { Route } from '@angular/router';

import { FullLayoutComponent } from './shared/layouts/full-layout/full-layout.component';
import { content } from './shared/routes/full-content.routes';
import { MessageLayoutComponent } from './shared/layouts/message-layout/message-layout.component';
import { Authen_Routes, Home_Routes, Message_Routes } from './shared/routes/content.routes';
import { ContentLayoutComponent } from './shared/layouts/content-layout/content-layout.component';
import { LandingpageLayoutComponent } from './shared/layouts/landingpage-layout/landingpage-layout.component';
import { landing } from './shared/routes/landingpage';
import { AuthGuard } from './core/auth/auth.guard';
import { LandingPageComponent } from './components/landingpage/landing-page/landing-page.component';

export const App_Route: Route[] = [
  { path: '', redirectTo: 'landing-page', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./authentication/authentications.routes').then(m => m.authenticationsRoutingModule)
  },

  {
    path: '',
    component: FullLayoutComponent,
    children: content,
    // canActivate: [AuthGuard]
  },
  {
    path: '',
    component: LandingPageComponent,
    children: Home_Routes
  },
  { path: '', component: MessageLayoutComponent, children: Message_Routes },

  { path: '', component: ContentLayoutComponent, children: Authen_Routes },
  { path: '', component: LandingpageLayoutComponent, children: landing }

];