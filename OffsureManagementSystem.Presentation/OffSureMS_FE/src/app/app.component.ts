import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from './shared/services/app-state.service';
import { Store } from '@ngrx/store';
import * as NavActions from './store/nav/nav.actions';
import { TranslationService } from './shared/services/translation.service';
import { SignalRService } from './core/services/signalr.service';
import { AppScrollService } from './core/services/app-scroll.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Task-Portal';
  constructor(
    private appState: AppStateService,
    private store: Store,
    private translationService: TranslationService,
    private signalR: SignalRService,
    _appScroll: AppScrollService
  ) { }

  ngOnInit(): void {
    const userId = 4
    this.store.dispatch(NavActions.initializeMenu());
    this.appState.updateState();
    // Language + direction are managed by TranslationService (default: en / ltr)
    this.translationService.getCurrentLang().subscribe((lang) => {
      document.documentElement.lang = lang || 'en';
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    });
  }
}
