import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
interface DashboardCard {
  title: string;
  value: any;
  svg?: string;
  clickable?: boolean;
  url?: string;
  subtitle?: string;
  percentage?: string;
  percentage1?: string;
  percentageClass?: string;
}

@Component({
  selector: 'spk-dashboard',
  standalone: true, 
  imports: [  CommonModule,                 // ✅ إجباري لـ *ngIf
    TranslateModule],
  templateUrl: './spk-dashboard.component.html',
  styleUrl: './spk-dashboard.component.scss'
})
export class SpkDashboardComponent {
  @Input() card!: any;

  constructor(private sanitizer: DomSanitizer ,    private router: Router) {}

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  sanitizeIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  onClick() {
    if (this.card.clickable && this.card.url) {
      this.router.navigateByUrl(this.card.url);
    }
  }
}

