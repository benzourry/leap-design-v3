import { ChangeDetectionStrategy, Component, inject, InjectionToken } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';

export interface KryptaContract {
  id?: number;
  name?: string;
  description?: string;
  sol?: string;
  enabled?: number;
}

export interface KryptaWallet {
  id?: number;
  name?: string;
  description?: string;
  rpcUrl?: string;
  chainId?: number;
  privateKey?: string;
  email?: string;
  content?: string;
  contract?: KryptaContract | null;
}

export interface WalletDialogData {
  wallet: KryptaWallet;
  contracts: KryptaContract[];
  secrets: { key: string }[];
}

export const WALLET_DIALOG_DATA = new InjectionToken<WalletDialogData>('WALLET_DIALOG_DATA');
export const CONTRACT_DIALOG_DATA = new InjectionToken<KryptaContract>('CONTRACT_DIALOG_DATA');

@Component({
  selector: 'app-wallet-edit-dialog',
  templateUrl: './wallet-edit-dialog.component.html',
  imports: [FormsModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletEditDialogComponent {
  private readonly data = inject(WALLET_DIALOG_DATA);
  readonly editWalletData = this.data.wallet;
  readonly contractList = this.data.contracts;
  readonly secretList = this.data.secrets;
  readonly activeModal = inject(NgbActiveModal);

  compareByIdFn(a: KryptaContract | null, b: KryptaContract | null): boolean {
    return (a && a.id) === (b && b.id);
  }
}

@Component({
  selector: 'app-contract-edit-dialog',
  templateUrl: './contract-edit-dialog.component.html',
  imports: [FormsModule, FaIconComponent, NgCmComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractEditDialogComponent {
  readonly editContractData = inject(CONTRACT_DIALOG_DATA);
  readonly activeModal = inject(NgbActiveModal);
}
