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
    selector: 'app-restore-manager',
    templateUrl: './restore-manager.component.html',
    styleUrls: ['./restore-manager.component.scss'],
    imports: [FaIconComponent, FormsModule, DatePipe]
})
export class RestoreManagerComponent implements OnInit {

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
          this.getRestorePointList();
        });
    })
  }

  loading:boolean;
  editRestorePointData: any;
  editRestorePoint(content) {
    this.editRestorePointData = {includeApp:true,includeUsers:true,includeEntry:true};
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.loading=true;
        this.appService.createRestorePoint(this.appId,this.editRestorePointData, this.user.email)
        .subscribe({
          next:(res)=>{
            this.getRestorePointList();
            this.toastService.show("Restore Point successfully created", { classname: 'bg-success text-light' });
            this.loading=false;
          },
          error:(err)=>{
            this.toastService.show("Restore Point creation failed", { classname: 'bg-danger text-light' });
            this.loading=false;
          }
        })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  goRestorePointData: any;
  goRestorePoint(content, data) {
    this.goRestorePointData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.goRestorePoint(res.id, res.clear?true:false)
        .subscribe({
          next:(res)=>{
            this.getRestorePointList();
            this.toastService.show("Restore Point successfully restored", { classname: 'bg-success text-light' });
            window.location.reload();
          },
          error:(err)=>{
            this.toastService.show("Restore Point restoration failed", { classname: 'bg-danger text-light' });
          }
        })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  removeRestorePointData: any;
  removeRestorePoint(content, data) {
    this.removeRestorePointData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.removeRestorePoint(res.id)
        .subscribe({
          next:(res)=>{
            this.getRestorePointList();
            this.toastService.show("Restore Point successfully removed", { classname: 'bg-success text-light' });
          },
          error:(err)=>{
            this.toastService.show("Restore Point removal failed", { classname: 'bg-danger text-light' });
          }
        })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  restorePointList:any;
  getRestorePointList(){
    this.appService.getRestorePointList(this.appId, this.user.email)
    .subscribe(res=>{
      this.restorePointList = res.content;
    })
  }

}
