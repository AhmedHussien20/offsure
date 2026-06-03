import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, RouterOutlet, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { App_Route } from './app.routes';

import { ColorPickerModule, ColorPickerService } from 'ngx-color-picker';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

import { ToastrModule } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';

import { NgCircleProgressModule } from 'ng-circle-progress';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { provideStore } from '@ngrx/store';

import {
    TranslateModule,
    TranslateLoader,
    TranslateService,
    TranslateStore,
    TranslateCompiler,
    TranslateDefaultParser,
    TranslateParser,
    MissingTranslationHandler,
    FakeMissingTranslationHandler,
    USE_DEFAULT_LANG,
    USE_EXTEND,
    DEFAULT_LANGUAGE,
    ISOLATE_TRANSLATE_SERVICE,
} from '@ngx-translate/core';

import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';
import { navReducer } from './store/nav/nav.reducer';
import { authReducer } from './store/auth/auth.reducer';
import { provideEffects } from '@ngrx/effects';
import { NavEffects } from './store/nav/nav.effects';
import { AuthEffects } from './store/auth/auth.effects';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { errorInterceptor } from './core/auth/error_toastre.interceptor';

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
    providers: [

        // ROUTER
        provideRouter(
            App_Route,
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled',
            })
        ),
        RouterOutlet,

        // ANIMATIONS
        provideAnimations(),

        // FIREBASE
        //AngularFireModule.initializeApp(environment.firebase),
        AngularFireAuthModule,
        AngularFireDatabaseModule,
        AngularFirestoreModule,

        // NG-CHARTS
        provideCharts(withDefaultRegisterables()),

        // COLOR PICKER
        ColorPickerModule,
        ColorPickerService,

        // NgSelect
        NgSelectModule,

        // CALENDAR
        importProvidersFrom(
            CalendarModule.forRoot({
                provide: DateAdapter,
                useFactory: adapterFactory,
            })
        ),

        // TOASTR
        importProvidersFrom(
            ToastrModule.forRoot({
                timeOut: 4500,
                closeButton: true,
                progressBar: true,
                progressAnimation: 'decreasing',
                positionClass: 'toast-top-right',
                toastClass: 'ngx-toastr offsure-toast',
                titleClass: 'offsure-toast__title',
                messageClass: 'offsure-toast__message',
                easing: 'ease-in-out',
                easeTime: 300,
                newestOnTop: true,
                preventDuplicates: true,
            })
        ),

        // TRANSLATE
        // TranslateService,
        // TranslateStore,
        // {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient],
        // },
        // { provide: TranslateCompiler, useClass: TranslateDefaultParser },
        // { provide: TranslateParser, useClass: TranslateDefaultParser },
        // { provide: MissingTranslationHandler, useClass: FakeMissingTranslationHandler },
        // { provide: USE_DEFAULT_LANG, useValue: true },
        // { provide: DEFAULT_LANGUAGE, useValue: 'ar' },
        // { provide: ISOLATE_TRANSLATE_SERVICE, useValue: false },
        // { provide: USE_EXTEND, useValue: true },
        importProvidersFrom(
            TranslateModule.forRoot({
                defaultLanguage: 'en',
                loader: {
                    provide: TranslateLoader,
                    useFactory: HttpLoaderFactory,
                    deps: [HttpClient]
                }
            })
        ),

       

        // STORE
        provideStore(),

        // HTTP + INTERCEPTOR
        provideHttpClient(
            withInterceptors([AuthInterceptor, languageInterceptor, errorInterceptor])
        ),
        provideStore({
            nav: navReducer,
            auth: authReducer
        }),
        provideEffects([NavEffects, AuthEffects]),

        // NG CIRCLE PROGRESS
        importProvidersFrom(
            NgCircleProgressModule.forRoot()
        )
    ],
};
