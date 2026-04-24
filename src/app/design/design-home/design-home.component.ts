// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { Component, signal, computed, ChangeDetectionStrategy, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../_shared/service/user.service';
import { AppService } from '../../service/app.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgTemplateOutlet, PlatformLocation } from '@angular/common';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';

@Component({
  selector: 'app-design-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './design-home.component.html',
  styleUrls: ['../../../assets/css/tile.css', './design-home.component.css'],
  imports: [RouterLink, RouterLinkActive, FaIconComponent, FormsModule, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, AppEditComponent, NgTemplateOutlet]
})
export class DesignHomeComponent implements OnInit {

  private userService = inject(UserService);
  private appService = inject(AppService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  private destroyRef = inject(DestroyRef); // Inject for proper cleanup

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
  }

  ngOnInit() {
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(online => this.offline.set(!online));

    this.userService.getCreator()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
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

    this.appService.getAppByStatusList(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

    this.appService.getAppMyList(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  editItem(tpl: any, data: any, isNew: boolean) {
    this.editItemData.set(data);
    if (data.id) {
      this.appService.getApp(data.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: app => {
            this.editItemData.set(app);
            this._editApp(tpl, app, isNew);
          }, error: err => {}
        })
    } else {
      this._editApp(tpl, data, isNew);
    }
  }

  private _editApp(tpl: any, app: any, isNew: boolean): void {
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' }).result.then(
      (rItem) => {
        this.appService.save(rItem, this.user()?.email)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.getItemList(this.pageNumber());
              this.getTplList(this.pageNumberTpl());
              if (isNew) {
                this.router.navigate([`design/${res.id}`]);
              }
              this.toastService.show('App properties saved successfully', { classname: 'bg-success text-light' });
            },
            error: (err) => {
              this.toastService.show(`App properties saved failure<br/>${err.error?.message}`, {
                classname: 'bg-danger text-light',
              });
            },
          });
      },
      () => { }
    );
  }

  cloneItem(tpl: any, data: any, isNew: boolean): void {
    this.appService.getApp(data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (app) => {
          app.status = 'local';
          delete app.appPath;

          // Perform logic BEFORE setting signal to preserve reactivity rules
          if (!this.user()?.email.includes('@unimas.my')) {
            app.useUnimas = false;
          }
          this.editItemData.set(app);

          history.pushState(null, null, window.location.href);
          this.modalService.open(tpl, { backdrop: 'static' }).result.then(
            (rItem) => {
              delete rItem.navis;
              this.appService.clone(rItem, this.user()?.email)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: (res) => {
                    this.getItemList(this.pageNumber());
                    if (isNew) {
                      this.router.navigate([`design/${res.id}`]);
                    }
                    this.toastService.show('App cloned successfully', { classname: 'bg-success text-light' });
                  },
                  error: () => {
                    this.toastService.show('App cloned failure', { classname: 'bg-danger text-light' });
                  },
                });
            },
            () => { }
          );
        },
        error: () => {
          this.toastService.show('App cloned failed', { classname: 'bg-danger text-light' });
        },
      });
  }

  removeItem(content: any, data: any): void {
    this.removeItemData.set(data);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' }).result.then(
      () => {
        // Modal closed
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
      this.appService.remove(data, this.user()?.email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.getItemList(this.pageNumber());
            this.toastService.show('App removed successfully', { classname: 'bg-success text-light' });
            this.removing.set(false);
            callback();
          },
          error: () => {
            this.toastService.show('App removal failed', { classname: 'bg-danger text-light' });
            this.removing.set(false);
          },
        });
    } else {
      this.toastService.show('Invalid removal confirmation key', { classname: 'bg-danger text-light' });
    }
  }

}