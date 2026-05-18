import { HttpClient } from '@angular/common/http';
import { Component, Input, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-country-flag',
  standalone: false,
  templateUrl: './country-flag.component.html',
  styleUrl: './country-flag.component.scss'
})
export class CountryFlagComponent {
  @Input() countryCode = 'gb';
  svgContent: SafeHtml | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countryCode']) {
      const path = `assets/flags/${this.countryCode}.svg`;
      this.http.get(path, { responseType: 'text' }).subscribe(svg => {
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svg);
      });
    }
  }

}
