import { Component, OnInit } from '@angular/core';
import { FormService } from '../../../../service/form.service';
// import { LookupService } from '../../../../service/lookup.service';
import { NgbModal, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { AppService } from '../../../../service/app.service';
// import { EntryService } from '../../../../service/entry.service';
import { UtilityService } from '../../../../_shared/service/utility.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { PlatformLocation, NgClass, NgStyle, KeyValuePipe } from '@angular/common';
// import { HttpParams } from '@angular/common/http';
import { DashboardService } from '../../../../service/dashboard.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import { baseApi } from '../../../../_shared/constant.service';
import { btoaUTF, cleanText, hashObject, splitAsList } from '../../../../_shared/utils';
import { Observable, tap, first, share, map } from 'rxjs';
import { EntryFilterComponent } from '../../../../_shared/component/entry-filter/entry-filter.component';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { FormsModule } from '@angular/forms';
import { EditDashboardComponent } from '../../../../_shared/modal/edit-dashboard/edit-dashboard.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { LookupService } from '../../../../run/_service/lookup.service';
import { EntryService } from '../../../../run/_service/entry.service';

@Component({
    selector: 'app-dashboard-editor',
    templateUrl: './dashboard-editor.component.html',
    styleUrls: ['./dashboard-editor.component.scss',
        '../../../../../assets/css/element-action.css'],
    imports: [FaIconComponent, RouterLink, CdkDropList, CdkDrag, NgClass, NgStyle, CdkDragHandle, EditDashboardComponent, FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgCmComponent, EntryFilterComponent, NgbNavOutlet, KeyValuePipe]
})
export class DashboardEditorComponent implements OnInit {


  constructor(private formService: FormService, private lookupService: LookupService,
    private groupService: GroupService,
    private dashboardService: DashboardService,
    private modalService: NgbModal, private userService: UserService,
    private route: ActivatedRoute, private appService: AppService,
    private entryService: EntryService,
    private utilityService: UtilityService,
    private toastService: ToastService,
    private commService: CommService,
    private location: PlatformLocation) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    commService.changeEmitted$.subscribe(data => {
      if (data.value == 'import') {
        this.getDashboardList(1);
      }
    });
  }

  dashboardLoading: boolean;
  curDashboard: any;
  dashboardList: any[];
  formList: any[];
  app: any;
  user: any;
  offline: boolean;
  baseApi = baseApi;

  chartTypeList = [
    { code: 'pie', name: 'Pie', parent: 'chart', icon: ['fas', 'chart-pie'], noseries: true },
    { code: 'doughnut', name: 'Doughnut', parent: 'chart', icon: ['far', 'circle'], noseries: true },
    { code: 'rose', name: 'Nightingale Rose', parent: 'chart', icon: ['fas', 'chart-pie'], noseries: true },
    { code: 'bar', name: 'Vertical Bar', parent: 'chart', icon: ['fas', 'chart-bar'], transform: "rotate-90 flip-v" },
    { code: 'line', name: 'Vertical Line', parent: 'chart', icon: ['fas', 'chart-line'], transform: "rotate-90 flip-v" },
    { code: 'hbar', name: 'Horizontal Bar', parent: 'chart', icon: ['fas', 'chart-bar'] },
    { code: 'hline', name: 'Horizontal Line', parent: 'chart', icon: ['fas', 'chart-line'] },
    { code: 'area', name: 'Area', parent: 'chart', icon: ['fas', 'chart-area'] },
    { code: 'radar', name: 'Radar', parent: 'chart', icon: ['fas', 'circle-nodes'] }, 
    { code: 'gauge', name: 'Gauge', parent: 'chart', icon: ['fas', 'tachometer-alt'], noseries: true }
  ]

  aggType = [
    { code: 'sum', name: "Sum" },
    { code: 'count', name: "Count" },
    { code: 'avg', name: "Average" },
    { code: 'max', name: "Max" },
    { code: 'min', name: "Min" }
  ]

  sizeList: any[] = [
    { name: "100%", value: "col-sm-12" },
    { name: "67%", value: "col-sm-8" },
    { name: "58%", value: "col-sm-7" },
    { name: "50%", value: "col-sm-6" },
    { name: "42%", value: "col-sm-5" },
    { name: "33%", value: "col-sm-4" }
  ]

  heightList: any[] = [
    { name: "Normal", value: 450 },
    { name: "High", value: 650 },
    { name: "Double (2x)", value: 900 }
  ]

  publicEp:any={}

  ngOnInit() {
    this.userService.getCreator().subscribe((user) => {

      this.user = user;

      this.route.parent.parent.parent.params
        // NOTE: I do not use switchMap here, but subscribe directly
        .subscribe((params: Params) => {



          const appId = params['appId'];
          if (appId) {
            let params = { email: user.email }
            // new HttpParams()
            //   .set("email", user.email);

            this.appService.getApp(appId, params)
              .subscribe(res => {
                this.app = res;
                this.getDashboardList(appId);
                this.getFormList();
                this.getAccessList();
              });
          }
        });

      this.route.queryParams
        .subscribe((params: Params) => {

          const id = params['id'];
          if (id) {
            this.getDashboard(id);
          }
        })
    });
  }

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

  accessList: any[] = [];
  getAccessList() {
    this.groupService.getGroupList({ appId: this.app.id, size:999 })
      .subscribe(res => {
        this.accessList = res.content;
      });
  }

  getFormList() {
    this.formService.getListBasic({
      appId: this.app.id
    }).subscribe(res => {
      this.formList = res.content;
    })
  }

  form: any = {};
  editHolderForm: any = {}
  loadForm(id, holder, chart) {
    this.formService.getForm(id)
      .subscribe(res => {

        holder['data'] = res;
        holder['prev'] = res.prev;

        this.sectionItems['data'] = this.getSectionItemsNew(holder['data'], ['section', 'approval', 'list']);
        this.sectionItems['prev'] = this.getSectionItemsNew(holder['prev'], ['section', 'approval', 'list']);

        // this.sectionItems['data'] = this.getSectionItemsNew(holder['data'],['section','approval']);
        // this.sectionItems['prev'] = this.getSectionItemsNew(holder['prev'],['section','approval']);

        this.statusFilterForm = this.convertStatusToDisplay(chart.statusFilter, holder);

      });
  }

  getSectionItems(form, types: any[]) {
    let items = [];
    if (form) {
      form.sections.filter(s => types.indexOf(s.type) > -1)
        .forEach(element => {
          items = items.concat(element.items);
        });
    }
    return items;
  }

  getDashboard(dashboardId) {
    this.dashboardService.getDashboard(dashboardId)
      .subscribe(res => {
        this.curDashboard = res;
      })
  }

  getDashboardList(appId) {
    this.dashboardService.getDashboardList(appId)
      .subscribe(res => {
        this.dashboardList = res;
        this.commService.emitChange({ key: 'dashboard', value: res.length });
      })
  }

  sectionItems:any={};
  getSectionItemsNew(form, types: any[]) {
    let items = [];
    if (form) {
      form.sections.filter(s => types.indexOf(s.type) > -1)
        .forEach(element => {
          var tier = element.type == 'approval' ? this.getTierFromSection(element.id, form) : null;
          items = items.concat({ section: element, items: element.items, tier: tier });
        });
    }
    return items;
  }
  
  getTierFromSection = (sectionId, form) => form.tiers.filter(t => t.section && t.section.id == sectionId)[0];


  editChartData: any;
  hasFocus: any = {};

  // mapFm={'data':'$','prev':'$prev$','approval':'$$'}
  getPrefix = (fm, section) => {
    // console.log("fm,section:"+fm+","+section.id+","+section.type)
    var mapFm = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    var tier = this.getTierFromSection(section && section.id, this.editHolderForm[fm]);
    if (section && section.type == 'approval') {
        if (tier) {
            return '$$.' + tier.id;
        } else {
            return mapFm[fm];
        }
    } else if (section && section.type == 'list') {
        return mapFm[fm] + '.' + section.code + '*';
    } else {
        return mapFm[fm];
    }
  }

  getPostfix = (field) =>{
    if (['select', 'radio'].indexOf(field.type)>-1) {
      if (field.subType=='multiple'){
        return "*.name";
      }else{
        return ".name";
      }
      
    }else if (['checkboxOption'].indexOf(field.type)>-1){
      return "*.name";

    }else if (['modelPicker'].indexOf(field.type)>-1){
      if (field.subType=='multiple'){
        return "*."+field.bindLabel;
      }else{
        return "."+field.bindLabel;
      }
    }else{
      return "";
    }
  }

getFilterPath(fm, section,f){
  return this.getPrefix(fm,section)+'.'+f.code+(this.editHolderForm[fm].items[f.code].subType=='multiple'?'*':'')+'.code';
}


checkAllStatus(checked){
  this.statusFilterForm['-1'].drafted = checked;
  this.statusFilterForm['-1'].submitted = checked;
  this.editHolderForm['data']?.tiers?.forEach(tier=>{
    for (const action in tier.actions){
      this.statusFilterForm[tier.id][action] = checked;
    }
    this.statusFilterForm[tier.id].resubmitted = checked;
  })
}

  forceArray(obj){
    return Array.isArray(obj)?obj:[obj];
  }

  seriesChange(isEnabled){
    if (!isEnabled){
      delete this.editChartData.fieldSeries;
    }
  }

  editChart(content, dashboardId, data, isNew) {
    if (!data['presetFilters']) {
      data['presetFilters'] = {};
    }
    if (isNew) {
      data['filters'] = [];
      data['presetFilters'] = {};
      data['status'] = "";
      data['statusFilter'] = {};
    }
    if (!data.x){
      data.x = {};
    }
    if (!this.statusFilterForm[-1]){
      this.statusFilterForm[-1] = {};
    }
    data.fieldCode = data.fieldCode?.split(",");

    this.editChartData = data;

    if (data.form) {
      this.loadForm(data.form.id, this.editHolderForm, data);
      this.getLookupIdList(data.form.id);
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(ch => {

        ch.fieldCode = ch.fieldCode?.join(",");

        ch.statusFilter = this.convertDisplayToStatus(this.statusFilterForm);


        this.dashboardService.saveChart(dashboardId, ch)
          .subscribe((res) => {
            this.getDashboard(dashboardId);
            this.toastService.show("Chart saved successfully", { classname: 'bg-success text-light' });
          });
      }, res => {
        data.fieldCode = data.fieldCode?.join(",");
       });
  }

  statusFilterForm: any = {};
  // statusFilterData:any={};
  convertStatusToDisplay(status, form) {
    var statusFilterForm: any = {}
    statusFilterForm[-1] = {};
    var draftedFilter = (status && status[-1]) ? status[-1].split(",") : [];
    draftedFilter.forEach(element => {
      statusFilterForm[-1][element] = true;
    });
    form['data'] && form['data'].tiers.forEach(t => {
      statusFilterForm[t.id] = {};
      var splittedFilter = (status && status[t.id]) ? status[t.id].split(",") : [];
      splittedFilter.forEach(element => {
        statusFilterForm[t.id][element] = true;
      });
    });
    return statusFilterForm;
  }

  convertDisplayToStatus(statusFilterForm) {
    var statusFilter = {};
    var draftedArrays = [];
    for (var k in statusFilterForm[-1]) {
      if (statusFilterForm[-1][k] === true) {
        draftedArrays.push(k);
      }
    }
    statusFilter[-1] = draftedArrays.join(",");
    // for each tier
    Object.keys(statusFilterForm).forEach(k => {
      var statusFilterArrays = [];
      // for each {approved:true, submitted:true, etc}
      for (var k2 in statusFilterForm[k]) {
        if (statusFilterForm[k][k2] === true) {
          statusFilterArrays.push(k2);
        }
      }
      statusFilter[k] = statusFilterArrays.join(",");
    });
    return statusFilter;
  }


  removeChartData: any;
  removeChart(content, data) {
    this.removeChartData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.dashboardService.removeChart(data.id)
        .subscribe({next:(res)=>{
            this.getDashboard(this.curDashboard.id);
            this.toastService.show("Chart removed successfully", { classname: 'bg-success text-light' });

        },error:(err)=>{
            this.toastService.show("Chart removal failed", { classname: 'bg-danger text-light' });
        }})
      }, res => { });
  }



  reorderChart(dashboard, index, op) {
    this.reorder(dashboard.charts, index, op);
    this.saveChartOrder(dashboard);
  }

  editDashboardData: any;
  editDashboard(content, data) {
    if (!data.x) {
      data['x'] = {};
    }
    
    this.editDashboardData = data;

    // var items = {sizeList: this.sizeList, toSnakeCase: toSnakeCase};
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(dashboard => {
        this.dashboardService.saveDashboard(this.app.id, dashboard)
          .subscribe(res => {
            this.getDashboardList(this.app.id);
            this.getDashboard(res.id);
            this.toastService.show("Dashboard saved successfully", { classname: 'bg-success text-light' });
          }, error => {
            this.toastService.show("Dashboard saving failed", { classname: 'bg-danger text-light' });
          });
      }, res => { });
  }

  removeDashboardData: any;
  removeDashboard(content, data) {
    this.removeDashboardData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.dashboardService.removeDashboard(data.id)
        .subscribe({next:(res)=>{
          this.getDashboardList(this.app.id);
          delete this.curDashboard;
          this.toastService.show("Dashboard removed successfully", { classname: 'bg-success text-light' });
        },error:(err)=>{
          this.toastService.show("Dashboard removal failed", { classname: 'bg-danger text-light' });
        }})
      }, res => { });
  }

  // getDashboardList(pageNumber) {
  //     this.formService.getDashboardList(this.curForm.id, pageNumber)
  //         .subscribe(res => {
  //             this.curForm.dashboards = res.content;
  //         })
  // }
  dropChart(event: CdkDragDrop<number[]>, parent) {
    moveItemInArray(parent.charts, event.previousIndex, event.currentIndex);
    this.saveChartOrder(parent);
  }

  saveChartOrder(dashboard) {
    var list = dashboard.charts
      .map((val, $index) => {
        return { id: val.id, sortOrder: $index }
      });
    return this.dashboardService.saveChartOrder(list)
      .subscribe((res) => {
        return res;
      });
  }

  reorder(items, index, op) {
    items[index + op].altClass = 'swapStart';
    items[index].altClass = 'swapStart';
    var temp = items[index + op];
    var tempSortOrder = items[index + op].sortOrder;
    items[index + op].sortOrder = items[index].sortOrder;
    items[index + op] = items[index];

    items[index].sortOrder = tempSortOrder;
    items[index] = temp;
    setTimeout(() => {
      items[index + op].altClass = 'swapEnd';
      items[index].altClass = 'swapEnd';
    }, 500);
  }

  // toSpaceCase = (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

  // toSnakeCase = (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

  clearPreset(item, key) {
    key.forEach(k => {
      delete item[k];
    })
  }

  toggleItem(parent, list, f, root, formId) {
    var size = parent[list].filter(i => i.code == f.code && i.root == root).length;

    // Is currently selected
    if (size > 0) {
      // console.log(parent[list].filter(i => i.code != f.code));
      parent[list] = parent[list].filter(i => !(i.code == f.code && i.root == root))
    } else {
      parent[list].push({
        code: f.code,
        label: f.label,
        sortOrder: parent[list].length,
        root: root,
        formId: formId
      });
    }
  }

  checkItem(list, f, root) {
    return list.filter(i => f.code == i.code && i.root == root).length > 0;
  }

  lookupIds = [];
  lookupKey = {};
  lookup = {};
  mod = {};

  getLookupIdList(id) {
    this.lookupService.getInForm(id)
      .subscribe(res => {
        this.lookupIds = res;
        this.lookupIds.forEach(key => {
          this.lookupKey[key.code] = {
            ds: key.dataSource,
            type: key.type
          };
          this._getLookup(key.code, key.dataSourceInit ? this.parseJson(key.dataSourceInit) : null);
        });
      });
  }

  // getLookup = (code, params?: any) => {
  //   if (code) {
  //     if (this.lookupKey[code].type == 'modelPicker') {
  //       let params = { email: this.user.email }
  //       this.entryService.getListByDatasetData(this.lookupKey[code].ds, params)
  //         .subscribe(res => {
  //           this.lookup[code] = res;
  //         })
  //     } else {
  //       this.lookupService.getByKey(this.lookupKey[code].ds, params)
  //         .subscribe(res => {
  //           this.lookup[code] = res.content;
  //         })
  //     }

  //   }
  // }

  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this._getLookupObs(code, param, cb, err)
      .subscribe({
        next:res=>{
          this.lookup[code] = res;
        }, error:err=>{
        }
      })
    }
  }

  lookupDataObs:any={}
  _getLookupObs(code, param, cb?, err?):Observable<any>{

      var cacheId =  'key_'+btoaUTF(this.lookupKey[code].ds + hashObject(param??{}),null);
      // masalah nya loading ialah async... so, mun simultaneous load, cache blom diset
      // bleh consider cache observable instead of result.
      // tp bila pake observable.. request dipolah on subscribe();
      // settle with share()
      if (this.lookupDataObs[cacheId]){
        return this.lookupDataObs[cacheId]
      }
      // start loading
      // console.log('loading '+this.lookupKey[code],code);
      if (this.lookupKey[code].type == 'modelPicker') {
        param = Object.assign(param || {}, { email: this.user.email });
        this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param ? param : null)
          .pipe(
            tap({ next: cb, error: err }), first(), share()
          )
      } else {
        // param = Object.assign(param || {}, { sort: 'id,asc' });
        param = Object.assign(param || {}, {});
        this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
          .pipe(
            tap({ next: cb, error: err }), first(),
            map(res=>res.content), share()
          )
      }
      return this.lookupDataObs[cacheId];
  }

  parseJson(str) {
    var g = {};
    try { g = JSON.parse(str) } catch (e) { };
    return g;
  }

  getAsList = splitAsList;

  cleanText = cleanText;

}
