import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ToastService } from '../../../_shared/service/toast-service';

@Component({
  selector: 'app-editor-id-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  providers: [Clipboard],
  template: `
    <button type="button" class="btn btn-sm bg-body-secondary border text-body-secondary"
      [title]="'Copy ' + kind() + ' ID'" [attr.aria-label]="'Copy ' + kind() + ' ID'" (click)="copyId()">
      #{{ id() }} <fa-icon [icon]="['fas', 'copy']"></fa-icon>
    </button>
  `,
  styles: `button { padding: 0.15rem 0.5rem; font-size: 0.75rem; }`
})
export class EditorIdChipComponent {
  readonly id = input.required<string | number>();
  readonly kind = input.required<string>();
  private readonly clipboard = inject(Clipboard);
  private readonly toastService = inject(ToastService);

  copyId(): void {
    const kind = this.kind();
    const label = kind.charAt(0).toUpperCase() + kind.slice(1);
    if (this.clipboard.copy(String(this.id()))) {
      this.toastService.show(`${label} ID copied to clipboard`, { classname: 'bg-success text-light' });
    } else {
      this.toastService.show(`Failed to copy ${kind} ID`, { classname: 'bg-danger text-light' });
    }
  }
}
