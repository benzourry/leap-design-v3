import { Injectable, Injector, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { nl2br } from '../../../_shared/utils';
import {
  CONTRACT_DIALOG_DATA, ContractEditDialogComponent, KryptaContract, KryptaWallet,
  WALLET_DIALOG_DATA, WalletDialogData, WalletEditDialogComponent
} from './krypta-edit-dialog.component';

@Injectable({ providedIn: 'root' })
export class KryptaEditDialogService {
  private readonly modalService = inject(NgbModal);
  private readonly injector = inject(Injector);

  openWallet(data: WalletDialogData): Promise<KryptaWallet> {
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector, providers: [{ provide: WALLET_DIALOG_DATA, useValue: data }]
    });
    return this.modalService.open(WalletEditDialogComponent, { backdrop: 'static', injector }).result
      .then((wallet: KryptaWallet) => {
        wallet.content = nl2br(wallet.content);
        return wallet;
      });
  }

  openContract(data: KryptaContract): Promise<KryptaContract> {
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector, providers: [{ provide: CONTRACT_DIALOG_DATA, useValue: data }]
    });
    return this.modalService.open(ContractEditDialogComponent, { backdrop: 'static', size: 'lg', injector }).result;
  }
}
