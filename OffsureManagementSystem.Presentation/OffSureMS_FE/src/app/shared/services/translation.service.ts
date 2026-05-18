import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { AppStateService } from './app-state.service';
import { AppState } from 'app/store/app.state';
import { Store } from '@ngrx/store';
import { updateMenuTranslations } from 'app/store/nav/nav.actions';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLang = new BehaviorSubject<string>('en');
  private readonly storageKey = 'app-language';

  constructor(
    private translate: TranslateService,
    private appStateService: AppStateService,
    private store: Store<AppState>
  ) {
    this.translate.setDefaultLang('en');
    // Language switcher removed; force English.
    localStorage.removeItem(this.storageKey);
    this.setLanguage('en');
  }

  setLanguage(lang: string) {
    this.translate.use(lang).subscribe(() => {
      localStorage.setItem(this.storageKey, lang);
      this.currentLang.next(lang);
  
      if(lang === 'ar') {
        this.appStateService.updateState({ direction: 'rtl' });
      } else {
        this.appStateService.updateState({ direction: 'ltr' });
      }
  
      // ✅ Ensure translations are fully loaded before dispatching
      this.store.dispatch(updateMenuTranslations());
    });
  }  

  getCurrentLang() {
    return this.currentLang.asObservable();
  }
}
