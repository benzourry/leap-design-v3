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

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../_shared/service/user.service';
import { AppService } from '../../service/app.service';
import { baseApi, domainBase } from '../../_shared/constant.service';
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
    styleUrls: ['../../../assets/css/tile.scss', './repo-home.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive, AppEditComponent, FaIconComponent, FormsModule, NgStyle, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe]
})
export class RepoHomeComponent implements OnInit, OnDestroy {

  offline = signal<boolean>(false);

  editItemData: any;
  buyItemData: any = {};
  activationStatus = signal<any>({});

  itemTotal = signal<number>(0);
  itemLoading = signal<boolean>(false);
  user = signal<any>(null);
  itemList = signal<any[]>([]);
  pageSize = signal<number>(24);
  pageNumber = signal<number>(1);
  searchText = signal<string>("");
  file = signal<any>(null);
  baseApi: string = baseApi;
  topLoading = signal<boolean>(false);
  topList = signal<any[]>([]);
  topTotal = signal<number>(0);
  bgClassName: string = domainBase.replace(/\./g,'-');

  private http = inject(HttpClient);
  private userService = inject(UserService);
  private appService = inject(AppService);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  
  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));
  }

  ngOnInit() {
    this.userService.getCreator()
      .subscribe(user => {
        this.user.set(user);
        this.getItemList(1);
        this.getTopList();
      });
  }

  ngOnDestroy() {
    // this.speechRecognitionService.DestroySpeechObject();
  }

  buyItem(content: any, data: any) {
    this.buyItemData = data;
    history.pushState(null, '', window.location.href);
    this.appService.checkActivate(data.id, this.user()?.email)
      .subscribe(ca => {
        this.activationStatus.update(s => ({ ...s, [data.id]: ca.result }));
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
    this.appService.requestCopy(this.buyItemData.id, this.user()?.email)
      .subscribe(res => {
        this.activationStatus.update(s => ({ ...s, [this.buyItemData.id]: "pending" }));
      })
  }

  cloneItem(tpl: any, data: any, isNew: boolean) {
    this.appService.getApp(data.id)
      .subscribe({
        next: app => {
          app.status = "local";
          delete app.appPath;
          this.editItemData = app;
          if (this.user()?.email.indexOf("@unimas.my") == -1) {
            this.editItemData.useUnimas = false;
          }

          history.pushState(null, '', window.location.href);
          this.modalService.open(tpl, { backdrop: 'static' })
          .result.then(rItem => {
            delete rItem.navis;
            this.appService.clone(rItem, this.user()?.email)
              .subscribe({
                next: res => {
                  this.getItemList(this.pageNumber());
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


  getItemList(pageNumber: number) {
    this.itemLoading.set(true);
    let params = { size: this.pageSize(), page: pageNumber - 1, searchText: this.searchText() };

    this.appService.getAppList(params)
    .subscribe({
      next: res => {
        this.itemList.set(res.content || []);
        this.itemTotal.set(res.page?.totalElements || 0);
        this.itemLoading.set(false);
      },
      error: err => {
        this.itemLoading.set(false);
      }
    })
  }

  getTopList() {
    this.topLoading.set(true);

    this.appService.getTopList()
      .subscribe(res => {
        this.topList.set(res.content || []);
        this.topTotal.set(res.page?.totalElements || 0);
        this.topLoading.set(false);
      }, res => { 
        this.topLoading.set(false);
      })
  }
}