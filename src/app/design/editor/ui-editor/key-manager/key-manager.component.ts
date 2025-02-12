import { Component, OnInit } from '@angular/core';
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
    templateUrl: './key-manager.component.html',
    styleUrls: ['./key-manager.component.scss'],
    imports: [FaIconComponent, FormsModule, DatePipe]
})
export class KeyManagerComponent implements OnInit {

  constructor(private route: ActivatedRoute, private userService: UserService,private modalService: NgbModal, private appService: AppService,
    private toastService: ToastService) { }

  user:any;
  appId:number;
  ngOnInit(): void {
    this.userService.getCreator().subscribe((user) => {
      this.user = user;

      this.route.parent.parent.parent.params
        .subscribe((params: Params) => {
          this.appId = params['appId'];
          this.getApiKeyList();
        });
    })
  }

  loading:boolean;
  generateApiKeyData: any;
  generateApiKey() {
    this.appService.generateApiKey(this.appId)
    .subscribe(res=>{
      this.getApiKeyList();
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
          },
          error:(err)=>{
            this.toastService.show("API Key removal failed", { classname: 'bg-danger text-light' });
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
    })
  }

}
