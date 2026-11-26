import { Injectable, Injector, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SIGNA_DIALOG_DATA, SignaEditData, SignaEditDialogComponent } from './signa-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class SignaEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(data: SignaEditData): Promise<SignaEditData> {
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector,
      providers: [{ provide: SIGNA_DIALOG_DATA, useValue: data }]
    });
    return this.modalService.open(SignaEditDialogComponent, { backdrop: 'static', injector }).result;
  }
}
