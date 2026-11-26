import { ChangeDetectionStrategy, Component, inject, InjectionToken } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface SignaEditData {
  id?: number;
  name?: string;
  reason?: string;
  location?: string;
  dn?: string;
  password?: string;
  showStamp?: boolean;
  stampLlx?: number;
  stampLly?: number;
  stampUrx?: number;
  stampUry?: number;
  hashAlg?: string;
  keyAlg?: string;
  keystoreType?: string;
  email?: string;
  content?: string;
}

export const SIGNA_DIALOG_DATA = new InjectionToken<SignaEditData>('SIGNA_DIALOG_DATA');

@Component({
  selector: 'app-signa-edit-dialog',
  templateUrl: './signa-edit-dialog.component.html',
  imports: [FormsModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignaEditDialogComponent {
  readonly editSignaData = inject(SIGNA_DIALOG_DATA);
  readonly activeModal = inject(NgbActiveModal);
  readonly hashAlgList = ['SHA256', 'SHA384', 'SHA512'];
  readonly keyAlgList = ['RSA', 'ECDSA'];
  readonly ksTypeList = ['JKS', 'PKCS12', 'BKS'];
}
