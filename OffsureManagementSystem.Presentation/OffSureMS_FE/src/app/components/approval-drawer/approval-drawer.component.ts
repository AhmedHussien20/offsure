import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from 'app/core/services/customer.service';
import { CustomerUserService } from 'app/core/services/customer-user.service';

@Component({
  selector: 'app-approval-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './approval-drawer.component.html',
  styles: [`
    .approval-drawer-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.35);
      z-index: 1040;
    }
    .approval-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 420px; max-width: 95vw;
      background: #fff;
      box-shadow: -4px 0 24px rgba(0,0,0,.12);
      z-index: 1050;
      display: flex; flex-direction: column;
      animation: slideIn .22s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0);    }
    }
    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e9ecef;
      display: flex; align-items: center; justify-content: space-between;
    }
    .drawer-body   { padding: 1.5rem; flex: 1; overflow-y: auto; }
    .drawer-footer { padding: 1rem 1.5rem; border-top: 1px solid #e9ecef; }
    .stage-badge {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .3rem .75rem; border-radius: 20px; font-size: .8rem; font-weight: 500;
    }
  `]
})
export class ApprovalDrawerComponent implements OnInit {

  @Input() type!: 'customer' | 'customer-user';
  @Input() targetId!: number;
  @Input() targetName!: string;
  @Output() closed = new EventEmitter<void>();

  // ── State ──────────────────────────────────────────────────────────────
  action: 'approve' | 'reject' | null = null;
  reason  = '';
  stage   = 1;          // which approval stage: 1 or 2
  loading = false;

  // Stage options — shown as toggle pills
  stageOptions = [
    { value: 1, label: 'Stage 1', icon: 'bi-check2-circle' },
    { value: 2, label: 'Stage 2', icon: 'bi-check2-all' },
  ];

  get entityLabel() {
    return this.type === 'customer' ? 'Customer' : 'Customer User';
  }

  constructor(
    private customerApi: CustomerService,
    private userApi: CustomerUserService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {}

  selectAction(a: 'approve' | 'reject') {
    this.action = a;
    this.reason = '';
  }

  submit() {
    if (this.action === 'reject' && !this.reason.trim()) {
      this.toastr.warning('Please provide a rejection reason.');
      return;
    }

    this.loading = true;

    const api$  = this.type === 'customer' ? this.customerApi : this.userApi;
    const call$ = this.action === 'approve'
      ? (api$ as any).approve(this.targetId, this.stage)
      : (api$ as any).reject(this.targetId, this.reason.trim());

    call$.subscribe({
      next: () => {
        this.toastr.success(
          this.action === 'approve'
            ? `${this.entityLabel} approved successfully.`
            : `${this.entityLabel} rejected.`
        );
        this.loading = false;
        this.closed.emit();
      },
      error: (err: any) => {
        this.loading = false;
      },
    });
  }

  close() { this.closed.emit(); }
}
