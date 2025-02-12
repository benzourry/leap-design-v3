import { PlatformLocation, NgClass, DatePipe } from '@angular/common';
import { Component, OnInit, effect, input, model } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Params } from '@fortawesome/fontawesome-svg-core';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
// import { RunService } from '../../service/run.service';
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
// import { PageTitleComponent } from '../../_shared/component/page-title.component';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    imports: [PageTitleComponent, FormsModule, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, 
      NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgSelectModule, AngularEditorModule, DatePipe]
})
export class UserComponent implements OnInit {

  offline = false;

  loading: boolean;
  appUserTotal: number;  
  numberOfElements: number;
  entryPages:number;
  appUserList: any;
  totalItems: any;
  lookup: any;
  itemLoading: boolean;

  // appId: number;
  user: any;
  pageSize = 45;
  currentPage = 1;
  itemsPerPage = 15;
  // maxSize = 5;
  // startAt = 0;
  searchText: string = "";
  base = base;

  pageNumber: number = 1;
  entryPageNumber: number = 1;
  app: any;
  // preurl: string = '';
  baseUrl: string = '';
  cs: number;

  groupId = model<number>();
  hasGroupId:boolean;
  group:any;

  // bucketId = input<number>();
  screen = input<any>();
  hideTitle = input<boolean>();

  // appId:number;

  constructor(private userService: UserService, private route: ActivatedRoute,
    private modalService: NgbModal, public runService: RunService,
    private location: PlatformLocation, private utilityService: UtilityService,
    private toastService: ToastService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

    // effect(()=>{
    //   this.app = this.runService.$app();
    //   this.baseUrl = this.runService.$baseUrl();
    // })
  }

  status: string[] = ['pending'];
  groupList: any[];
  groupMap: any = {};
  provider: any = {
    unimas: ['fas', 'university'],
    unimasid: ['fas', 'university'],
    icatsid: ['fas', 'university'],
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
    this.app = this.runService.$app();
    this.baseUrl = this.runService.$baseUrl();

    this.userService.getUser()
      .subscribe((user) => {
        this.user = user;


        if (this.groupId()) {
          console.log("DA groupId()", this.groupId())
          this.cs = this.groupId();
          this.hasGroupId = true;
          this.runService.getGroup(this.groupId())
          .subscribe(res=>{
            this.group = res;
            this.getGroupList(this.group);
          })
        } else {
          this.route.params
            .subscribe((params: Params) => {
              this.route.params
              .subscribe((params: Params) => {
                const groupId = params['groupId'];
                if (groupId) {
                  this.cs = groupId;
                  this.hasGroupId = true;
                  this.runService.getGroup(groupId)
                  .subscribe(res=>{
                    this.group = res;
                    this.getGroupList(this.group);
                  })
                }else{
                  this.runService.getGroupAllList({ appId: this.app?.id })
                  .subscribe(res => {
                    this.groupList = res;
                    this.groupMap = this.groupList.reduce((map, obj) => { map[obj.id] = obj; return map }, {});
                  })
                  this.getPendingList();
                  // this.getAppUserList(1, { status: ['pending'] });
                  // this.cs = -1;
                  // this.groupId.set(-1);
                }
    
                this.runService.getMailerList({ appId: this.app?.id })
                .subscribe(res => {
                  this.mailerList = res.content;
                })

              })
            });
        }

        

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
        this.runService.blastUser(this.app?.id,Array.from(this.selectedUsers.keys()),res)
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
    // this.status = ['pending'];
    this.group = null;
    this.groupId.set(-1);
    this.userUnauthorized = false;
    this.getAppUserList(1, {
      status: ['pending']
    });
  }

  userUnauthorized:boolean;
  getGroupList(group) {
    this.group = group;


    // let groupId = group.id;
    this.status = ['approved'];
    if (group == null) {
      this.userUnauthorized = false;
      // this.group = null;
      this.groupId.set(null);
      this.cs = null;
      this.getAppUserList(1, {});
    } else {
      let intercept = this.group?.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
      if (this.group?.accessList?.length > 0 && intercept.length == 0) {
        // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        this.userUnauthorized = true;
      }else{
        this.userUnauthorized = false;
      }
      this.groupId.set(group.id);
      this.cs = group.id;
      this.getAppUserList(1, {
        group: group.id
      });
    }

  }

  params: any;

  editAppUserData: any;
  editAppUserDataGroup: any[] = [];
  editAppUser(content, user, isNew) {
    this.editAppUserData = user;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        var payload = {
          email: data.email,
          groups: this.hasGroupId?[this.group.id]:this.editAppUserData.group,
          name: data.name,
          autoReg: true,
          tags: data.tags
        }

        if (data.bulkReg) {
          this.runService.saveAppUserBulk(this.app.id, payload)
            .subscribe(user => {
              this.toastService.show("Users successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber, this.params);
            })
        } else {
          this.runService.saveAppUser(this.app.id, payload)
            .subscribe(user => {
              this.toastService.show("User successfully registered", { classname: 'bg-success text-light' });
              this.getAppUserList(this.pageNumber, this.params);
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
    this.pageNumber = pageNumber;
    // this.lookupId = id;
    this.params = params;
    this.runService.getAppUserList(this.app?.id, params)
      .subscribe(res => {
        this.appUserList = res.content;
        this.appUserTotal = res.page?.totalElements;        
        this.numberOfElements = res.content?.length;
        this.entryPages = res.page?.totalPages;
        // this.getappUserList(this.entryPageNumber);
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

  approveAppUserData: any;
  // approveAppUser(content, appUser) {
  //   // console.log(appUser);
  //   this.approveAppUserData = appUser;
  //   history.pushState(null, null, window.location.href);
  //   this.modalService.open(content, { backdrop: 'static' })
  //     .result.then(data => {
  //       this.runService.saveAppUserApproval(data.id, data.status, data)
  //         .subscribe(res => {
  //           this.toastService.show("User status changed", { classname: 'bg-success text-light' });
  //           this.getAppUserList(this.pageNumber, this.params);
  //         });
  //     }, res => { })
  // }

  approveAppUser(content, appUser) {
    this.approveAppUserData = appUser;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        if (data.id){
          this.runService.saveAppUserApproval(data.id, data.status, data)
            .subscribe(res => { 
              this.toastService.show("User status changed", { classname: 'bg-success text-light' });
            });
        }else{
          if (data.user?.id){
            this.runService.saveUserApproval(data.user?.id, data.status)
            .subscribe(res => { 
              this.toastService.show("User status changed", { classname: 'bg-success text-light' });
            });
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
        this.runService.removeAppUser(data.id, data.user?.id, this.user.email)
          .subscribe(res => {
            this.toastService.show("User successfully removed", { classname: 'bg-success text-light' });
            this.getAppUserList(this.pageNumber, this.params);
          })
      }, res => { });
  }

  reorderItem(index, op) {
    this.reorder(this.appUserList, index, op);
    this.saveItemOrder();
  }

  saveItemOrder() {
    var list = this.appUserList
      .map((val, $index) => {
        return { id: val.id, sortOrder: $index  + ((this.pageNumber-1) * this.pageSize) }
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
    setTimeout(() => {
      items[index + op].altClass = 'swapEnd';
      items[index].altClass = 'swapEnd';
    }, 500);
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
      this.appUserList
        .forEach(e => this.selectedUsers.set(e.user?.id, e));
    } else {
      this.appUserList
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
            this.getAppUserList(this.pageNumber, this.params);
          })
      }, res => { });
  }

  bulkRemoveUser(){
    if (prompt("Are you sure you want to remove selected users?\nType 'remove-bulk-users' to proceed")=='remove-bulk-users'){
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
            this.getAppUserList(this.pageNumber, this.params);
          })
      }, res => { });
  }



}
