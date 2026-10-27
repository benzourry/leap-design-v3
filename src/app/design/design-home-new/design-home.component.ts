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

@Component({
  selector: 'app-design-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './design-home.component.html',
  styleUrls: ['../../../assets/css/tile.scss', './design-home.component.css'],
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
  private destroyRef = inject(DestroyRef);

  bgClassName: string = domainBase.replace(/\./g, '-');
  offline = signal<boolean>(false);

  itemList = signal<any[]>([]);
  itemTotal = signal<number>(0);
  itemLoading = signal<boolean>(false);

  user = signal<any>(null);
  searchText = signal<string>('');
  pageSize = signal<number>(999);
  pageNumber = signal<number>(1);

  appStatusFilter = signal<string>('all');
  
  // FOLDER FEATURE SIGNALS
  folders = signal<any[]>([]);
  folderFilter = signal<number | 'ungrouped' | null>(null);
  activeApp = signal<any>(null);
  newFolder = signal<any>({ name: '' });
  savingFolder = signal<boolean>(false);

  // Optimized groupedItemList: Filters data BEFORE returning to prevent DOM flickering
  groupedItemList = computed(() => {
    const apps = this.itemList();
    const flds = this.folders();
    const filter = this.folderFilter();
    let groups: { key: string; value: any[]; id: number | 'ungrouped' }[] = [];
    let assignedAppIds = new Set<number>();

    flds.forEach(f => {
      const folderApps = apps.filter(a => f.apps?.some((fa: any) => fa.id === a.id));
      folderApps.forEach(a => assignedAppIds.add(a.id));
      
      // Only emit the group if we are in "All Apps" view OR if it exactly matches the selected tab
      if (filter === null || filter === f.id) {
        if (folderApps.length > 0 || filter === f.id) {
          groups.push({ key: f.name, value: folderApps, id: f.id });
        }
      }
    });

    const ungroupedApps = apps.filter(a => !assignedAppIds.has(a.id));
    if (filter === null || filter === 'ungrouped') {
      if (ungroupedApps.length > 0 || filter === 'ungrouped') {
        groups.push({ key: 'Ungrouped', value: ungroupedApps, id: 'ungrouped' });
      }
    }

    return groups;
  });

  hideGroupItems = signal<Record<string, boolean>>({});
  removing = signal<boolean>(false);
  editItemData = signal<any>(null);
  removeItemData = signal<any>(null);

  baseApi: string = baseApi;

  constructor() {
    this.location.onPopState(() => {
      if (document.querySelector('.cm-fullscreen-mode')) { return; }
      this.modalService.dismissAll('')
    });
  }

  ngOnInit() {
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(online => this.offline.set(!online));

    this.userService.getCreator()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user.set(user);
        this.loadFolders();
        this.getItemList(1);
      });
  }

  // --- FOLDER LOGIC START ---
  loadFolders() {
    this.appService.getAppFolders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (folders) => this.folders.set(folders || []),
        error: () => this.toastService.show('Failed to load folders', { classname: 'bg-danger text-light' })
      });
  }

  openManageFolders(tpl: any) {
    this.newFolder.set({ name: '' });
    this.modalService.open(tpl, { backdrop: 'static', centered: true });
  }

  createFolder() {
    if (!this.newFolder().name) return;
    this.savingFolder.set(true);
    this.appService.saveAppFolder(this.newFolder())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('Folder created', { classname: 'bg-success text-light' });
          this.newFolder.set({ name: '' });
          this.savingFolder.set(false);
          this.loadFolders();
        },
        error: () => {
          this.savingFolder.set(false);
          this.toastService.show('Failed to create folder', { classname: 'bg-danger text-light' });
        }
      });
  }

  deleteFolder(folderId: number) {
    if (!confirm('Are you sure you want to delete this folder? Your apps will remain safe.')) return;
    this.appService.removeAppFolder(folderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('Folder deleted', { classname: 'bg-success text-light' });
          if(this.folderFilter() === folderId) this.folderFilter.set(null);
          this.loadFolders();
        }
      });
  }

  openOrganizeApp(tpl: any, app: any) {
    this.activeApp.set(app);
    this.modalService.open(tpl, { backdrop: 'static', centered: true });
  }

  isAppInFolder(folder: any, appId: number): boolean {
    return folder.apps?.some((a: any) => a.id === appId) || false;
  }

  toggleAppFolder(folder: any, appId: number, event: any) {
    const isChecked = event.target.checked;
    const action$ = isChecked
      ? this.appService.addAppToFolder(folder.id, appId)
      : this.appService.removeAppFromFolder(folder.id, appId);

    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadFolders(), 
      error: () => this.toastService.show('Update failed', { classname: 'bg-danger text-light' })
    });
  }
  // --- FOLDER LOGIC END ---

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
      sort: ['id,desc'], 
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
      () => { },
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