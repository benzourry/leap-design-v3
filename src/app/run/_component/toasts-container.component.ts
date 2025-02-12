import {Component, TemplateRef} from '@angular/core';
// import { ToastService } from '../service/toast-service';
import { NgTemplateOutlet } from '@angular/common';
import { NgbToast } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../_shared/service/toast-service';



@Component({
    selector: 'app-toasts',
    template: `
@for (toast of toastService.toasts; track $index) {
  <ngb-toast
    [class]="toast.classname" class="mx-auto"
    [autohide]="true"
    [delay]="toast.delay || 4000"
    (hidden)="toastService.remove(toast)"    
    (click)="toastService.remove(toast)">
    @if (isTemplate(toast)) {
      <ng-template [ngTemplateOutlet]="toast.textOrTpl"></ng-template>
    } @else {
      <div [innerHtml]="toast.textOrTpl"></div>
    }
  </ngb-toast>
}
`,
    host: { '[class.ngb-toasts]': 'true' },
    imports: [NgbToast, NgTemplateOutlet]
})
export class ToastsContainer {
  constructor(public toastService: ToastService) {}

  isTemplate(toast) { return toast.textOrTpl instanceof TemplateRef; }
}