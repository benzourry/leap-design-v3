import { DatePipe, NgClass, NgStyle, PlatformLocation } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../_shared/service/toast-service';
import { UserService } from '../../_shared/service/user.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { RunService } from '../../run/_service/run.service';
import { AppService } from '../../service/app.service';
import { BucketService } from '../../service/bucket.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { base, baseApi, domainBase } from '../../_shared/constant.service';
import { splitAsList } from '../../_shared/utils';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';

@Component({
  selector: 'app-app-list',
  imports: [FaIconComponent, FormsModule, NgStyle, NgClass, NgbPagination,RouterLink, RouterLinkActive,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe, DatePipe,
    AppEditComponent
  ],
  templateUrl: './app-list.component.html',
  styleUrl: './app-list.component.scss'
})
export class AppListComponent implements OnInit {
  offline: boolean;
  user: any;

  appStatusFilter: string = "all";

  baseApi: string = baseApi;
  base: string = base;
  domainBase: string = domainBase;

  bgClassName: string = domainBase.replace(/\./g,'-');

  constructor(private userService: UserService, private route: ActivatedRoute, private bucketService: BucketService,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private router: Router,
    private runService: RunService,
    private appService: AppService,
    private toastService: ToastService,
    private utilityService: UtilityService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  searchText: string = "";
  appId: any;
  itemList: any[]=[];
  itemTotal: number = 0;
  ngOnInit(): void {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        
              this.getItemList(0);

      });
  }


  itemLoading: boolean = false;
  pageSize: number = 24;
  pageNumber: number = 1;

  numberOfElements: number = 0;
  entryPages: number = 0;

  getItemList(pageNumber) {
    this.itemLoading = true;
    let params:any = {
      size: this.pageSize,
      page: pageNumber - 1,
      searchText: this.searchText,
      email: this.user.email,
      sort: 'id,desc'
    }
    if (this.appStatusFilter!='all'){
      params.live = this.appStatusFilter
    }

    this.appService.getSuperList(params)
      .subscribe({
        next: res => {
          this.itemTotal = res.page?.totalElements;
          this.itemList = res.content;
          this.itemLoading = false;          
          this.numberOfElements = res.content?.length;
          this.entryPages = res.page?.totalPages;
        }, error: err => {
          this.itemLoading = false;
        }
      });
  }

  splitAsList = splitAsList

  checkLogin(app, prop){
    return app[prop];
  }

  editItemData: any;
  editItem(tpl,data, isNew) {
    // this.initialAppPath = data.appPath;
    this.editItemData = data;
    if (data.id) {
      this.appService.getApp(data.id)
        .subscribe({
          next: app => {
            this.editItemData = app;
            this._editApp(tpl,app, isNew);
          }, error: err => {

          }
        })
    } else {
      this._editApp(tpl,data, isNew);
    }
  }

  // editAppData:any;
  _editApp(tpl,app, isNew) {


    
    // this.editAppData = app;

    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
    .result.then(rItem => {
      // console.log(rItem);
      this.appService.save(rItem, this.user.email)
        .subscribe({
          next: res => {
            this.getItemList(this.pageNumber);
            if (isNew) {
              this.router.navigate([`design/${res.id}`]);
            }
            this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show("App properties saved failure<br/>"+err.error?.message, { classname: 'bg-danger text-light' });
          }
        })
    }, res => { });

  }


  cloneItem(tpl,data, isNew) {
    // var items = {};
    // this.initialAppPath = data.appPath;
    this.appService.getApp(data.id)
      .subscribe({
        next: app => {
          app.status = "local";
          delete app.appPath;
          this.editItemData = app;
          if (this.user.email.indexOf("@unimas.my") == -1) {
            this.editItemData.useUnimas = false;
          }

          history.pushState(null, null, window.location.href);
          this.modalService.open(tpl, { backdrop: 'static' })
          .result.then(rItem => {
            delete rItem.navis;
            this.appService.clone(rItem, this.user.email)
              .subscribe({
                next: res => {
                  this.getItemList(this.pageNumber);
                  if (isNew) {
                    this.router.navigate([`design/${res.id}`]);
                  }
                  this.toastService.show("App cloned successfully", { classname: 'bg-success text-light' });
                }, error: err => {
                  this.toastService.show("App cloned failure", { classname: 'bg-danger text-light' });
                }
              });
          }, res => { });
      
        }, error: err => {
          this.toastService.show("App cloned failed", { classname: 'bg-danger text-light' });
        }
      });
  }

  removeItemData: any;
  removeItem(content, data) {
    this.removeItemData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(result => {
        if (prompt("Are you sure you want to permanently remove this app?\n Type 'delete " + data.title.toLowerCase() + "' and press OK to proceed") == 'delete ' + data.title.toLowerCase()) {
          this.appService.remove(data, this.user.email)
            .subscribe({
              next: res => {
                this.getItemList(this.pageNumber);
                this.toastService.show("App removed successfully", { classname: 'bg-success text-light' });
              }, error: err => {
                this.toastService.show("App removal failed", { classname: 'bg-danger text-light' });
              }
            });
        } else {
          this.toastService.show("Invalid removal confirmation key", { classname: 'bg-danger text-light' });
        }
      }, res => { });
  }

  getUrl(app) {
    let separator = app?.live?'.':'--dev.';
    let note = app?.live?'':'* Please note that this app is currently in DEV mode';
    let url = app.appPath ? app.appPath + separator + domainBase : domainBase + "/#/run/" + app.id;
    return 'https://'+url;
}




}
