import { Injectable, Injector, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BUCKET_DIALOG_DATA, BucketEditData, BucketEditDialogComponent } from './bucket-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class BucketEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  open(appId: number, bucket: BucketEditData): Promise<BucketEditData> {
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector, providers: [{ provide: BUCKET_DIALOG_DATA, useValue: { appId, bucket } }]
    });
    return this.modalService.open(BucketEditDialogComponent, { backdrop: 'static', injector }).result;
  }
}
