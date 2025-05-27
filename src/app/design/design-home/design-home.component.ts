// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { HttpClient } from '@angular/common/http';
import { AppService } from '../../service/app.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PlatformLocation, NgStyle, NgClass, JsonPipe } from '@angular/common';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import { SpeechRecognitionService } from '../../_shared/service/speech-recognition.service';

@Component({
    selector: 'app-design-home',
    templateUrl: './design-home.component.html',
    styleUrls: ['../../../assets/css/tile.css', './design-home.component.css'],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, FormsModule, NgStyle, NgClass, NgbPagination, GroupByPipe, JsonPipe,
        NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe, AppEditComponent]
})
export class DesignHomeComponent implements OnInit, OnDestroy {

  bgClassName: string = domainBase.replace(/\./g,'-');
  // @ViewChild('editItemTpl', { static: false }) public editItemTpl: TemplateRef<any>;
  // public editItemTpl = viewChild<TemplateRef<any>>('editItemTpl');  

  groupByPipe = new GroupByPipe();

  offline = false;

  editItemData: any;
  itemList: any[];
  groupedItemList: any[];
  groupFilter:string;
  hideGroupItems: any={};
  itemTotal: number;
  itemLoading: boolean;
  // sharedList: any[];
  // sharedTotal: number;
  // sharedLoading: boolean;
  // pageSizeShared: number = 8;
  tplList: any[];
  tplTotal: number;
  tplLoading: boolean;
  user: any;
  searchText: string = "";
  pageSize: number = 24;
  pageNumber: number = 1;
  pageSizeTpl: number = 7;
  pageNumberTpl: number = 1;
  pageNumberShared: number = 1;
  baseApi: string = baseApi;
  themes: any[] = [
    { name: "BarBlue", color: "#0747a6" },
    { name: "Dark", color: "#212529" },
    { name: "Blue", color: "#0069d9" },
    { name: "Blue", color: "#2196F3" },
    { name: "Teal", color: "#009688" },
    { name: "Purple", color: "#673AB7" },
    { name: "Orange", color: "#F44336" },
    { name: "Orange", color: "#FF5722" },
    { name: "Indigo", color: "#3F51B5" },
  ]
  // initialAppPath: string="";
  constructor(private userService: UserService,
    private appService: AppService,
    private router: Router,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private toastService: ToastService,

    // private speechRecognitionService: SpeechRecognitionService,
    private utilityService: UtilityService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  file: any;

  ngOnInit() {
    // alert("in design");
    this.userService.getCreator()
      .subscribe(user => {
        this.user = user;
        this.getItemList(1);
        // this.getSharedList(1);
        this.getTplList(1);
      })
  }

  ngOnDestroy() {
    // this.speechRecognitionService.DestroySpeechObject();
  }

  speechData: string;
  showSearchButton: boolean = true;

  getTplList(pageNumber) {
    this.tplLoading = true;
    let params = {
      size: this.pageSizeTpl,
      page: pageNumber - 1,
      searchText: this.searchText,
      status: 'template'
    }

    this.appService.getAppByStatusList(params)
      .subscribe({
        next: res => {
          this.tplTotal = res.page?.totalElements;
          this.tplList = res.content;
          this.tplLoading = false;
        }, error: err => {
          this.tplLoading = false;
        }
      });
  }

  appStatusFilter:string='all';
  getItemList(pageNumber) {
    this.itemLoading = true;
    let params:any = {
      size: this.pageSize,
      page: pageNumber - 1,
      searchText: this.searchText,
      email: this.user.email,
      sort: ['group.name,desc','id,desc']
    }
    if (this.appStatusFilter!='all'){
      params.live = this.appStatusFilter
    }

    this.appService.getAppMyList(params)
      .subscribe({
        next: res => {
          this.itemTotal = res.page?.totalElements;
          this.itemList = res.content;

          this.groupedItemList = this.groupByPipe.transform(this.itemList,        'group.name');

          this.itemLoading = false;
        }, error: err => {
          this.itemLoading = false;
        }
      });
  }

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
            this.getTplList(this.pageNumberTpl);
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

}
