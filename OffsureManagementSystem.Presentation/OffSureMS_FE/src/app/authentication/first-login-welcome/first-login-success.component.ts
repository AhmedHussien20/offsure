import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-first-login-success',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './first-login-success.component.html',
  styleUrls: ['./first-login-success.component.scss']
})
export class FirstLoginSuccessComponent implements OnInit, OnDestroy {

  countdown = 5;
  progressPercent = 100;

  private timer: any;
  private readonly TOTAL_SECONDS = 5;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  startCountdown(): void {
    this.timer = setInterval(() => {
      this.countdown--;
      this.progressPercent = (this.countdown / this.TOTAL_SECONDS) * 100;

      if (this.countdown <= 0) {
        this.goToLogin();
      }
    }, 1000);
  }

  goToLogin(): void {
    clearInterval(this.timer);
    this.router.navigate(['/auth/login']);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
