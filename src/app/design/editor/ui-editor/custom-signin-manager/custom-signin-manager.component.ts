import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NgbModal, NgbNav, NgbNavItem, NgbNavLink, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { AppService } from '../../../../service/app.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { UserService } from '../../../../_shared/service/user.service';
import { LambdaService } from '../../../../service/lambda.service'; // Added LambdaService
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
import { base } from '../../../../_shared/constant.service';

@Component({
    selector: 'app-custom-signin-manager',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './custom-signin-manager.component.html',
    styleUrls: ['./custom-signin-manager.component.scss'],
    imports: [
      FaIconComponent, 
      FormsModule,
      NgbNav, 
      NgbNavItem, 
      NgbNavLink, 
      NgbNavContent, 
      NgbNavOutlet,
      IconPickerComponent,
      IconSplitPipe
    ]
})
export class CustomSigninManagerComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private modalService = inject(NgbModal);
  private appService = inject(AppService);
  private lambdaService = inject(LambdaService); // Injected LambdaService for secrets
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  user: any;
  appId: number;
  providerList: any[] = [];
  secretList: any[] = []; // Stores the available secrets
  
  editProviderData: any = {};
  removeProviderData: any;

  constructor() { }

  ngOnInit(): void {
    this.userService.getCreator().subscribe((user) => {
      this.user = user;

      this.route.parent!.parent!.parent!.params
        .subscribe((params: Params) => {
          this.appId = params['appId'];
          this.getProviderList();
          this.loadSecretList(); // Fetch secrets securely
        });
      this.cdr.detectChanges();
    });
  }

  loadSecretList() {
    this.lambdaService.getSecretList(this.appId).subscribe(res => {
      this.secretList = res;
      this.cdr.detectChanges();
    });
  }

  getProviderList() {
    this.appService.getCustomProviders(this.appId).subscribe(res => {
      this.providerList = res;
      this.cdr.detectChanges();
    });
  }

  editProvider(content: any, data: any) {
    this.editProviderData = data ? JSON.parse(JSON.stringify(data)) : {};
    
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { size: 'lg', backdrop: 'static' })
      .result.then(res => {
        this.appService.saveCustomProvider(this.appId, res).subscribe({
          next: () => {
            this.getProviderList();
            this.toastService.show("Provider successfully saved", { classname: 'bg-success text-light' });
          },
          error: () => {
            this.toastService.show("Failed to save provider", { classname: 'bg-danger text-light' });
          }
        });
      }, () => {
        // Modal dismissed
      });
  }

  removeProvider(content: any, data: any) {
    this.removeProviderData = data;
    
    history.pushState(null, '', window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.removeCustomProvider(res.id).subscribe({
          next: () => {
            this.getProviderList();
            this.toastService.show("Provider successfully removed", { classname: 'bg-success text-light' });
          },
          error: () => {
            this.toastService.show("Failed to remove provider", { classname: 'bg-danger text-light' });
          }
        });
      }, () => {
        // Modal dismissed
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
}