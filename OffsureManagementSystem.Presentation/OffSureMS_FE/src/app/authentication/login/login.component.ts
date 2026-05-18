import { Component, ElementRef, Inject, OnDestroy, OnInit, NgZone, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService } from 'app/core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationApiService } from 'app/core/services/notification.service';
import { SignalRService } from 'app/core/services/signalr.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    ToastrModule,
    TranslateModule
  ],
  providers: [{ provide: ToastrService, useClass: ToastrService }],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  // ─── UI State ─────────────────────────────────────────────────────────────
  public showPassword = false;

  // ─── Forms ────────────────────────────────────────────────────────────────
  public loginForm!: FormGroup;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public authservice: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private renderer: Renderer2,
    private toastr: ToastrService,
    private translate: TranslateService,
    private notificationService: NotificationApiService,
    private signalRService: SignalRService
  ) {
    this.translate.use('en');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, 'error-1');

    // Unified login form:
    // - normal users enter password
    // - first login users enter OTP in the password box
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  submit(event: Event): void {
    event.preventDefault();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.value;

    this.authservice.login(username, password).subscribe({
      next: (response) => {
        // First-login / forced password change: backend returns otpSessionToken instead of JWT.
        if (response.data?.forcePasswordChange) {
          const token = response.data.otpSessionToken;
          if (!token || !response.data.userId) {
            //this.toastr.error(this.translate.instant('LOGIN.ERROR_INVALID_CREDENTIALS'));
            return;
          }

          localStorage.setItem('otpUserId', String(response.data.userId));
          localStorage.setItem('otpSessionToken', token);
          localStorage.setItem('otpUsernameOrEmail', username);

          this.router.navigate(['/auth/change-password-first-login']);
          return;
        }

        const userId = response.data?.userId || 0;

        this.signalRService.startConnection(userId);

        /*this.notificationService.getUnread().subscribe(res => {
          const unread = res.data || [];
          unread.forEach(n => {
            this.toastr.info(n.message, this.translate.instant('nav.notifications.notification'));
          });
        });*/
        
        this.router.navigate(['/customer/home']);
      }
      
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  toggleVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    const bodyElement = this.renderer.selectRootElement('body', true);
    this.renderer.removeAttribute(bodyElement, 'class');
  }
}
