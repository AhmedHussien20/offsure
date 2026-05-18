import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Required for ToastrModule
import { ToastrModule } from 'ngx-toastr'; // Import ToastrModule

import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core'; // Import TranslateStore
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslationConfigService } from './core/services/translation-config.service';

// Import components

import { authReducer } from './store/auth/auth.reducer';
import { navReducer } from './store/nav/nav.reducer';
import { NavEffects } from './store/nav/nav.effects';
import { AuthEffects } from './store/auth/auth.effects';
import { SharedModule } from './shared/shared.module';
import { LoginComponent } from './authentication/login/login.component';
 

// Factory function for ngx-translate
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
  ],
  imports: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    BrowserModule,
    CommonModule,
    RouterModule.forRoot([]),
    AppRoutingModule,
    SharedModule,
    HttpClientModule,
    FormsModule,
    NgbModule,
    BrowserAnimationsModule, // Required for ToastrModule
    ToastrModule.forRoot(), // ToastrModule added
    StoreModule.forRoot({
      auth: authReducer,
      nav: navReducer, 
    }),
    EffectsModule.forRoot([NavEffects, AuthEffects]),
    TranslateModule.forRoot({
      defaultLanguage: 'ar',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
  providers: [
    TranslationConfigService,
    TranslateService,
    TranslateStore  // Add TranslateStore here
  ],
  // bootstrap: [AppComponent]
})
export class AppModule { }
