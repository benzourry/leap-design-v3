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

import { Component, signal, computed, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { AppService } from '../../service/app.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import { SpeechRecognitionService } from '../../_shared/service/speech-recognition.service';

@Component({
  selector: 'app-design-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './design-home.component.html',
  styleUrls: ['../../../assets/css/tile.css', './design-home.component.css'],
  imports: [RouterLink, RouterLinkActive, FaIconComponent, FormsModule, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, AppEditComponent]
})
export class DesignHomeComponent {

  private userService = inject(UserService);
  private appService = inject(AppService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  // private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);

  bgClassName: string = domainBase.replace(/\./g, '-');
  offline = signal<boolean>(false);

  itemList = signal<any[]>([]);
  groupedItemList = computed(() => new GroupByPipe().transform(this.itemList(), 'group.name'));
  itemTotal = signal<number>(0);
  itemLoading = signal<boolean>(false);

  tplList = signal<any[]>([]);
  tplTotal = signal<number>(0);
  tplLoading = signal<boolean>(false);

  user = signal<any>(null);
  searchText = signal<string>('');
  pageSizeTpl = signal<number>(7);
  pageNumberTpl = signal<number>(1);
  pageSize = signal<number>(24);
  pageNumber = signal<number>(1);


  appStatusFilter = signal<string>('all');
  groupFilter = signal<string | null>(null);
  hideGroupItems = signal<Record<string, boolean>>({});
  removing = signal<boolean>(false);
  editItemData = signal<any>(null);
  removeItemData = signal<any>(null);

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

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));

    this.userService.getCreator().subscribe((user) => {
      this.user.set(user);
      this.getItemList(1);
      this.getTplList(1);
    });
  }

  file: any;

  getTplList(pageNumber: number): void {
    this.tplLoading.set(true);

    const params = {
      size: this.pageSizeTpl(),
      page: pageNumber - 1,
      searchText: this.searchText(),
      status: 'template',
    };

    this.appService.getAppByStatusList(params).subscribe({
      next: (res) => {
        this.tplTotal.set(res.page?.totalElements || 0);
        this.tplList.set(res.content || []);
        this.tplLoading.set(false);
      },
      error: () => {
        this.tplLoading.set(false);
      },
    });
  }

  toggleGroupVisibility(key: string): void {
    const currentState = this.hideGroupItems();
    this.hideGroupItems.set({ ...currentState, [key]: !currentState[key] });
  }
  getItemList(pageNumber: number): void {
    this.itemLoading.set(true);

    const params: any = {
      size: this.pageSize(),
      page: pageNumber - 1,
      searchText: this.searchText(),
      email: this.user()?.email,
      sort: ['group.name,desc', 'id,desc'],
    };

    if (this.appStatusFilter() !== 'all') {
      params.live = this.appStatusFilter();
    }

    this.appService.getAppMyList(params).subscribe({
      next: (res) => {
        this.itemTotal.set(res.page?.totalElements || 0);
        this.itemList.set(res.content || []);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
      },
    });
  }

  editItem(tpl, data, isNew) {
    // this.initialAppPath = data.appPath;
    this.editItemData.set(data);
    if (data.id) {
      // console.log("data with id",data);
      this.appService.getApp(data.id)
        .subscribe({
          next: app => {
            this.editItemData.set(app);
            this._editApp(tpl, app, isNew);
          }, error: err => {

          }
        })
    } else {
      // console.log("data no id");
      this._editApp(tpl, data, isNew);
    }
  }

  private _editApp(tpl: any, app: any, isNew: boolean): void {
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' }).result.then(
      (rItem) => {
        this.appService.save(rItem, this.user()?.email).subscribe({
          next: (res) => {
            this.getItemList(this.pageNumber());
            this.getTplList(this.pageNumberTpl());
            if (isNew) {
              this.router.navigate([`design/${res.id}`]);
            }
            this.toastService.show('App properties saved successfully', { classname: 'bg-success text-light' });
            // this.cdr.detectChanges();
          },
          error: (err) => {
            this.toastService.show(`App properties saved failure<br/>${err.error?.message}`, {
              classname: 'bg-danger text-light',
            });
            // this.cdr.detectChanges();
          },
        });
      },
      () => { }
    );
  }

  cloneItem(tpl: any, data: any, isNew: boolean): void {
    this.appService.getApp(data.id).subscribe({
      next: (app) => {
        app.status = 'local';
        delete app.appPath;

        this.editItemData.set(app);
        if (this.user()?.email.indexOf('@unimas.my') === -1) {
          this.editItemData().useUnimas = false;
        }

        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' }).result.then(
          (rItem) => {
            delete rItem.navis;
            this.appService.clone(rItem, this.user()?.email).subscribe({
              next: (res) => {
                this.getItemList(this.pageNumber());
                if (isNew) {
                  this.router.navigate([`design/${res.id}`]);
                }
                this.toastService.show('App cloned successfully', { classname: 'bg-success text-light' });
                // this.cdr.detectChanges();
              },
              error: () => {
                this.toastService.show('App cloned failure', { classname: 'bg-danger text-light' });
                // this.cdr.detectChanges();
              },
            });
          },
          () => { }
        );
      },
      error: () => {
        this.toastService.show('App cloned failed', { classname: 'bg-danger text-light' });
        // this.cdr.detectChanges();
      },
    });
  }

  removeItem(content: any, data: any): void {
    this.removeItemData.set(data);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' }).result.then(
      () => {
        // this.realRemoveItem(() => {}, data);
      },
      () => { }
    );
  }

  realRemoveItem(callback: () => void, data: any): void {
    if (
      prompt(
        `Are you sure you want to permanently remove this app?\n Type 'delete ${data.title.toLowerCase()}' and press OK to proceed`
      ) === `delete ${data.title.toLowerCase()}`
    ) {
      this.removing.set(true);
      this.appService.remove(data, this.user()?.email).subscribe({
        next: () => {
          this.getItemList(this.pageNumber());
          this.toastService.show('App removed successfully', { classname: 'bg-success text-light' });
          this.removing.set(false);
          callback();
          // this.cdr.detectChanges();
        },
        error: () => {
          this.toastService.show('App removal failed', { classname: 'bg-danger text-light' });
          this.removing.set(false);
          // this.cdr.detectChanges();
        },
      });
    } else {
      this.toastService.show('Invalid removal confirmation key', { classname: 'bg-danger text-light' });
      // this.cdr.detectChanges();
    }
  }

}
