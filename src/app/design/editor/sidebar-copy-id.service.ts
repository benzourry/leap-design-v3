import { Clipboard } from '@angular/cdk/clipboard';
import { inject, Injectable } from '@angular/core';
import { ToastService } from '../../_shared/service/toast-service';

@Injectable({ providedIn: 'root' })
export class SidebarCopyIdService {
  private readonly clipboard = inject(Clipboard);
  private readonly toastService = inject(ToastService);

  copy(event: MouseEvent, id: number) {
    event.preventDefault();
    event.stopPropagation();
    if (this.clipboard.copy(String(id))) {
      this.toastService.show(`Copied ID #${id} to clipboard`, { classname: 'bg-dark text-light', delay: 2000 });
    } else {
      this.toastService.show('Unable to copy ID', { classname: 'bg-danger text-light' });
    }
  }
}
