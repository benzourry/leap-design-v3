import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { IconPickerComponent } from '../../component/icon-picker/icon-picker.component';
import { IconSplitPipe } from '../../pipe/icon-split.pipe';
import { LambdaService } from '../../../service/lambda.service';
import { ToastService } from '../../service/toast-service';
import { base } from '../../constant.service';

@Component({
  selector: 'app-edit-custom-provider',
  imports: [
    FormsModule, 
    FaIconComponent, 
    NgbNavModule, 
    IconPickerComponent, 
    IconSplitPipe
  ],
  templateUrl: './edit-custom-provider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCustomProviderComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  lambdaService = inject(LambdaService);
  toastService = inject(ToastService);

  provider = model<any>({});
  _provider: any = {};
  
  appId = input.required<number>();
  close = input<any>();
  dismiss = input<any>();

  secretList: any[] = [];

  ngOnInit() {
    // Clone to prevent mutating original data before save
    this._provider = { ...this.provider() };
    this.loadSecretList();
  }

  loadSecretList() {
    this.lambdaService.getSecretList(this.appId()).subscribe(res => {
      this.secretList = res;
      this.cdr.detectChanges();
    });
  }

  getRedirectUri(registrationId: string): string {
    if (!registrationId) return '';
    return `${base}/login/oauth2/code/${registrationId}`;
  }

  copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastService.show("Redirect URI copied to clipboard!", { classname: 'bg-success text-light' });
      }).catch(err => {
        this.toastService.show("Failed to copy text", { classname: 'bg-danger text-light' });
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.toastService.show("Redirect URI copied to clipboard!", { classname: 'bg-success text-light' });
      } catch (err) {
        this.toastService.show("Failed to copy text", { classname: 'bg-danger text-light' });
      }
      document.body.removeChild(textArea);
    }
  }

  done(data: any) {
    this.provider.set(data);
    this.close()?.(data);
  }
}