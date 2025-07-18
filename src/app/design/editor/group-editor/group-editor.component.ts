import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
import { GroupService } from '../../../service/group.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbInputDatepicker, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, DatePipe, KeyValuePipe, JsonPipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
// import { RunService } from '../../../service/run.service';
import { splitAsList, isValue } from '../../../_shared/utils';
// import { LookupService } from '../../../service/lookup.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { EditRoleComponent } from '../../../_shared/modal/edit-role/edit-role.component';
import { LookupService } from '../../../run/_service/lookup.service';
import { RunService } from '../../../run/_service/run.service';

@Component({
    selector: 'app-group-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './group-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './group-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, JsonPipe, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgClass, NgbInputDatepicker, NgSelectModule, AngularEditorModule, FilterPipe, DatePipe, KeyValuePipe,
        EditRoleComponent]
})
export class GroupEditorComponent implements OnInit {

  offline = false;
  app: any;

  groupTotal = signal<number>(0);
  loading = signal<boolean>(false);
  groupList = signal<any[]>([]);
  // groupEntryTotal: any;
  // groupEntryList: any;
  // totalItems: any;
  group: any;
  itemLoading = signal<boolean>(false);
  appId: number;
  ei: any = {} // hold show/hide extra attributes in list

  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private groupService = inject(GroupService);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private router = inject(Router);
  private runService = inject(RunService);
  private appService = inject(AppService);
  private toastService = inject(ToastService);
  private lookupService = inject(LookupService);
  private utilityService = inject(UtilityService);

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

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

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges(); // <--- Add here if 'user' is used in the template

        this.route.parent.params
          // NOTE: I do not use switchMap here, but subscribe directly
          .subscribe((params: Params) => {
            this.appId = params['appId'];


            if (this.appId) {
              let params = { email: user.email }

              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.detectChanges(); // <--- Add here if 'app' is used in the template
                });
            }

            this.loadGroupList(1);
            this.getLookupList(this.appId);

            this.runService.getMailerList({ appId: this.appId })
              .subscribe(res => {
                this.mailerList = res.content;
                this.cdr.detectChanges(); // <--- Add here if 'mailerList' is used in the template
              })
          });



        this.route.queryParams
          .subscribe((params: Params) => {
            const id = params['id'];
            if (id) {
              this.loadGroup(id);
            }
          })
      });
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
        this.runService.blastUser(this.appId,Array.from(this.selectedUsers.keys()),res)
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


  user: any;
  groupId = '';
  // data = { 'list': [] };
  pageSize = 15;
  // currentPage = 1;
  // itemsPerPage = 15;
  // maxSize = 5;
  // startAt = 0;
  searchText: string = "";
  isValue = isValue;
  isObject =(value) => typeof value === 'object';
  isArray = (value) => Array.isArray(value);

  pageNumber = signal<number>(1);
  // entryPageNumber: number = 1;

  provider: any = {
    unimas: ['fas', 'university'],
    unimasid: ['fas', 'university'],
    icatsid: ['fas', 'university'],
    ssone: ['fas', 'university'],
    google: ['fab', 'google'],
    azuread: ['fab','microsoft'],
    facebook: ['fab', 'facebook-f'],
    github: ['fab', 'github'],
    linkedin: ['fab', 'linkedin'],
    local: ['far', 'envelope'],
    undetermine: ['fas', 'question']
  }

  providerList: any[] = [
    {id: 'unimas', name:"UNIMAS Identity (Old)"},
    {id: 'unimasid', name:"UNIMAS ID"},
    {id: 'icatsid', name:"ICATS Identity"},
    {id: 'ssone', name:"ssOne"},
    {id: 'google', name:"Google"},
    {id: 'azuread', name:"Microsoft"},
    {id: 'facebook', name:"Facebook"},
    {id: 'github', name:"Github"},
    {id: 'linkedin', name:"LinkedIn"},
    {id: 'local', name:"Local Account"},
    {id: 'undetermine', name:"Undetermine"},
  ];

  // this.loadGroupList = loadGroupList;
  loadGroupList(pageNumber) {
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);

    let params = {
      searchText: this.searchText,
      appId: this.appId,
      page: pageNumber - 1,
      size: this.pageSize
    }

    this.groupService.getGroupList(params)
      .subscribe({
        next: (res) => {
          this.groupList.set(res.content);
          this.groupTotal.set(res.page?.totalElements);
          this.itemLoading.set(false);
        }, error: (err) => {
          this.itemLoading.set(false);
        }
      })
  }

  editGroupData: any;
  editGroup(content, group, isNew) {
    this.editGroupData = group;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.groupService.save(this.appId, data)
          .subscribe(res => {
            this.loadGroupList(this.pageNumber());
            this.loadGroup(res.id);
            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
            this.toastService.show("Group successfully saved", { classname: 'bg-success text-light' });
          }, res => {
            this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { })
  }

  removeGroupData: any;
  removeGroup(content, group) {
    this.removeGroupData = group;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.groupService.deleteGroup(group.id, data)
          .subscribe(res => {
            this.loadGroupList(1);
            delete this.group;
            this.cdr.detectChanges(); // <--- Add here if 'group' is used in the template
            this.toastService.show("Group successfully removed", { classname: 'bg-success text-light' });
          }, res => {
            this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { });
  }


  loadGroup(id) {
    if (id == 'all') {
      this.group = null;
      this.groupId = 'all'
      this.getAppUserList(1, {})
    } else {
      this.groupId = id;
      this.groupService.getGroup(id)
        .subscribe(group => {
          this.group = group;
          this.cdr.detectChanges(); // <--- Add here if 'group' is used in the template
          this.getAppUserList(1, {
            group: this.groupId
          })
          if (group.tagDs){
            this.getLookupEntryList(group.tagDs);
          }          
        })
    }

  }

  editAppUserDataFields: any[];
  editAppUserDataFieldsOrphan: any;

  editAppUserData: any;
  editAppUserDataGroup: any[] = [];
  editAppUser(content, user, isNew) {
    this.editAppUserData = user;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        var payload = {
          email: data.email,
          groups: this.editAppUserData.group,
          name: data.name,
          autoReg: true,
          tags: data.tags
        }
        if (data.bulkReg) {
          this.runService.saveAppUserBulk(this.app.id, payload)
            .subscribe(user => {
              this.toastService.show("Users successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber(), this.params);
            })
        } else {
          this.runService.saveAppUser(this.app.id, payload)
            .subscribe(user => {
              this.toastService.show("User successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber(), this.params);
            })
        }

      }, res => { })
  }

  // fieldsExistOrphan = (data) => {
  //   var hhh = Object.assign({}, data);
  //   this.editAppUserDataFields.forEach(el => {
  //     delete hhh[el.key];
  //   });
  //   return hhh;
  // }

  deleteDataRow = (obj, key) => delete obj[key];


  params: any;
  appUserTotal = signal<number>(0);
  appUserPageSize = 45;
  appUserPageNumber: number = 1;
  appUserList = signal<any[]>([]);
  searchTextUsr: string = "";
  numberOfElements = signal<number>(0);
  entryPages = signal<number>(0);
  getAppUserList(pageNumber, params) {
    Object.assign(params, {
      page: pageNumber - 1,
      size: this.appUserPageSize,
      searchText: this.searchTextUsr,
      sort: ['sortOrder,asc','id,asc']
    })
    this.appUserPageNumber = pageNumber;
    // this.lookupId = id;
    this.params = params;
    this.runService.getAppUserList(this.appId, params)
      .subscribe(res => {
        this.appUserList.set(res.content);
        this.appUserTotal.set(res.page?.totalElements);
        this.numberOfElements.set(res.content?.length);
        this.entryPages.set(res.page?.totalPages);
        // this.getappUserList(this.entryPageNumber);
      })

  }

  checkValue(cId, data) {
    return data?.group?.filter(v => v == cId).length > 0;
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

  approveAppUserData: any;
  approveAppUser(content, appUser) {
    this.approveAppUserData = appUser;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        if (data.id){
          this.runService.saveAppUserApproval(data.id, data.status, data)
            .subscribe(res => { });
        }else{
          if (data.user?.id){
            this.runService.saveUserApproval(data.user?.id, data.status)
            .subscribe(res => { });
          }
        }
      }, res => { })
  }

  removeAppUserData: any;
  removeAppUser(content, obj) {
    this.removeAppUserData = obj;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.removeAppUser(data.id, data.user?.id, this.user?.email)
          .subscribe(res => {
            this.toastService.show("User successfully removed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

  getAsList = splitAsList;


  reorderItem(index, op) {
    this.appUserList.set(this.reorder(this.appUserList(), index, op));
    // this.reorder(this.appUserList, index, op);
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
        return { id: val.id, sortOrder: $index + ((this.appUserPageNumber - 1) * this.appUserPageSize) }
      });
    return this.runService.saveUserOrder(list)
      .subscribe(res => {
        return res;
      });
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
    // this.swapPositions(items,index,index+op);
    // setTimeout(() => {
    //   items[index + op].altClass = 'swapEnd';
    //   items[index].altClass = 'swapEnd';
    //   this.cdr.detectChanges();
    // }, 500);
    return items;
  }

  lookupList: any[] = [];
  lookupEntryList: any[] = [];
  getLookupList(appId) {
    // let params = { appId: appId }
    this.lookupService.getFullLookupList({appId})
      .subscribe(res => {
        this.lookupList = res.content;
        this.cdr.detectChanges(); // <--- Add here if 'lookupList' is used in the template
      })

  }

  getLookupEntryList(lookupId){
    this.lookupService.getEntryListFull(lookupId, {})
            .subscribe(response => {
                // this.loading = false;
                // this.lookupEntryTotal = response.page?.totalElements;
                this.lookupEntryList = response.content;
                this.cdr.detectChanges(); // <--- Add here if 'lookupEntryList' is used in the template
            });
  }

  selectedUsers = new Map<number, any>();
  checkSelect(i) {
    return this.selectedUsers.has(i.user?.id);
  }
  toggleSelect(i) {
    // console.log(i);
    if (this.selectedUsers.has(i.user?.id)) {
      // console.log("ada")
      this.selectedUsers.delete(i.user?.id);
    } else {
      // console.log("xda")
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

  editUserData: any;
  editUser(content, obj) {
    this.editUserData = obj.user;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.updateUser(data.id, data)
          .subscribe(res => {
            this.toastService.show("User provider successfully changed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

  bulkRemoveUser(){
    if (prompt("Are you sure you want to remove selected users?\nType 'remove-bulk-users' to proceed")=='remove-bulk-users'){
      // console.log(Array.from(this.selectedUsers.keys()))
      this.runService.bulkRemoveUser(Array.from(this.selectedUsers.keys()))
      .subscribe(res=>{
        this.getAppUserList(1, this.params);
      })
    }
  }
  
  selectedUsersArray:any[];
  changeProviderData: any;
  changeProvider(content) {
    this.selectedUsersArray =  Array.from(this.selectedUsers.values());
    this.changeProviderData = {};
    // this.changeProviderData = obj.user;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.bulkChangeProvider(data.provider, Array.from(this.selectedUsers.keys()))
          .subscribe(res => {
            this.toastService.show("User provider successfully changed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber(), this.params);
          })
      }, res => { });
  }


}
