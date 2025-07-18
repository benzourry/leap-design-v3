import { Component, effect, OnInit, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UserService } from '../../../../_shared/service/user.service';
import { MailerService } from '../../../../service/mailer.service';
import { NgbModal, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
// import { ModelService } from '../../../../service/model.service';
// import { LookupService } from '../../../../service/lookup.service';
import { AppService } from '../../../../service/app.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { FormService } from '../../../../service/form.service';
import { DatasetService } from '../../../../service/dataset.service';
import { DashboardService } from '../../../../service/dashboard.service';
import { HttpParams } from '@angular/common/http';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ScreenService } from '../../../../service/screen.service';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import { UtilityService } from '../../../../_shared/service/utility.service';
import { FilterPipe } from '../../../../_shared/pipe/filter.pipe';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { EditRoleComponent } from '../../../../_shared/modal/edit-role/edit-role.component';
import { LookupService } from '../../../../run/_service/lookup.service';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';

@Component({
    selector: 'app-navi',
    templateUrl: './navi.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./navi.component.scss',
        '../../../../../assets/css/element-action.css',
        '../../../../../assets/css/start.css'],
    imports: [CdkDropListGroup, FaIconComponent, NgClass, CdkDropList, CdkDrag, CdkDragHandle, FormsModule, NgSelectModule,
        NgCmComponent, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, IconPickerComponent,
        NgbNavOutlet, FilterPipe, DatePipe, EditRoleComponent, IconSplitPipe]
})
export class NaviComponent implements OnInit {
  naviData: any = {};
  navis: any = [];
  paletteFilter: string = "";

  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private mailerService = inject(MailerService);
  private modalService = inject(NgbModal);
  private lookupService = inject(LookupService);
  private appService = inject(AppService);
  private toastService = inject(ToastService);
  private formService = inject(FormService);
  private groupService = inject(GroupService);
  private datasetService = inject(DatasetService);
  private screenService = inject(ScreenService);
  private commService = inject(CommService);
  private utilityService = inject(UtilityService);
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    this.commService.changeEmitted$.subscribe(data => {
      if (data.value == 'import') {
        this.getNavisAll(this.appId);
        this.getNaviData(this.appId);
      }
    });

    // effect(() => {  
    //   let data = commService.changeEmitted();
    //   if (data?.value == 'import') {
    //     this.getNavisAll(this.appId);
    //     this.getNaviData(this.appId);
    //   }
    // })
  }

  user: any;
  app: any;
  appId: number;
  offline: boolean = false;

  // data: any = {};

  formList: any[];
  datasetList: any[];
  dashboardList: any[];
  lookupList: any[];
  screenList: any[];
  palettes: any[] = [];
  viewAs: string;
  viewAsGroup: any;

  extraAutoCompleteJs: any[] = [];
  
  ngOnInit() {
    this.userService.getCreator().subscribe((user) => {
      this.user = user;
      this.viewAs = user.email;
      this.route.parent.parent.parent.params
        .subscribe((params: Params) => {
          this.appId = params['appId'];

          // mesti number, baruk recognized by ngValue.
          this.paletteAppId = +this.appId;
          this.appService.getApp(this.appId)
            .subscribe(res => {
              this.app = res;
              this.loadPaletteList(this.appId);
              this.getNavisAll(this.appId);
              this.getNaviData(this.appId);
              this.cdr.detectChanges(); // <--- Add here
            })
        });

      this.appService.getAppMyList({
        email: this.user.email,
        size: 999,
        sort: 'id,desc'
      }).subscribe(res => {
        this.otherAppList = res.content;
        this.cdr.detectChanges(); // <--- Add here
      })

      // this.getMailerList();
    });
  }

  initNavi() {
    if (this.navis.length == 0) {
      this.appService.addNaviGroup(this.appId, { title: "Default", items: [], sortOrder:0 })
        .subscribe(naviGroup => {
          this.getNavisAll(this.appId);
        })
    }
  }

  paletteAppId: number;

  showPalette: boolean = true;
  getFormList(appId) {
    this.formService.getListBasic({ appId: appId, size: 9999 })
      .subscribe(res => {
        this.formList = res.content;
        this.formList.forEach(f => {
          var obj = {
            title: f.title,
            type: 'form',
            screenId: f.id,
            icon: 'fas:plus-square'
          }
          this.palettes.push(obj);
          if (f.single) {
            var obj2 = {
              title: 'Edit ' + f.title,
              type: 'form-single',
              screenId: f.id,
              icon: 'fas:edit'
            }
            this.palettes.push(obj2);
            var obj3 = {
              title: 'View ' + f.title,
              type: 'view-single',
              screenId: f.id,
              icon: 'far:file'
            }
            this.palettes.push(obj3);
          }
        })
        this.cdr.detectChanges(); // <--- Add here
      });
  }

  accessList: any[] = [];
  getAccessList(appId) {
    this.groupService.getGroupList({ appId: appId, size: 999 })
      .subscribe(res => {
        this.accessList = res.content;
        this.accessList.forEach(a => {
          var obj = {
            title: 'Manage User: ' + a.name,
            type: 'user',
            screenId: a.id,
            icon: 'fas:users-cog'
          }
          this.palettes.push(obj);
        })
        
        this.palettes.push({
          title: 'Start Tiles',
          type: 'start',
          screenId: undefined,
          icon: 'fas:th'
        });
        this.palettes.push({
          title: 'Manage All User ',
          type: 'user',
          screenId: undefined,
          icon: 'fas:users-cog'
        });
        this.cdr.detectChanges(); // <--- Add here
      });
  }

  datasetIcon = {
    all: 'fas:list',
    user: 'fas:list-ol',
    admin: 'fas:table',
    action: 'fas:check-square'
  }
  getDatasetList(appId) {
    this.datasetService.getDatasetList(appId)
      .subscribe(res => {
        this.datasetList = res;
        this.datasetList.forEach(f => {
          var obj = {
            title: f.title,
            type: 'dataset',
            screenId: f.id,
            icon: this.datasetIcon[f.type]
          }
          this.palettes.push(obj);
        });
        this.cdr.detectChanges(); // <--- Add here
      })
  }

  getDashboardList(appId) {
    this.dashboardService.getDashboardList(appId)
      .subscribe(res => {
        this.dashboardList = res;
        this.dashboardList.forEach(f => {
          var obj = {
            title: f.title,
            type: 'dashboard',
            screenId: f.id,
            icon: 'fas:tachometer-alt'
          }
          this.palettes.push(obj);
        });
        this.cdr.detectChanges(); // <--- Add here
      })
  }

  screenIcon = {
    qr: 'fas:qrcode',
    static: 'far:file',
    list: 'fas:stream',
    page: 'far:file',
    calendar: 'far:calendar-alt',
    chatbot: 'fas:robot'
  }
  getScreenList(appId) {
    this.screenService.getScreenList(appId)
      .subscribe(res => {
        this.screenList = res;
        this.screenList.forEach(f => {
          var obj = {
            title: f.title,
            type: 'screen',
            screenId: f.id,
            icon: this.screenIcon[f.type]
          }
          this.palettes.push(obj);
        });
        this.cdr.detectChanges(); // <--- Add here
      })
  }

  getNavisAll(id) {
    this.appService.getNavisAll(id)
      .subscribe(res => {
        this.navis = res;
        this.commService.emitChange({ key: 'navi', value: this.navis.length > 0 });
        //this.initNavi();
        this.cdr.detectChanges(); // <--- Add here
      })
  }

  getNaviData(id) {
    this.appService.getNaviData(id, this.viewAs)
      .subscribe(res => {
        this.naviData = res;
        this.cdr.detectChanges(); // <--- Add here
      })
  }

  swapGroup = (array, a, b) => {
    this.swapPositions(array, a, b);
    this.saveGroupOrder();
  }

  swapItem = (section, array, a, b) => {
    this.swapPositions(array, a, b);
    this.saveItemOrder(section);
  }

  swapPositions = (array, a, b) => {
    [array[a], array[b]] = [array[b], array[a]];

    array[a].altClass = 'swapStart';
    array[b].altClass = 'swapStart';
    this.cdr.detectChanges(); // <--- Add here if UI doesn't update
    setTimeout(() => {
      delete array[a].altClass;
      delete array[b].altClass;
      this.cdr.detectChanges(); // <--- Add here if UI doesn't update after timeout
    }, 500);
  };

  dropItem(event: CdkDragDrop<any[]>, parent) {
    if (event.previousContainer.id == "palette-pane") {

      const clone = Object.assign({}, event.previousContainer.data[event.previousIndex]);

      event.container.data.splice(event.currentIndex, 0, clone);

      this.appService.addNaviItem(parent.id, clone)
        .subscribe({
          next: (res) => {
            this.getNaviData(this.appId);
            this.getNavisAll(this.appId);
            this.toastService.show("Item saved successfully", { classname: 'bg-success text-light' });
            this.cdr.detectChanges(); // <--- Add here
          }, error: (err) => {
            this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });

          }
        })

    } else {
      if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        this.saveItemOrder(parent);
      } else {
        transferArrayItem(event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex);

        this.appService.moveItem(event.container.data[event.currentIndex].id, parent.id, event.currentIndex)
          .subscribe(res => {
            // console.log("moved");
          });
      }
    }
    // this.saveNavi();
  }

  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  getLookupList(appId) {
    // let params = new HttpParams()
    //   .set("appId", appId);
    this.lookupService.getFullLookupList({appId})
      .subscribe(res => {
        this.lookupList = res.content;
        this.lookupList.forEach(f => {
          var obj = {
            title: f.name,
            type: 'lookup',
            screenId: f.id,
            icon: 'far:caret-square-down'
          }
          this.palettes.push(obj);
        });
        this.cdr.detectChanges(); // <--- Add here
      })
  }


  editGroupData: any;
  editGroup(content, group, isNew) {
    this.editGroupData = group;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.addNaviGroup(this.app.id, group)
          .subscribe({
            next: (res) => {
              this.getNavisAll(this.appId);
              this.toastService.show("Group saved successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // <--- Add here
            }, error: (err) => {
              this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
            }
          })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  editNaviData: any;
  editNaviSetting(content, isNew) {
    this.editNaviData = this.app;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.save(this.editNaviData, this.user.email)
          .subscribe(res => {
            this.getNavisAll(this.appId);
            this.toastService.show("Navi setting saved successfully", { classname: 'bg-success text-light' });
            this.cdr.detectChanges(); // <--- Add here
          }, err => {
            this.toastService.show("Navi setting saving failed", { classname: 'bg-danger text-light' });
          })
      }, err => {
        // this.toastService.show("Group saving failed", { classname: 'bg-danger text-light' });
      });
  }

  removeGroupData: any;
  removeGroup(content, data, index) {
    this.removeGroupData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.removeNaviGroup(data.id)
          .subscribe({
            next: (res) => {
              this.getNavisAll(this.appId);
              this.toastService.show("Group removed successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // <--- Add here
            }, error: (err) => {
              this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
            }
          })
      });
  }

  removeItemData: any;
  removeItem(content, data, index) {
    this.removeItemData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.appService.removeNaviItem(data.id)
          .subscribe({
            next: (res) => {
              this.getNavisAll(this.appId);
              this.toastService.show("Item removed successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // <--- Add here
            }, error: (err) => {
              this.toastService.show("Item removal failed", { classname: 'bg-danger text-light' });
            }
          })
      });
  }

  otherAppList: any[] = [];
  editItemData: any;
  editItem(content, item, group, isNew) {
    if (!item.x) {
        item['x'] = { facet: {} };
    }
    this.editItemData = item;
    if (!this.editItemData.appId){      
      this.editItemData.appId = this.app.id;
    }
    // console.log(this.editItemData.appId)
    // this.editItemData.appId = this.app.id;
    this.loadOtherAppList(this.editItemData.type,this.editItemData.appId);

    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {

        this.appService.addNaviItem(group.id, item)
          .subscribe({
            next: (res) => {
              this.getNaviData(this.appId);
              this.getNavisAll(this.appId);
              this.toastService.show("Item saved successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // <--- Add here
            }, error: (err) => {
              this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
            }
          })
      },
        err => { this.cdr.detectChanges(); });
  }

  loadOtherAppList(type, appId) {
    if (['form', 'form-single', 'view-single'].indexOf(type) > -1) {
      this.getFormList(appId);
    }
    if (type == 'dataset') {
      this.getDatasetList(appId);
    }
    if (type == 'dashboard') {
      this.getDashboardList(appId);
    }
    if (type == 'lookup') {
      this.getLookupList(appId);
    }
    if (type == 'screen') {
      this.getScreenList(appId);
    }
    if (type == 'user') {
      this.getAccessList(appId);
    }
  }

  loadPaletteList(appId) {
    this.palettes = [];
    this.getFormList(appId);
    this.getDatasetList(appId);
    this.getDashboardList(appId);
    this.getLookupList(appId);
    this.getScreenList(appId);
    this.getAccessList(appId);
  }

  saveItemOrder(section) {
    var list = section.items
      .map((val, $index) => {
        return { id: val.id, sortOrder: $index }
      });
    return this.appService.saveNaviItemOrder(list)
      .subscribe({
        next: (res) => {
          return res;
        }, error: (err) => {
          this.toastService.show("Item re-ordering failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  saveGroupOrder() {
    var list = this.navis
      .map(function (val, $index) {
        return { id: val.id, sortOrder: $index }
      });

    return this.appService.saveNaviGroupOrder(list)
      .subscribe({
        next: (res) => {
          return res;
        }, error: (err) => {
          this.toastService.show("Group re-ordering failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

  
  editRoleData: any;
  editRole(content, group, obj, prop, multi) {
    this.editRoleData = group;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.groupService.save(this.app.id, data)
          .subscribe(res => {
              this.getAccessList(this.app.id);
              if (multi){
                  if (!obj[prop]){
                      obj[prop]=[];
                  }
                  obj[prop] = obj[prop].concat(res.id);
              }else{
                  obj[prop] = res.id;
              }
            this.toastService.show("Group successfully saved", { classname: 'bg-success text-light' });
          }, res => {
            this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { this.cdr.detectChanges(); })
  }


}
