import { Injectable } from '@angular/core';
import { TranslateService, TranslateStore } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TranslationConfigService {
  constructor(private translateService: TranslateService) {
    this.translateService.setDefaultLang('en');
  }
}
