import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AppService } from '../../../../service/app.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { UserService } from '../../../../_shared/service/user.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-key-manager',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './key-manager.component.html',
    styleUrls: ['./key-manager.component.scss'],
    imports: [FaIconComponent, FormsModule, DatePipe]
})
export class KeyManagerComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private modalService = inject(NgbModal);
  private appService = inject(AppService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  user:any;
  appId:number;
  ngOnInit(): void {
    this.userService.getCreator().subscribe((user) => {
      this.user = user;

      this.route.parent.parent.parent.params
        .subscribe((params: Params) => {
          this.appId = params['appId'];
          this.getApiKeyList();
          this.cdr.detectChanges();
        });
    this.cdr.detectChanges();
    })
  }

  loading:boolean;
  generateApiKeyData: any;
  generateApiKey() {
    this.appService.generateApiKey(this.appId)
    .subscribe(res=>{
      this.getApiKeyList();
      this.cdr.detectChanges();
    })
  }

  removeApiKeyData: any;
  removeApiKey(content, data) {
    this.removeApiKeyData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.removeApiKey(res.id)
        .subscribe({
          next:(res)=>{
            this.getApiKeyList();
            this.toastService.show("API Key successfully removed", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          },
          error:(err)=>{
            this.toastService.show("API Key removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  apiKeyList:any;
  getApiKeyList(){
    this.appService.getApiKeyList(this.appId)
    .subscribe(res=>{
      this.apiKeyList = res;
      this.cdr.detectChanges();
    })
  }

}
