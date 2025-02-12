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
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../_shared/service/user.service';
import { AppService } from '../../service/app.service';
import { baseApi, domainBase } from '../../_shared/constant.service';
// import { SpeechRecognitionService } from 'src/app/_shared/service/speech-recognition.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgStyle, NgClass } from '@angular/common';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ToastService } from '../../_shared/service/toast-service';

@Component({
    selector: 'app-run-home',
    templateUrl: './repo-home.component.html',
    styleUrls: ['../../../assets/css/tile.css', './repo-home.component.css'],
    imports: [RouterLink, RouterLinkActive, AppEditComponent, FaIconComponent, FormsModule, NgStyle, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe]
})
export class RepoHomeComponent implements OnInit, OnDestroy {

  offline = false;

  editItemData: any;

  itemTotal: number;
  itemLoading: boolean;
  user: any;
  itemList: any[];
  pageSize = 24;
  pageNumber = 1;
  searchText = "";
  file: any;
  baseApi: string = baseApi;
  topLoading: boolean;
  topList: any;
  topTotal: any;
  bgClassName: string = domainBase.replace(/\./g,'-');

  constructor(private http: HttpClient, private userService: UserService, private appService: AppService,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private router: Router,
    private toastService: ToastService,
    private utilityService: UtilityService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  ngOnInit() {
    this.userService.getUser()
      .subscribe(user => {
        this.user = user;
        this.getItemList(1);
        this.getTopList();
      });
  }

  ngOnDestroy() {
    // this.speechRecognitionService.DestroySpeechObject();
  }

  buyItemData: any = {};
  activationStatus: any = {};
  buyItem(content, data) {
    this.buyItemData = data;
    history.pushState(null, null, window.location.href);
    this.appService.checkActivate(data.id, this.user.email)
      .subscribe(ca => {
        this.activationStatus[data.id] = ca.result;
      })
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(result => {
        this.appService.activate(data.id, result)
          .subscribe(res => {
            alert(res.result);
          });
      }, res => { });
  }

  requestCopy() {
    this.appService.requestCopy(this.buyItemData.id, this.user.email)
      .subscribe(res => {
        this.activationStatus[this.buyItemData.id] = "pending";
      })
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


  getItemList(pageNumber) {
    this.itemLoading = true;
    let params = { size: this.pageSize, page: pageNumber - 1, searchText: this.searchText };

    this.appService.getAppList(params)
    .subscribe({
      next:res=>{
        this.itemList = res.content;
        this.itemTotal = res.page?.totalElements;
        this.itemLoading = false;
      },
      error:err=>{
        this.itemLoading = false;
      }
    })
  }

  getTopList() {
    this.topLoading = true;

    this.appService.getTopList()
      .subscribe(res => {
        this.topList = res.content;
        this.topTotal = res.page?.totalElements;
        this.topLoading = false;
      }, res => { this.topLoading = false; })
  }


}
