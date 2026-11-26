import { Injectable, Injector, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { br2nl, nl2br } from '../../../_shared/utils';
import { ENDPOINT_DIALOG_DATA, EndpointEditData, EndpointEditDialogComponent } from './endpoint-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class EndpointEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(appId: number, endpoint: EndpointEditData, endpoints: EndpointEditData[]): Promise<EndpointEditData> {
    endpoint.content = br2nl(endpoint.content);
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector,
      providers: [{ provide: ENDPOINT_DIALOG_DATA, useValue: { appId, endpoint, endpoints } }]
    });
    return this.modalService.open(EndpointEditDialogComponent, { backdrop: 'static', injector }).result
      .then((data: EndpointEditData) => {
        data.content = nl2br(data.content);
        return data;
      });
  }
}
