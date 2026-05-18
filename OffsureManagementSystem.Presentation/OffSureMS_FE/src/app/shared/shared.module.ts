import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// COMPONENTS 
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { TapToTopComponent } from './components/tap-to-top/tap-to-top.component';
import { SidemenuComponent } from './components/sidemenu/sidemenu.component';
import { NotificationSidebarComponent } from './components/notification-sidebar/notification-sidebar.component';
import { FullLayoutComponent } from './layouts/full-layout/full-layout.component';
import { ContentLayoutComponent } from './layouts/content-layout/content-layout.component';
import { MessageLayoutComponent } from './layouts/message-layout/message-layout.component';
import { ErrorLayoutComponent } from './layouts/error-layout/error-layout.component';
import { CustomizerComponent } from './components/customizer/customizer.component';
import { CountryFlagComponent } from "./components/country-flag/country-flag.component";

// DIRECTIVES 
import { FullscreenDirective } from './directives/fullscreen-toggle.directive';
import { HoverEffectSidebarDirective } from './directives/hover-effect-sidebar.directive';
import { ToggleThemeDirective } from './directives/toggle-theme.directive';
import { SidemenuToggleDirective } from './directives/sidemenuToggle';
import { LandingPageSidemenuToggleDirective } from './directives/landingPageSidemenuToggle';

// PLUGINS
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { LandingpageLayoutComponent } from './layouts/landingpage-layout/landingpage-layout.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { NgbdSortableHeader } from './directives/sortable.directive';
import { SimplebarAngularModule } from 'simplebar-angular';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SwitcherComponent } from './components/switcher/switcher.component';
import { SpkNgSelectComponent } from '../@spk/reusable-plugins/spk-ng-select/spk-ng-select.component';
import { TranslateModule } from '@ngx-translate/core';
import { GenericFormFieldComponent } from './components/generic-form-field/generic-form-field.component';
import { GenericFormComponent } from './components/generic-form/generic-form.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';

@NgModule({
  declarations: [ 
    FooterComponent,
    SwitcherComponent,
    HeaderComponent,
    FullscreenDirective,
    TapToTopComponent,
    SidemenuComponent,
    NotificationSidebarComponent,
    FullLayoutComponent,
    ContentLayoutComponent,
    MessageLayoutComponent,
    ErrorLayoutComponent,
    CustomizerComponent,
    HoverEffectSidebarDirective,
    ToggleThemeDirective,
    SidemenuToggleDirective,
    LandingpageLayoutComponent,
    LandingPageSidemenuToggleDirective,
    NgbdSortableHeader,
    CountryFlagComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbModule,
    SimplebarAngularModule,
    ColorPickerModule,
    NgSelectModule,
    FormsModule,
    TranslateModule.forChild(),  // Change to forChild()
    SpkNgSelectComponent,  // Moved here since it's a standalone component
    PageHeaderComponent
  ],
  providers: [],
  exports: [
    TapToTopComponent,
    FooterComponent,
    FullLayoutComponent,
    ContentLayoutComponent,
    LandingPageSidemenuToggleDirective,
    SwitcherComponent,
    TranslateModule,
    SpkNgSelectComponent,  // Add to exports if needed in other modules
    PageHeaderComponent,
    CountryFlagComponent
  ],
})
export class SharedModule { }
