import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { DatasetService } from '../../../../service/dataset.service';
import { CHART_AGG_LIST, CHART_HEIGHT_LIST, CHART_TYPE_LIST, DASHBOARD_SIZE_LIST } from '../../assistant/assistant-knowledge';
import { AssistantLocalContextService } from '../../assistant/assistant-local-context.service';

@Component({
  selector: 'app-dashboard-editor',
  templateUrl: './dashboard-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./dashboard-editor.component.scss',
    '../../../../../assets/css/element-action.css'],
  imports: [FaIconComponent, RouterLink, CdkDropList, CdkDrag, NgClass, NgStyle, CdkDragHandle, EditDashboardComponent, 
    FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgCmComponent, 
    EntryFilterComponent, NgbNavOutlet, KeyValuePipe]
})
export class DashboardEditorComponent implements OnInit {
  readonly sameDropList = (drag: CdkDrag<unknown>, drop: CdkDropList<unknown>) =>
    drag.dropContainer === drop;

  private formService = inject(FormService);
  private lookupService = inject(LookupService);
  private groupService = inject(GroupService);
  private dashboardService = inject(DashboardService);
  private modalService = inject(NgbModal);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private appService = inject(AppService);
  private datasetService = inject(DatasetService);
  private entryService = inject(EntryService);
  private utilityService = inject(UtilityService);
  private toastService = inject(ToastService);
  private commService = inject(CommService);
  private location = inject(PlatformLocation);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private assistantContext = inject(AssistantLocalContextService).createRegistration();

  constructor() {
    this.destroyRef.onDestroy(() => this.assistantContext.clear());
    this.location.onPopState(() => {
        if (document.querySelector('.cm-fullscreen-mode')) {
            return;
        }
        this.modalService.dismissAll('')
    });
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    this.commService.changeEmitted$.subscribe(data => {
      if (data.value == 'import') {
        this.getDashboardList(1);
      }
    });

  }

  curDashboard: any;
  dashboardList: any[];
  formList: any[];
  app: any;
  user: any;
  offline: boolean;
  baseApi = baseApi;

  chartTypeList = CHART_TYPE_LIST;

  aggType = CHART_AGG_LIST;

  sizeList: any[] = DASHBOARD_SIZE_LIST;

  heightList: any[] = CHART_HEIGHT_LIST;

  publicEp: any = {}
  editDrillFields: any = {}

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
                this.cdr.detectChanges(); // ✅ Good: after async update of app and lists
              });
          }
        });

      this.route.queryParams
        .subscribe((params: Params) => {

          const id = params['id'];
          if (id) {
            this.getDashboard(id);
            // No need to call cdr.detectChanges() here if getDashboard already does
          }
        })
    });
  }

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

  accessList: any[] = [];
  getAccessList() {
    this.groupService.getGroupList({ appId: this.app.id, size: 999 })
      .subscribe(res => {
        this.accessList = res.content;
        this.cdr.detectChanges(); // ✅ Good: after async update
      });
  }

  formMap:any = {};

  getFormList() {
    this.formMap = {};
    this.formService.getListBasic({
      appId: this.app.id
    }).subscribe(res => {
      this.formList = res.content;
      res.content.forEach(f=>this.formMap[f.id]=f.title);
      this.cdr.detectChanges(); // ✅ Good: after async update
    })
  }

  datasetList: any[] = [];
  form: any = {};
  // editHolderForm: any = {}
  editHolderFormSig = signal<any>({})
  loadForm(id, holderSig, chart) {
    this.formService.getForm(id)
      .subscribe(res => {
        holderSig.set({ data: res, prev: res.prev })

        this.sectionItems['data'] = this.getSectionItemsNew(holderSig().data, ['section', 'approval', 'list']);
        this.sectionItems['prev'] = this.getSectionItemsNew(holderSig().prev, ['section', 'approval', 'list']);

        this.statusFilterForm = this.convertStatusToDisplay(chart.statusFilter, holderSig(), 'data');
        this.prevStatusFilterForm = this.convertStatusToDisplay(chart.prevStatusFilter, holderSig(),'prev');
        
        this.showPrevStatus = !this.isStatusAllFalse(this.prevStatusFilterForm);

        this.cdr.detectChanges(); // ✅ Good: after async update
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
        this.assistantContext.set({ type: 'dashboard', id: Number(res.id), label: res.title });
        this.cdr.detectChanges(); // ✅ Good: after async update
      })
  }

  getDashboardList(appId) {
    this.dashboardService.getDashboardList(appId)
      .subscribe(res => {
        this.dashboardList = res;
        this.commService.emitChange({ key: 'dashboard', value: res.length });
        this.cdr.detectChanges(); // ✅ Good: after async update
      })
  }

  sectionItems: any = {};
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

  getPrefix = (fm, section) => {
    var mapFm = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    var tier = this.getTierFromSection(section && section.id, this.editHolderFormSig()[fm]);
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

  getPostfix = (field) => {
    if (['select', 'radio'].indexOf(field.type) > -1) {
      if (field.subType == 'multiple') {
        return "*.name";
      } else {
        return ".name";
      }

    } else if (['checkboxOption'].indexOf(field.type) > -1) {
      return "*.name";

    } else if (['modelPicker'].indexOf(field.type) > -1) {
      if (field.subType == 'multiple') {
        return "*." + field.bindLabel;
      } else {
        return "." + field.bindLabel;
      }
    } else {
      return "";
    }
  }

  getFilterPath(fm, section, f) {
    return this.getPrefix(fm, section) + '.' + f.code + (this.editHolderFormSig()[fm].items[f.code].subType == 'multiple' ? '*' : '') + '.code';
  }

  showPrevStatus:boolean=false;

  checkAllStatus(statusFilter, root, checked) {
    statusFilter['-1'].drafted = checked;
    statusFilter['-1'].submitted = checked;
    this.editHolderFormSig()[root]?.tiers?.forEach(tier => {
      for (const action in tier.actions) {
        statusFilter[tier.id][action] = checked;
      }
      statusFilter[tier.id].resubmitted = checked;
    })
  }


  isStatusAllFalse(filter) {
    for (const tierKey in filter) {
      const tierObj = filter[tierKey];
      for (const statusKey in tierObj) {
        // If we find even one true value, we stop and return false immediately
        if (tierObj[statusKey] === true) {
          return false;
        }
      }
    }
    return true; // If we survive the loops, everything was false
  }

  splitAsList = splitAsList;

  forceArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }

  seriesChange(isEnabled) {
    if (!isEnabled) {
      delete this.editChartData.fieldSeries;
    }
  }

  isEmptyObject = (obj: any) => obj && Object.keys(obj).length == 0;


  editPresetValue(chart, c) {
    var value = prompt('Edit value for :' + c.key + ' (old value: ' + c.value + ')', c.value);
    if (value) {
      chart.presetFilters[c.key] = value;
      this.dashboardService.saveChart(this.curDashboard.id, chart)
        .subscribe((res) => {
          this.toastService.show("Preset value saved successfully", { classname: 'bg-success text-light' });
        });
      this.cdr.detectChanges(); // <--- Add here
    }
  }

  editPresetKey(chart, c) {
    var key = prompt('Edit key for :' + c.key + ' (old key: ' + c.key + ')\n\nOperator supported (appended to key, ie: $.gender~in): ~in, ~notin, ~contain, ~notcontain, ~from, ~to, ~between', c.key);
    if (key) {
      chart.presetFilters[key] = c.value;
      if (c.key != key) {
        delete chart.presetFilters[c.key]
      }
      this.dashboardService.saveChart(this.curDashboard.id, chart)
        .subscribe((res) => {
          this.toastService.show("Preset key saved successfully", { classname: 'bg-success text-light' });
        });
      this.cdr.detectChanges(); // <--- Add here
    }

  }

  enableChartDrill: boolean = false;  
  checkCartesanForDrill() {
    // Safely check length, defaulting to 0 if null/undefined
    const codeLen = this.editChartData.fieldCode?.length || 0;
    const valLen = this.editChartData.fieldValue?.length || 0;

    if (codeLen > 1 || valLen > 1) {
      this.editChartData.x.drill = false;
      this.enableChartDrill = false;
    } else {
      this.enableChartDrill = true;
    }
  }


  removePreset(chart, key) {
    delete chart.presetFilters[key];
    this.dashboardService.saveChart(this.curDashboard.id, chart)
      .subscribe((res) => {
        this.toastService.show("Preset key removed successfully", { classname: 'bg-success text-light' });
      });
    this.cdr.detectChanges(); // <--- Add here
  }


  // // 1. GETTER: Uses flatMap to instantly map prefixes to their array of codes
  // get fieldMapFlat(): string[] {
  //   return Object.entries(this.editChartData.x.drillFields || {}).flatMap(
  //     ([prefix, codes]: [string, any]) => codes.map((code: string) => `${prefix}.${code}`)
  //   );
  // }

  // // 2. SETTER: Uses reduce and the logical assignment operator (||=) to auto-group
  // set fieldMapFlat(values: string[]) {
  //   this.editChartData.fieldMap = (values || []).reduce((acc: any, val: string) => {
  //     const dotIdx = val.indexOf('.');
  //     if (dotIdx > -1) {
  //       const prefix = val.substring(0, dotIdx);
  //       // If acc[prefix] doesn't exist, initialize it as [], then push the code
  //       (acc[prefix] ||= []).push(val.substring(dotIdx + 1)); 
  //     }
  //     return acc;
  //   }, {});
  // }


  // Checks if the object exists in the array (only needs root and code to check)
  isFieldSelected(root: string, code: string): boolean {
    const list = this.editChartData.x.drillFields || [];
    return list.some((item: any) => item.root === root && item.code === code);
  }

  // Adds or removes the object directly, now saving the label too!
  toggleFieldSelection(root: string, code: string, label: string, event: any) {
    const isChecked = event.target.checked;
    let list = this.editChartData.x.drillFields || [];

    if (isChecked) {
      if (!this.isFieldSelected(root, code)) {
        // Push the new object with root, code, AND label
        list = [...list, { root, code, label }];
      }
    } else {
      list = list.filter((item: any) => !(item.root === root && item.code === code));
    }

    // Save the array of objects directly to the model!
    this.editChartData.x.drillFields = list;
  }


  editChart(content, dashboardId, data, isNew) {
    if (!data['presetFilters']) {
      data['presetFilters'] = {};
    }
    if (isNew) {
      data['filters'] = [];
      data['presetFilters'] = {};
      // data['status'] = "";
      data['statusFilter'] = {};
      data['prevStatusFilter'] = {};
    }
    if (!data.x) {
      data.x = {};
    }
    if (!data.x.drillFields) {
      data.x.drillFields = [];
    }
    if (!this.statusFilterForm[-1]) {
      this.statusFilterForm[-1] = {};
    }
    data.fieldCode = data.fieldCode?.split(",");
    data.fieldValue = data.fieldValue?.split(",");

    this.editChartData = data;

    // console.log("fieldCode", this.editChartData.fieldCode, "fieldValue", this.editChartData.fieldValue)

    // check first, because new chart dont have the field value
    this.checkCartesanForDrill();

    if (data.form) {
      this.loadForm(data.form.id, this.editHolderFormSig, data);
      this.getLookupIdList(data.form.id);
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(ch => {

        ch.fieldCode = ch.fieldCode?.join(",");
        ch.fieldValue = ch.fieldValue?.join(",");

        ch.statusFilter = this.convertDisplayToStatus(this.statusFilterForm);
        ch.prevStatusFilter = this.convertDisplayToStatus(this.prevStatusFilterForm);


        this.dashboardService.saveChart(dashboardId, ch)
          .subscribe((res) => {
            this.getDashboard(dashboardId);
            this.toastService.show("Chart saved successfully", { classname: 'bg-success text-light' });
          });
      }, res => {
        data.fieldCode = data.fieldCode?.join(",");
        data.fieldValue = data.fieldValue?.join(",");
      });
  }

  statusFilterForm: any = {};
  prevStatusFilterForm: any = {};
  // statusFilterData:any={};
  convertStatusToDisplay(status, form, root) {
    var statusFilterForm: any = {}
    statusFilterForm[-1] = {};
    var draftedFilter = (status && status[-1]) ? status[-1].split(",") : [];
    draftedFilter.forEach(element => {
      statusFilterForm[-1][element] = true;
    });
    form[root] && form[root].tiers.forEach(t => {
      statusFilterForm[t.id] = {};
      var splittedFilter = (status && status[t.id]) ? status[t.id].split(",") : [];
      splittedFilter.forEach(element => {
        // only apply action specified in the tier or resubmitted or if always approve is enabled for always_approve
        if ((t.actions[element] || element == 'resubmitted') || (t.alwaysApprove && element == 'always_approve')) {
          statusFilterForm[t.id][element] = true;
        }
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
          .subscribe({
            next: (res) => {
              this.getDashboard(this.curDashboard.id);
              this.toastService.show("Chart removed successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // ✅ Good: after async update

            }, error: (err) => {
              this.toastService.show("Chart removal failed", { classname: 'bg-danger text-light' });
              this.cdr.detectChanges(); // ✅ Good: after async update
            }
          })
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
          .subscribe({
            next: (res) => {
              this.getDashboardList(this.app.id);
              delete this.curDashboard;
              this.toastService.show("Dashboard removed successfully", { classname: 'bg-success text-light' });
              this.cdr.detectChanges(); // ✅ Good: after async update
            }, error: (err) => {
              this.toastService.show("Dashboard removal failed", { classname: 'bg-danger text-light' });
              this.cdr.detectChanges(); // ✅ Good: after async update
            }
          })
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
      this.cdr.detectChanges(); // ✅ Good: after async update
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
          next: res => {
            this.lookup = { ...this.lookup, [code]: res };
          }, error: err => {
          }
        })
    }
  }

  lookupDataObs: any = {}
  _getLookupObs(code, param, cb?, err?): Observable<any> {

    var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}), null);
    // masalah nya loading ialah async... so, mun simultaneous load, cache blom diset
    // bleh consider cache observable instead of result.
    // tp bila pake observable.. request dipolah on subscribe();
    // settle with share()
    if (this.lookupDataObs[cacheId]) {
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
          map(res => res.content), share()
        )
    }
    return this.lookupDataObs[cacheId];
  }

  parseJson(str) {
    var g = {};
    try { g = JSON.parse(str) } catch (e) { };
    return g;
  }

  clearDrillFields(){
    this.editChartData.x.drillFields = [];
  }

  curField:any={};

  dropField(event: CdkDragDrop<number[]>, chart) {
    moveItemInArray(chart.x.drillFields, event.previousIndex, event.currentIndex);
    this.dashboardService.saveChart(this.curDashboard.id, chart)
      .subscribe({
        next: res => { }
      })
    this.cdr.detectChanges(); // <--- Add here
  }

  editFieldLabel(chart, a) {
    var value = prompt('Edit label for :' + a.code + ' (old value: ' + a.label + ')', a.label);
    if (value) {
      a.label = value;
      // this.curDataset.presetFilters[c.key] = value;
      this.dashboardService.saveChart(this.curDashboard.id, chart)
        .subscribe({
          next: res => { }
        })
      this.cdr.detectChanges(); // <--- Add here
    }
  }

  removeDrillField(chart, index){
    chart.x.drillFields.splice(index, 1);
      this.dashboardService.saveChart(this.curDashboard.id, chart)
        .subscribe({
          next: res => { }
        })
      this.cdr.detectChanges(); // <--- Add here
  }

  getAsList = splitAsList;

  cleanText = cleanText;

}
