import { inject, Injectable, Injector } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { br2nl, nl2br } from '../../../_shared/utils';
import { LAMBDA_DIALOG_DATA, LambdaEditData, LambdaEditDialogComponent } from './lambda-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class LambdaEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(appId: number, userEmail: string, data: LambdaEditData): Promise<LambdaEditData> {
    data.content = br2nl(data.content);
    data.email = data.email || userEmail;
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector,
      providers: [{ provide: LAMBDA_DIALOG_DATA, useValue: { appId, data, initialCode: data.code || '' } }]
    });
    const modal = this.modalService.open(LambdaEditDialogComponent, { backdrop: 'static', injector });
    return modal.result.then((result: LambdaEditData) => {
      result.content = nl2br(result.content);
      return result;
    });
  }
}
