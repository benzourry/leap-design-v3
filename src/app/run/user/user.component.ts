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

import { PlatformLocation, NgClass, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, model, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Params } from '@fortawesome/fontawesome-svg-core';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { base } from '../../_shared/constant.service';
import { ToastService } from '../../_shared/service/toast-service';
import { UserService } from '../../_shared/service/user.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { NgSelectModule } from '@ng-select/ng-select';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { PageTitleComponent } from '../_component/page-title.component';
import { RunService } from '../_service/run.service';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./user.component.scss'],
    imports: [PageTitleComponent, FormsModule, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, 
      NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgSelectModule, AngularEditorModule, DatePipe]
})
export class UserComponent implements OnInit {

  private destroyRef = inject(DestroyRef); // Injected for modern memory leak prevention

  offline = signal<boolean>(false);

  loading = signal<boolean>(false);
  appUserTotal = signal<number>(0);  
  numberOfElements = signal<number>(0);
  entryPages = signal<number>(0);
  appUserList = signal<any[]>([]);
  lookup: any;

  user = computed<any>(() => this.runService.$user());
  pageSize = 45;
  currentPage = 1;
  itemsPerPage = 15;
  searchText: string = "";
  base = base;

  pageNumber = signal<number>(1);
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  baseUrl = computed(()=>this.runService.$baseUrl());
  cs: number;

  groupId = model<number>();
  hasGroupId = signal<boolean>(false);
  group:any;

  screen = input<any>();
  hideTitle = input<boolean>();

  private route = inject(ActivatedRoute)
  private modalService = inject(NgbModal)
  public runService = inject(RunService)
  private location = inject(PlatformLocation)
  private utilityService = inject(UtilityService)
  private toastService = inject(ToastService)

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed())
      .subscribe(online => this.offline.set(!online));
  }

  status: string[] = ['pending'];
  groupList = signal<any[]>([]);
  groupMap: any = {};
  provider: any = {
    unimas: ['fas', 'university'],
    unimasid: ['fas', 'university'],
    ssone: ['fas', 'university'],
    icatsid: ['fas', 'university'],
    mydigitalid: ['fas', 'university'],
    sarawakid: ['fas', 'university'],
    google: ['fab', 'google'],
    azuread: ['fab','microsoft'],
    facebook: ['fab', 'facebook-f'],
    github: ['fab', 'github'],
    linkedin: ['fab', 'linkedin'],
    twitter: ['fab', 'twitter'],
    local: ['far', 'envelope'],
    undetermine: ['fas', 'question']
  }

  
  providerList: any[] = [
    {id: 'unimas', name:"UNIMAS Identity (Old)"},
    {id: 'unimasid', name:"UNIMAS ID"},
    {id: 'icatsid', name:"ICATS Identity"},
    {id: 'mydigitalid', name:"MyDigitalID"},
    {id: 'sarawakid', name:"SarawakID"},
    {id: 'ssone', name:"ssOne"},
    {id: 'google', name:"Google"},
    {id: 'azuread', name:"Microsoft"},
    {id: 'facebook', name:"Facebook"},
    {id: 'github', name:"Github"},
    {id: 'linkedin', name:"LinkedIn"},
    {id: 'twitter', name:"Twitter"},
    {id: 'local', name:"Local Account"},
    {id: 'undetermine', name:"Undetermine"},
  ];

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' }
    ],
    uploadWithCredentials: false,
    sanitize: false,
    toolbarPosition: 'bottom',
    toolbarHiddenButtons: [
 [
    'fontName'
  ],
  [
    'customClasses',
    'insertVideo',
    'removeFormat',
    'toggleEditorMode'
  ]
    ]
  };

  mailerList = [];

  lookupEntryList: any[] = [];

  ngOnInit() {
    if (this.groupId()) {
      this.cs = this.groupId();
      this.hasGroupId.set(true);
      this.runService.getGroup(this.groupId())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(res => {
          this.group = res;
          this.getGroupList(this.group);
        });
    } else {
      // Flattened the double-subscription bug using standard if/else logic
      this.route.params
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params: Params) => {
          const groupId = params['groupId'];
          
          if (groupId) {
            this.cs = groupId;
            this.hasGroupId.set(true);
            this.runService.getGroup(groupId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(res => {
                this.group = res;
                this.getGroupList(this.group);
              });
          } else {
            this.runService.getGroupAllList({ appId: this.app()?.id })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(res => {
                this.groupList.set(res);
                this.groupMap = res.reduce((map, obj) => { map[obj.id] = obj; return map }, {});
              });
            this.getPendingList();
          }

          // Independently fetch mailer list whenever params change
          this.runService.getMailerList({ appId: this.app()?.id })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
              this.mailerList = res.content;
            });
        });
    }
  }

  
  loadTemplate(template) {
    this.blastData = template;
  }
  
  blastData: any = {};
  
  blastEmail(tpl, data) {
    this.blastData = data;
    this.selectedUsersArray =  Array.from(this.selectedUsers.values());
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.runService.blastUser(this.app()?.id, Array.from(this.selectedUsers.keys()), res)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res=>{
            this.toastService.show(`Successfully blast mail to ${res.rows} user(s)`, { classname: 'bg-success text-light' });
          },
          error: err=>{
            this.toastService.show(`Email blast failed`, { classname: 'bg-danger text-light' });
          }
        })
      }, res => { });
  }

  getPendingList() {
    this.cs = -1;
    this.group = null;
    this.groupId.set(-1);
    this.userUnauthorized.set(false);
    this.getAppUserList(1, {
      status: ['pending']
    });
  }

  userUnauthorized = signal<boolean>(false);
  getGroupList(group) {
    this.group = group;

    this.status = ['approved'];
    if (group == null) {
      this.userUnauthorized.set(false);
      this.groupId.set(null);
      this.cs = null;
      this.getAppUserList(1, {});
    } else {
      let intercept = this.group?.accessList?.filter(v => Object.keys(this.user().groups).includes(v + ""));
      if (this.group?.accessList?.length > 0 && intercept.length == 0) {
        this.userUnauthorized.set(true);
      } else {
        this.userUnauthorized.set(false);
      }
      this.groupId.set(group.id);
      this.cs = group.id;
      this.getAppUserList(1, {
        group: group.id
      });
    }

  }

  params: any;

  editAppUserData = signal<any>({});
  editAppUserDataGroup: any[] = [];
  editAppUser(content, user, isNew) {
    this.editAppUserData.set(user);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        var payload = {
          email: data.email,
          groups: this.hasGroupId() ? [this.group.id] : this.editAppUserData().group,
          name: data.name,
          autoReg: true,
          tags: data.tags
        }

        if (data.bulkReg) {
          this.runService.saveAppUserBulk(this.app().id, payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(user => {
              this.toastService.show("Users successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber(), this.params);
            })
        } else {
          this.runService.saveAppUser(this.app().id, payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(user => {
              this.toastService.show("User successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber(), this.params);
            })
        }
      }, res => { })
  }


  getAppUserList(pageNumber, params) {
    Object.assign(params, {
      page: pageNumber - 1,
      size: this.pageSize,
      searchText: this.searchText,
      sort: ['sortOrder,asc','id,asc']
    })
    this.pageNumber.set(pageNumber);
    this.params = params;
    this.runService.getAppUserList(this.app()?.id, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.appUserList.set(res.content);
        this.appUserTotal.set(res.page?.totalElements);        
        this.numberOfElements.set(res.content?.length);
        this.entryPages.set(res.page?.totalPages);
      })

  }

  checkValue(cId, data) {
    return data ? data.group?.filter(v => v.id == cId).length > 0 : false;
  }

  toggleValue(cId, data) {
    if (this.checkValue(cId, data)) {
      data.group = data?.group?.filter(v => v != cId);
    } else {
      if (!data.group) {
        data.group = [];
      }
      data.group = data.group.concat([cId]);
    }
  }

  approveAppUserData = signal<any>(null);

  approveAppUser(content, appUser) {
    this.approveAppUserData.set(appUser);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        
        const successHandler = () => {
          this.toastService.show("User status changed", { classname: 'bg-success text-light' });
        };

        if (data.id){
          this.runService.saveAppUserApproval(data.id, data.status, data)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(successHandler);
        } else {
          if (data.user?.id){
            this.runService.saveUserApproval(data.user?.id, data.status)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(successHandler);
          }
        }
      }, res => { })
  }

  removeAppUserData = signal<any>(null);
  removeAppUser(content, obj) {
    this.removeAppUserData.set(obj);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.removeAppUser(data.id, data.user?.id, this.user().email)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.toastService.show("User successfully removed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

  reorderItem(index, op) {
    this.appUserList.set(this.reorder(this.appUserList(),index,op))
    setTimeout(() => {
      this.appUserList.update((currentList) => {
        const updatedList = [...currentList];
        updatedList[index + op].altClass = 'swapEnd';
        updatedList[index].altClass = 'swapEnd';
        return updatedList;
      });
    }, 500);
    this.saveItemOrder();
  }

  saveItemOrder() {
    var list = this.appUserList()
      .map((val, $index) => {
        return { id: val.id, sortOrder: $index  + ((this.pageNumber()-1) * this.pageSize) }
      });
      
    // Execute and clean up internally, rather than returning the Subscription
    this.runService.saveUserOrder(list)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  reorder(items, index, op) {
    items[index + op].altClass = 'swapStart';
    items[index].altClass = 'swapStart';

    items.forEach((i, $index) => {
      i.sortOrder = $index;
    }); // ensure current sortorder using index, to prevent jumping ordering

    var temp = items[index + op];
    var tempSortOrder = items[index + op].sortOrder;
    items[index + op].sortOrder = items[index].sortOrder;
    items[index + op] = items[index];

    items[index].sortOrder = tempSortOrder;
    items[index] = temp;
    
    return items;
  }

  selectedUsers = new Map<number, any>();
  
  checkSelect(i) {
    return this.selectedUsers.has(i.user?.id);
  }
  
  toggleSelect(i) {
    if (this.selectedUsers.has(i.user?.id)) {
      this.selectedUsers.delete(i.user?.id);
    } else {
      this.selectedUsers.set(i.user?.id, i);
    }
  }

  
  checkAllUsers(checked) {
    if (checked) {
      this.appUserList()
        .forEach(e => this.selectedUsers.set(e.user?.id, e));
    } else {
      this.appUserList()
        .forEach(e => this.selectedUsers.delete(e.user?.id));
    }
  }

  editUserData = signal<any>(null);
  editUser(content, obj) {
    this.editUserData.set(obj.user);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.updateUser(data.id, data)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.toastService.show("User provider successfully changed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

  bulkRemoveUser(){
    if (prompt("Are you sure you want to remove selected users?\nType 'remove-bulk-users' to proceed") == 'remove-bulk-users') {
      this.runService.bulkRemoveUser(Array.from(this.selectedUsers.keys()))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(res => {
          this.getAppUserList(1, this.params);
        });
    }
  }
  
  selectedUsersArray:any[];
  changeProviderData: any;
  
  changeProvider(content) {
    this.selectedUsersArray =  Array.from(this.selectedUsers.values());
    this.changeProviderData = {};
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.bulkChangeProvider(data.provider, Array.from(this.selectedUsers.keys()))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.toastService.show("User provider successfully changed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

}