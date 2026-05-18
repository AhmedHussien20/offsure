import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from 'app/core/services/auth.service';

/**
 * Structural directive for permission-based UI.
 * Usage: *appCan="'PERMISSION_KEY'"
 */
@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanDirective {
  private permission: string | null = null;

  constructor(
    private auth: AuthService,
    private tpl: TemplateRef<unknown>,
    private vcr: ViewContainerRef
  ) {}

  @Input()
  set appCan(permission: string | null | undefined) {
    this.permission = permission ? String(permission) : null;
    this.update();
  }

  private update(): void {
    this.vcr.clear();
    if (!this.permission) {
      this.vcr.createEmbeddedView(this.tpl);
      return;
    }
    if (this.auth.hasPermission(this.permission)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}

