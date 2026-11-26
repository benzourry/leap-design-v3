import { ChangeDetectionStrategy, Component, Injectable, InjectionToken, Injector, inject } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditMailerComponent } from '../../../_shared/modal/edit-mailer/edit-mailer.component';

export interface MailerEditData {
  content?: string;
  [key: string]: unknown;
}

interface MailerDialogData {
  mailer: MailerEditData;
  forms: unknown[];
}

const MAILER_DIALOG_DATA = new InjectionToken<MailerDialogData>('MAILER_DIALOG_DATA');

@Component({
  selector: 'app-mailer-edit-dialog',
  imports: [EditMailerComponent],
  template: `<app-edit-mailer [editMailerData]="data.mailer" [formList]="data.forms"
    [dismiss]="dismiss" [close]="close"></app-edit-mailer>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailerEditDialogComponent {
  readonly data = inject(MAILER_DIALOG_DATA);
  private readonly modal = inject(NgbActiveModal);
  readonly dismiss = () => this.modal.dismiss();
  readonly close = (data: MailerEditData) => this.modal.close({ ...data });
}

@Injectable({ providedIn: 'root' })
export class MailerEditDialogService {
  private readonly modal = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(mailer: MailerEditData, forms: unknown[]): Promise<MailerEditData> {
    if (!mailer.content) mailer.content = '';
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector,
      providers: [{ provide: MAILER_DIALOG_DATA, useValue: { mailer, forms } }]
    });
    return this.modal.open(MailerEditDialogComponent, { backdrop: 'static', size: 'lg', injector }).result;
  }
}
