import { Component, ElementRef, Inject, OnDestroy, OnInit, NgZone, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService } from 'app/core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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

  public showPassword = false;
  public loginForm!: FormGroup;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public authservice: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private renderer: Renderer2,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {
    this.translate.use('en');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, 'error-1');

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submit(event: Event): void {
    event.preventDefault();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authservice.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.toastr.error(error.message || 'Login failed');
      }
    });
  }

  toggleVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    const bodyElement = this.renderer.selectRootElement('body', true);
    this.renderer.removeAttribute(bodyElement, 'class');
  }
}
