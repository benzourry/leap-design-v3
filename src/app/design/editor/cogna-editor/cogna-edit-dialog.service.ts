import { Injectable, Injector, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { br2nl, nl2br } from '../../../_shared/utils';
import { COGNA_DIALOG_DATA, CognaDialogData, CognaEditData, CognaEditDialogComponent } from './cogna-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class CognaEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(data: CognaDialogData): Promise<CognaEditData> {
    data.cogna.content = br2nl(data.cogna.content);
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector, providers: [{ provide: COGNA_DIALOG_DATA, useValue: data }]
    });
    return this.modalService.open(CognaEditDialogComponent, { backdrop: 'static', injector }).result
      .then((cogna: CognaEditData) => {
        cogna.content = nl2br(cogna.content);
        return cogna;
      });
  }
}
