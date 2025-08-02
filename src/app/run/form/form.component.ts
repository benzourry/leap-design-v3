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

import { Component, OnInit, AfterViewChecked, ChangeDetectorRef, OnDestroy, input, output, effect, viewChild, forwardRef, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbDateAdapter, NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet, NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { base, baseApi } from '../../_shared/constant.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { PlatformLocation, NgTemplateOutlet, NgStyle, DatePipe } from '@angular/common';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { LogService } from '../../_shared/service/log.service';
import { ServerDate, btoaUTF, compileTpl, createProxy, deepMerge, getFileExt, hashObject, loadScript, resizeImage } from '../../_shared/utils';
import { debounceTime, first, map, share, tap } from 'rxjs/operators';

import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { Observable, Subject, lastValueFrom, throwError } from 'rxjs';
import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';
import { NgForm, FormsModule } from '@angular/forms';
import { ScreenComponent } from '../screen/screen.component';
import { ListComponent } from '../list/list.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { EditLookupEntryComponent } from '../../_shared/modal/edit-lookup-entry/edit-lookup-entry.component';
import { FieldEditComponent } from '../_component/field-edit-b/field-edit-b.component';
import { FieldViewComponent } from '../_component/field-view.component';
import { FormViewComponent } from '../_component/form-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { StepWizardComponent } from '../_component/step-wizard.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
  imports: [FormsModule, PageTitleComponent, StepWizardComponent, FormViewComponent, NgbAccordionDirective, NgbAccordionItem,
    NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody,
    NgTemplateOutlet, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, RouterLink, NgbNavContent, NgbNavOutlet,
    NgStyle, FaIconComponent, FieldViewComponent, FieldEditComponent,
    forwardRef(() => ListComponent), forwardRef(() => ScreenComponent),
    DatePipe, IconSplitPipe,
    NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem,
    EditLookupEntryComponent]
})
export class FormComponent implements OnInit, OnDestroy, AfterViewChecked, ComponentCanDeactivate {

  private userService = inject(UserService);
  private runService = inject(RunService);
  private lookupService = inject(LookupService);
  private entryService = inject(EntryService);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(PlatformLocation);
  private pageTitleService = inject(PageTitleService);

  user = computed<any>(() => this.runService.$user());
  app = computed<any>(() => this.runService.$app());
  appConfig: any = this.runService.appConfig;
  form = signal<any>({});
  lookupIds: any;
  baseApi: string = baseApi;
  base: string = base;
  baseUrl = computed<string>(() => this.runService.$baseUrl());
  preurl = computed<string>(()=>this.runService.$preurl());
  hideTitle = input<boolean>(false);
  hideGroup = signal<any>({});
  pageSize = 15;
  accessToken = computed<string>(()=>this.userService.getToken());
  entry:any = createProxy({ currentStatus: 'drafted', data: {}},() => this.cdr.markForCheck());
  lookup:any = {};
  saving = signal<boolean>(false);
  submitting = signal<boolean>(false);
  lookupKey = {};
  entryId = input<number>(); // PERLU CHECK

  saved = output<any>();
  updated = output<any>();
  submitted = output<any>();
  closed = output<any>();
  action = input<string>('');
  _action: string;

  formId = input<number>();
  asComp = input<boolean>();
  loading = signal<boolean>(false);
  param = input<any>({});
  _param: any = {};
  formLoaded = output<any>();

  isEmpty = inputObject => inputObject && Object.keys(inputObject).length === 0;

  prevSignalKey: string = '';

  _this = createProxy({}, () => this.cdr.markForCheck());

  readonly entryForm = viewChild<NgForm>('entryForm');

  defaultParam: string = "{'$prev$.$id':$.$id}";

  liveSubscription: any = {};
  
  watchList = new Map();
  watchListSection: any = {};

  onInit:() => any;
  onSave:() => any;
  onSubmit:() => any;
  onView:() => any;

  invalidFacet = signal<boolean>(false);
  invalidFacetKey = signal<string>("");
  editWithoutId = signal<boolean>(false);

  sectionMap = signal<any>({});

  // scopeId = computed<string>(() => "form_"+this.formId()+'_'+this.action());
  scopeId = computed<string>(() => {
    const action = this.action() || '';
    const sanitizedAction = action
      .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/^[0-9]/, '_$&')        // Prefix numbers with underscore
      .replace(/_+/g, '_')             // Replace multiple underscores with single
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
    
    return `form_${this.formId()}_${sanitizedAction}`;
  });


  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));

    effect(() => {
      // require local variable sebab ada di update locally
      this._action = this.action();      
      this._param = this.param();
      this._navIndex.set(this.navIndex());

      const key = `${this.formId()}|${this.entryId()}|${this._action}|${this._param}`;

      if (this.formId() && this._param && this._action && this.user() && key != this.prevSignalKey) {
        this.prevSignalKey = key;
        this.getForm(this.formId(), this.entryId(), this._action);
        this.getLookupIdList(this.formId());
      }
    })

    this.valueUpdate
      .pipe(debounceTime(150))
      .subscribe((obj: any) => {
        // Call your search function here
        // console.log("valueUpdate")
        this.fieldChange(obj.event, obj.data, obj.field, obj.section);
      });
  }


  // formInactive = signal<boolean>(false);
  formInactive = computed(() => {
    const form = this.form();
    return (form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now());
  });

  ngOnInit() {
    this.appConfig = this.runService?.appConfig;
    // this.entry.update(c => ({ ...c, email: this.user()?.email }));
    this.entry.email= this.user()?.email;
  }

  dsChanged(ev, fieldCode) {
    this._this[fieldCode] = ev;
    this.fieldChange(ev, this.entry?.data, this.form().items[fieldCode], false)
    this.cdr.detectChanges();
  }

  toggleHideGroup(eCode: string, listKey: string): void {
    const key = eCode + listKey;
  
    this.hideGroup.update((currentGroup) => ({
      ...currentGroup,
      [key]: !currentGroup[key], // Toggle the value for the specific key
    }));
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  getForm(formId, entryId, action) {
    this.loading.set(true);
    this.runService.getRunForm(formId)
      .subscribe({
        next: form => {

          Object.defineProperty(window, '_this_'+this.scopeId(), {
            get: () => this._this,
            configurable: true,   // so you can delete it later 
            // writable: true,
          });  

          this.formLoaded.emit(form);
          this.form.set(form);
          let formTab = form.nav != 'simple' ? form.tabs : [{}]

          // TAMBAHAN UNTUK FEATURE HEAD & BOTTOM SECTION UNTUK TABBED NAV
          if (form.nav != 'simple') {
            this.sectionMap.update(sm=>({...sm,
              [-1]: this.filterSection(form.sections, ['section', 'list'], -1),
              [-999]: this.filterSection(form.sections, ['section', 'list'], -999)
            }));
          }

          formTab.forEach(tab => {
            this.sectionMap.update(sm=>({
              ...sm,
              [tab?.id]: this.filterSection(form.sections, ['section', 'list'], tab?.id)
            }));
          });

          // this.entry.update(c => ({ ...c, currentStatus: 'drafted', data: {} })); // reset entry 
          this.entry = {
            currentStatus: 'drafted',
            data:{}
          }
          // this.entry.currentStatus = 'drafted'; // reset entry 
          // this.entry.data = {}; // reset entry 
          this.onInit = () => this.initForm(form.f, this.entry.data, form);
          this.onView = () => this.initForm(form.onView, this.entry.data, form);
          this.onSave = () => this.initForm(form.onSave, this.entry.data, form);
          this.onSubmit = () => this.initForm(form.onSubmit, this.entry.data, form);

          this.loading.set(false);

          if (action == 'edit') {
            if (entryId || !this.isEmpty(this._param || {})) {
              // console.log("///////////")
              this.getData(entryId, form);
            } else {
              if (form.single) {
                this.getDataSingle(form);
              } else {
                this.editWithoutId.set(true);
              }
            }
          } else if (action == 'edit-single') {
            this.getDataSingle(form);
            // this.formInactive.set((form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now()))
          } else if (action == 'prev') {
            // this.formInactive.set((form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now()))
            this.getPrevData(entryId, this._param, form.prev);
          } else if (action == 'add') {
            // this.formInactive.set((form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now()))
            this.initForm(form.f, this.entry.data, form);
          } else if (form.x?.facet?.includes(action)) {
            if (entryId || !this.isEmpty(this._param || {})) {
              this.getData(entryId, form);
            }else{
              this.initForm(form.f, this.entry.data, form);
            }
            // this.initForm(this.form().f); //comment after change initform receive data parameter
          } else {
            this.invalidFacet.set(true);
            this.invalidFacetKey.set(action);
          }

          // make sure order of eval field is followed
          form.sections.forEach(s => {
            if (['section'].indexOf(s.type) > -1) { // watch for section eval. previously section+approval
              s.items.forEach(item => {
                if (form.items[item.code].type == 'eval') {
                  this.watchList.set(item.code, form.items[item.code].f)
                }
              });
            } else if (s.type == 'list') { // watch for section in list
              this.watchListSection[s.code] = new Map();
              s.items.forEach(item => {
                if (form.items[item.code].type == 'eval') {
                  this.watchListSection[s.code].set(item.code, form.items[item.code].f)
                }
              });
            }
          })

          this.evalAll(this.entry.data);
          this.filterTabs();
          this.filterItems();

          // perlu engkah lepas filterTabs(); Tp knak nya run twice??!!
          this.tabPostAction(this._navIndex());

        },
        error: err => {
          this.logService.log(`Error fetching form: ${err.message}`);
          this.loading.set(false);
        }
      });
  }

  // unAuthorizedMsg: string = "";

  unAuthorizedMsg = computed<string>(() => {
    const form = this.form();
    const user = this.user();
    const entry = this.entry;
    const app = this.app?.();

    if (!form?.x?.restrictAccess) return '';

    const groupAuthorized = !!form.accessList?.some(v => Object.keys(user.groups || {}).includes(v + ''));
    if (!groupAuthorized && !entry?.id) {
      return app?.x?.lang === 'ms'
        ? 'Anda tidak mempunyai akses kepada borang ini'
        : 'You are not authorized to access this form';
    }

    if (entry?.id) {
      let approverAuthorized = false;
      let userAuthorized = false;
      let condAuthorized = false;

      if (form.x?.accessByApprover) {
        const authorizer = Object.values(entry.approver ?? {}).join(',');
        approverAuthorized = authorizer.includes(user.email);
      }
      if (form.x?.accessByUser) {
        userAuthorized = entry.email === user.email;
      }
      if (form.x?.accessByCond) {
        condAuthorized = this.preCheckStr(form.x?.accessByCond, entry);
      }
      if (!(approverAuthorized || userAuthorized || condAuthorized)) {
        return app?.x?.lang === 'ms'
          ? 'Anda tidak mempunyai akses kepada maklumat ini'
          : 'You are not authorized to access this information';
      }
    }

    return '';
  });

  isAuthorized = computed<boolean>(() => this.checkAuthorized(this.form(), this.user(), this.entry));
  
  checkAuthorized = (form, user, entry) => {
    if (!form?.x?.restrictAccess) return true;

    const userGroups = Object.keys(user.groups || {});
    const accessList = form.accessList || [];

    const hasGroupAccess = accessList.some(v => userGroups.includes(v + ''));

    const isAddNoGroup = ['add', 'prev'].includes(this._action) && accessList.length === 0;
    const isSingleForm = !entry?.id && form.single;

    const isApprover = entry?.id && form.x?.accessByApprover &&
      Object.values(entry.approver || {}).join(',').includes(user.email);

    const isOwner = entry?.id && form.x?.accessByUser &&
      entry.email === user.email;

    const passesCondition = entry?.id && form.x?.accessByCond &&
      this.preCheckStr(form.x.accessByCond, entry);

    return hasGroupAccess || isApprover || isOwner || passesCondition || isAddNoGroup || isSingleForm;
  };
  // userUnauthorized by default is false
  // checkAuthorized = (form, user, entry) => {
  //   if (form?.x?.restrictAccess) {
  //     let groupAuthorized = false;
  //     let approverAuthorized = false;
  //     // let isAdd = false;
  //     let userAuthorized = false;
  //     let condAuthorized = false;
  //     let formSingle = false;

  //     let intercept = form.accessList?.filter(v => Object.keys(user.groups||{}).includes(v + ""));
  //     if (intercept.length > 0) {
  //       // this.form().accessList?.length == 0 || 
  //       // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
  //       groupAuthorized = true;
  //     } 
  //     // else {
  //     //   this.unAuthorizedMsg = this.app()?.x?.lang == 'ms' ? "Anda tidak mempunyai akses kepada borang ini" : "You are not authorized to access this form";
  //     // }
  //     // mn set restrict access + user + approver, time add request knak restrict sbb group x set yg allowed
  //     // so, condition nya always false.
  //     // tp mn include isAdd, bila da set group, nya always allow on on.
  //     // mn tambah condition (isAdd && this.form().accessList?.length==0)?
  //     let isAddNoGroup = ['add', 'prev'].includes(this._action) && this.form().accessList?.length == 0;

  //     if (entry?.id) {
  //       if (form.x?.accessByApprover) {
  //         let authorizer = Object.values(entry.approver).join(",")
  //         approverAuthorized = authorizer.includes(user.email)
  //       }
  //       if (form.x?.accessByUser) {
  //         userAuthorized = entry.email == user.email
  //       }
  //       if (form.x?.accessByCond) {
  //         condAuthorized = this.preCheckStr(form.x?.accessByCond, entry);
  //       }
  //       // if (!(approverAuthorized || userAuthorized || condAuthorized)) {
  //       //   this.unAuthorizedMsg = this.app()?.x?.lang == 'ms' ? "Anda tidak mempunyai akses kepada maklumat ini" : "You are not authorized to access this information" ;
  //       // }
  //     } else {
  //       formSingle = form.single;
  //     }

  //     // console.log("user", userAuthorized,"approver", approverAuthorized,"group", groupAuthorized,"cond",condAuthorized, "isAddNoGroup", isAddNoGroup,"formSingle", formSingle)
  //     return groupAuthorized || approverAuthorized || userAuthorized || condAuthorized || isAddNoGroup || formSingle;
  //   } else {
  //     return true;
  //   }
  // }

  getLookupIdList(id) {
    this.lookupService.getInForm(id, ['section', 'list'])
      .subscribe(res => {
        this.lookupIds = res;
        this.lookupIds.forEach(key => {
          this.lookupKey[key.code] = {
            ds: key.dataSource,
            type: key.type,
            skipLoadSource: key.skipLoadSource
          }

          // only pre-load lookup data if not select or text. select/text init param value might not available for loading
          // select/text also loaded when onfocus.
          if (['select', 'text'].indexOf(key.type) == -1 && !key.skipLoadSource) {
            this.getLookup(key.code, key.dataSourceInit, this.entry.data);
          }
        });
      });
  }

  lookupLoading = signal<any>({});

  lookupDataObs: any = {}
  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this.lookupLoading.update(l=>({...l,[code]: true}));
      this._getLookupObs(code, param, cb, err)
        .subscribe({
          next: res => {
            // this.lookup.update(o=>({...o,[code]: res}));
            this.lookup[code] = res;
            this.lookupLoading.update(l=>({...l,[code]: false}));
          }, error: err => {
            this.lookupLoading.update(l=>({...l,[code]: false}));
          }
        })
    }
  }

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
    if (this.lookupKey[code].type == 'modelPicker') {
      param = Object.assign(param || {}, { email: this.user().email });
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
          map((res: any) => res.content), share()
        )
    }
    return this.lookupDataObs[cacheId];
  }
  getLookup = (code, dsInit: string, dataV?: any) => {
    if (this.lookupKey[code]?.ds && !this.lookupKey[code].skipLoadSource) {
      if (!dataV) {
        dataV = this.entry.data;
      }
      var param = null;
      try {
        param = this._eval(dataV, dsInit, this.form());
      } catch (e) { this.logService.log(`{form-lookup-${code}-dsInit}-${e}`) }
      this._getLookup(code, param);
    }
  }

  getLookupSearch = (event, code, dsInit: string, dataV?: any) => {
    if (dsInit && dsInit.indexOf('$search$') > -1) {
      dsInit = dsInit.replace('$search$', event.term);
      this.getLookup(code, dsInit, dataV);
    }
  }

  // must run digest/filterItems to ensure rerun pre..
  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.form().appId, params, callback, error).pipe(tap(() => this.$digest$())))

  uploadFile = (obj, callback, error) => lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app()?.id, obj.file.name)
    .pipe(tap({ next: callback, error: error }), first()));


  navIndex = input<number>(0);
  _navIndex = signal<number>(0);
  navOutlet = viewChild<any>('nav')

  setActive = (index) => {
    this._navIndex.set(index);
    if (['tabs', 'pills'].indexOf(this.form().nav) > -1) {
      this.navOutlet().select(this._action + index);
    } else if (this.form().nav == 'accordions') {
      this.navOutlet().toggle(this._action + index);
    }
  }

  filteredTabs = signal<any>({});
  // filteredTabs = computed(()=> this.form().tabs.filter(t => this.preCheckStr(t.pre) && !(t.x?.facet?.[this._action] == 'none')));
  
  disabledTabs = signal<any>({});

  // xpat pake. Sebab mn data diload pake $http$ pasya assign ke entry, x trigger tok.
  // disabledTabs = computed(() => {
  //   this.entry;
  //   return this.filteredTabs().reduce((acc, t) => {
  //     acc[t.id] = (this.preCheckStr(t.x?.enableCond, false)) && (t.x?.facet?.[this._action] != 'disabled');
  //     return acc;
  //   }, {});
  // });

  filterTabs() {
    let filteredTabs = this.form().tabs.filter(t => this.preCheckStr(t.pre) && !(t.x?.facet?.[this._action] == 'none'));
    this.filteredTabs.set(filteredTabs);
    let disabledTabs = {};
    this.filteredTabs().forEach((t) => disabledTabs[t.id] = (this.preCheckStr(t.x?.enableCond, false)) && (t.x?.facet?.[this._action] != 'disabled'))
    this.disabledTabs.set(disabledTabs);
    // console.log(disabledTabs)
  }

  groupByPipe = new GroupByPipe();

  getPathForGrouping(code) {
    let fieldPath = code;
    if (code) {
      // let split = rootDotCode.split(".");
      let field = this.form().items[code];
      if (['select', 'radio'].indexOf(field?.type) > -1) {
        fieldPath += '.name';
      } else if (['modelPicker'].indexOf(field?.type) > -1) {
        fieldPath += '.' + field?.bindLabel;
      } else if (['date'].indexOf(field?.type) > -1) {
        fieldPath += '|date:' + (field.format ?? 'yyyy-MM-dd');
      }
    }
    return fieldPath;
  }

  timestamp: number = 0;
  preItem = signal<any>({});
  dynDefaultValue = signal<any>({});
  preSection = signal<any>({})
  classSection = signal<any>({})
  preCompFilter = signal<any>({})
  groupedChildList = signal<any>({})
  filterItems() {
    let preItem = {};
    let dynDefaultValue = {};
    let preSection = {}; 
    let classSection = {};
    let preCompFilter = {};
    let groupedChildList = {};
    this.form().sections.forEach(s => {
      preSection[s.id] = this.preCheckStr(s.pre);
      classSection[s.id] = this.compileTpl(s.style ?? '', {})
      if (preSection[s.id]) {
        // only evaluate items pre when section is available. If not, no need.
        if (s.type != 'list') {
          s.items.forEach(i => {
            preItem[i.code] = this.preCheckStr(this.form().items[i.code].pre);
            try {
              dynDefaultValue[i.code] = this._eval(this.entry?.data, this.form().items[i.code]?.x?.dyn_default, this.form());
            } catch (e) { }
            if (['dataset', 'screen'].indexOf(this.form().items[i.code].type) > -1) {
              try {
                preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam);
              } catch (e) { }
            }
            if (['checkboxOption', 'radio'].indexOf(this.form().items[i.code].type) > -1) {
              try {
                this.getLookup(i.code, this.form().items[i.code].dataSourceInit, this.entry?.data);
                // this.preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam)
              } catch (e) { }
            }
          })
        } else {
          preItem[s.code] = [];
          dynDefaultValue[s.code] = [];
          if (this.sectionSort()[s.code] || s.x?.sortable) {
            let sort = this.sectionSort()[s.code] ?? (s.x?.defSort ? {
              label: this.form().items[s.x?.defSort].label,
              field: s.x?.defSort,
              dir: s.x?.defSortDir
            } : {});
            // if ada section sort
            this.sortChild(s.code, sort.field, sort.label, sort.dir);
          }
          if (this.entry.data && Array.isArray(this.entry.data[s.code])) {
            // var groupedEntryList = this.groupByPipe.transform(this.entry.data[s.code], this.getPathForGrouping(s.x?.defGroupField));
            groupedChildList[s.code] = this.groupByPipe.transform(this.entry.data[s.code], this.getPathForGrouping(s.x?.defGroupField));

            var idx = 0;
            groupedChildList[s.code].forEach((ge, index_g) => {
              ge.value.forEach((child, index_c) => {                
                child.$index = idx++; // re-assign index
                var index = index_g + '-' + index_c;
                preItem[s.code][index] = {}
                dynDefaultValue[s.code][index] = {}
                s.items.forEach(i => {
                  preItem[s.code][index][i.code] = this.preCheckStr(this.form().items[i.code].pre, child);
                  try {
                    dynDefaultValue[s.code][index][i.code] = this._eval(this.entry?.data, this.form().items[i.code]?.x?.dyn_default, this.form());
                  } catch (e) { }
                  if (['dataset', 'screen'].indexOf(this.form().items[i.code].type) > -1) {
                    try {
                      preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam)
                    } catch (e) { }
                  }
                  if (['checkboxOption', 'radio'].indexOf(this.form().items[i.code].type) > -1) {
                    try {
                      this.getLookup(i.code, this.form().items[i.code].dataSourceInit, child);
                      // this.preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam)
                    } catch (e) { }
                  }
                })
              })
            })

            this.entry.data[s.code]?.forEach((child, index) => {
              child.$index = index; // re-assign index
              preItem[s.code][index] = {}
              dynDefaultValue[s.code][index] = {}
              s.items.forEach(i => {
                preItem[s.code][index][i.code] = this.preCheckStr(this.form().items[i.code].pre, child);
                try {
                  dynDefaultValue[s.code][index][i.code] = this._eval(this.entry?.data, this.form().items[i.code]?.x?.dyn_default, this.form());
                } catch (e) { }
                if (['dataset', 'screen'].indexOf(this.form().items[i.code].type) > -1) {
                  try {
                    preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam)
                  } catch (e) { }
                }
                if (['checkboxOption', 'radio'].indexOf(this.form().items[i.code].type) > -1) {
                  try {
                    this.getLookup(i.code, this.form().items[i.code].dataSourceInit, child);
                    // this.preCompFilter[i.code] = this._prePassive(this.entry?.data, this.form().items[i.code].dataSourceInit || this.defaultParam)
                  } catch (e) { }
                }
              })
            })
          }
        }
      }
    })
    this.preItem.set(preItem);
    this.dynDefaultValue.set(dynDefaultValue);
    this.preSection.set(preSection);
    this.classSection.set(classSection); 
    this.preCompFilter.set(preCompFilter);
    this.groupedChildList.set(groupedChildList);
    this.timestamp = Date.now();
  }

  preChildItem = signal<any>({})
  childDynDefaultValue = signal<any>({});
  filterChildItems(data, section) {
    let preChildItem = {}
    let childDynDefaultValue = {}
    section.items.forEach(i => {
      preChildItem[i.code] = this.preCheckStr(this.form().items[i.code].pre, data)
      try {
        childDynDefaultValue[i.code] = this._eval(this.entry?.data, this.form().items[i.code]?.x?.dyn_default, this.form());
      } catch (e) { }
      // if (['dataset','screen'].indexOf(this.form().items[i.code].type)>-1){
      //   this.preCompFilter[i.code]=this._prePassive(this.entry?.data,this.form().items[i.code].dataSourceInit||this.defaultParam)
      // }
    })
    this.preChildItem.set(preChildItem);
    this.childDynDefaultValue.set(childDynDefaultValue);
  }

  sectionSort = signal<any>({})

  sortChild(sectionKey, field, label, dir) {
    this.sectionSort.update(s => 
      ({ ...s, 
        [sectionKey]: { label: label, field: field, dir: dir } 
      })
    );
    let childs = this.entry.data[sectionKey];
    if (dir == 'desc') {
      childs?.sort((a, b) => (b[field] > a[field]) ? 1 : ((a[field] > b[field]) ? -1 : 0))
    } else {
      childs?.sort((a, b) => (a[field] > b[field]) ? 1 : ((b[field] > a[field]) ? -1 : 0))
    }
    this.entry[sectionKey] = childs;
    // this.entry.update(e => {
    //   return { ...e, data: { ...e.data, [sectionKey]: childs } };
    // });
  }


  valueUpdate = new Subject<any>();

  debFieldChange($event, data, field, section, index) {
    // EXTRACT BY AI
    if (field.x?.extractor) {
      if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())) {
        this.extractData(field, field.x?.extractor, [], $event, data, index);
      }
    }
    this.valueUpdate.next({ event: $event, data: data, field: field, section: section })
  }

  fieldChange($event, data, field, section) {
    if (field.post) { // PENYEBAB!!
      let postTxt = this.compileTpl(field.post, {})
      try {
        this._eval(data, postTxt, this.form());
      } catch (e) { this.logService.log(`{form-${field.code}-post}-${e}`) }
    }
    if (!section) {
      this.evalAll(data);
    } else {
      this.evalAllSection(data, section);
      this.evalAll(this.entry.data);
      // if da section, try filterChildItems
      this.filterChildItems(data, section);
    }

    // this.data

    this.filterTabs();
    // console.log(",,fieldchange,,", this.entry)
    // utk kes dataset, filterItems mungkin run awal gilak dari postaction, so preCompFilter mungkin belom proper
    // mn _prePassive direct value sentiasa diupdate.
    // need more study
    // update: dlm built-in anonymous function semua dh tap(filterItems);
    // console.log("fieldChange");
    this.filterItems(); // PENYEBAB!!

    this.cdr.detectChanges();
  }

  submit = (resubmit: boolean) => {
    this.saving.set(true);
    this._save(this.form())
      .subscribe({
        next: res => {
          this.entry = res;
          // this.entry.set(res);
          this.saving.set(false);
          this.submitting.set(true);
          this.cdr.detectChanges();
          this.entryService.submit(res.id, this.user().email, resubmit)
            .subscribe({
              next: res => {
                if (this.form().onSubmit) {
                  try {
                    this._eval(this.entry.data, this.form().onSubmit, this.form());
                  } catch (e) { this.logService.log(`{form-${this.form().title}-onSubmit}-${e}`) }
                }
                this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
                this.submitting.set(false);
                if (this.asComp()) {
                  this.submitted.emit(res);
                } else {
                  if (!(this.form().x && this.form().x.submitAndStay)) {
                    this.router.navigate([this.preurl(), "form", this.form().id, "view"], { queryParams: { entryId: res.id } });
                  }
                }
                this.cdr.detectChanges();
              }, error: err => {
                this.submitting.set(false);
                this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
              }
            })
        }, error: err => {
          this._handleSavingError(err);
        }
      })
  }


  getDataSingle(form) {
    this.entryService.getFirstEntryByParam(this._eval({}, form.singleQ, form), form.id)
      .subscribe({
        next: res => {
          // this.entry.set(res); //
          // Object.assign(this.entry, res); // why object assign?
          this.entry = res; //Object.assign(this.entry, res);
          this.evalAll(this.entry.data);
          this.initForm(form.f, this.entry.data, form);
          this.loading.set(false);
          this.cdr.detectChanges();
        }, error: err => {
          // consider getPrevData() but need to add support for prevParam;
          if (form.prev) {
            this.getPrevData(null, this.getPrevParam(this._eval({}, form.singleQ, form)), form.prev);
          } else {
            this.initForm(form.f, this.entry.data, form);
            this.loading.set(false);
          }
        }
      })
  }

  getPrevParam = (p: any) => {
    let obj = {};
    Object.keys(p).forEach(k => {
      if (k.includes('$prev$.')) {
        obj[k.replace('$prev$.', '$.')] = p[k];
      }
    })
    return obj;
  };

  filterSection = (sectionList, type, tab) => sectionList && sectionList.filter(s => type.indexOf(s.type) > -1 && (!tab || s.parent == tab));

  filesMap: any = {}
  getDataFiles(holder, id) {
    if (id) {
      this.filesMap[holder] = {};
      this.entryService.getEntryFiles(id)
        .subscribe(res => {
          res.content?.forEach(ea => this.filesMap[holder][ea.fileUrl] = ea);
        })
    }
  }

  getData(id: number, form: any): void {
    this.loading.set(true);

    const handleResponse = (res: any): void => {
      // console.log("## LOADED ENTRY", id, res.id);
      // this.entry.set(res);
      this.entry = res;
      this.getDataFiles('data', res.id);
      this.evalAll(this.entry.data);
      this.initForm(form.f, res.data, form);
      this.loading.set(false);
      // this.isAuthorized = this.checkAuthorized(this.form(), this.user(), this.entry);

      if (form.prev) {
        this.getPrevData(res.prev?.$id, {}, form.prev);
      } else {
        this.prevId.set(null);
        this.prevEntry = null;
        delete this.entry.prev;
      }
    };

    const handleError = (): void => {
      this.loading.set(false);
    };

    if (form){
      if (id) {
        // Fetch entry by ID
        this.entryService.getEntry(id, form.id).subscribe({
          next: handleResponse,
          error: handleError,
        });
      } else if (!this.isEmpty(this._param)) {
        // Fetch entry by parameters
        this.entryService.getFirstEntryByParam(this._param, form.id).subscribe({
          next: handleResponse,
          error: handleError,
        });
      } else if (form.single) {
        // Fetch single entry
        const singleQuery = this._eval({}, form.singleQ, form);
        this.entryService.getFirstEntryByParam(singleQuery, form.id).subscribe({
          next: handleResponse,
          error: handleError,
        });
      }
    }
  }


  prevId = signal<number>(null);
  prevEntry:any = null;
  prevLoading = signal<boolean>(false);
  getPrevData(id: number, params: any, form: any): void {
    this.prevLoading.set(true);

    const handleResponse = (res: any): void => {
      this.prevId.set(res.id);
      this.prevEntry = res;
      // this.entry.prev = res.data;
      // this.entry.update(e=>({...e, prev: res.data}))
      this.entry.prev = res.data;
      this.getDataFiles('prev', res.id);
      this.evalAll(this.entry.data);
      this.initForm(form?.onView, res.data, form);
      this.initForm(this.form().f, this.entry.data, this.form()); // evaluate current form
      this.prevLoading.set(false);
    };

    const handleError = (): void => {
      this.prevLoading.set(false);
    };

    if (id) {
      this.entryService.getEntry(id, form?.id).subscribe({
        next: handleResponse,
        error: handleError,
      });
    } else {
      this.entryService.getFirstEntryByParam(params, form?.id).subscribe({
        next: handleResponse,
        error: handleError,
      });
    }
  }

  progBack(index) {
    this.saving.set(true);
    this._save(this.form())
      .subscribe({
        next: res => {
          this.saving.set(false);
          this.tabPostAction(index - 1);
          this.setActive(index - 1); // utk tukar tab
        },
        error: err => {
          this._handleSavingError(err);
        }
      })
  }

  progNext(index) {
    this.saving.set(true);
    this._save(this.form())
      .subscribe({
        next: res => {
          this.saving.set(false);
          this.tabPostAction(index + 1);
          this.setActive(index + 1); // utk tukar tab
        },
        error: err => {
          this._handleSavingError(err);
        }
      })
  }

  _handleSavingError(err) {
    this.saving.set(false);
    let errorText = "";
    if (err.error) {
      const errorTitle = err.error?.message || "An error occurred";
      const errorList = err.error?.errors?.length > 0
        ? err.error.errors.map((str) =>
          str.replace(/\$\.(.*?):/, (_, key) =>
            this.form().items[key] ? `${this.form().items[key].label}: ` : ""
          )
        ).join("<br/>")
        : "";
      errorText = errorList ? `${errorTitle} <hr> ${errorList}` : errorTitle;
    } else {
      errorText = err.message || "An unknown error occurred";
    }
    this.toastService.show("Problem saving: " + errorText, { classname: 'bg-danger text-light' });
  }

  tabPostAction(index) {
    // this._navIndex.set(index);
    var curTab = this.filteredTabs()[index];
    if (curTab && curTab?.x?.post) {
      let postTxt = this.compileTpl(curTab?.x?.post, {})
      try {
        this._eval(this.entry.data, postTxt, this.form());
      } catch (e) { this.logService.log(`{form-${this.form().title}-onSave}-${e}`) }
    }

  }

  save = () => {
    this.saving.set(true);
    this._save(this.form())
      .subscribe({
        next: res => {
          // this.entry.set(res);
          this.entry = res;
          this.saving.set(false);
          this.cdr.detectChanges();
          if (this.form().onSave) {
            try {
              this._eval(this.entry.data, this.form().onSave, this.form());
            } catch (e) { this.logService.log(`{form-${this.form().title}-onSave}-${e}`) }
          }
          // this.router.navigate(["run", this.form().app.id, "form", this.form().id, "view", this.entry.id]);
          this.toastService.show("Entry saved successfully", { classname: 'bg-success text-light' });

          if (!(this.form().x && this.form().x.saveAndStay)) {
            if (this.asComp()) {
              this.saved.emit(res);
            } else {
              this.router.navigate([this.preurl(), "form", this.form().id, "view"], { queryParams: { entryId: this.entry.id } });
            }
          }else{
            this.updated.emit(res); // emit updated to ensure list is updated
          }
        }, error: err => {
          this._handleSavingError(err);
        }
      })
  }

  _save = (form) => {
    let userKey = this.user().email;
    if (form?.x?.userKey) {
      userKey = this.compileTpl(form?.x?.userKey, {})
    }

    if (form?.prev && !this.prevId()) {
      return throwError(() => new Error("Previous entry is required"));
    }

    return this.entryService.save(form.id, this.entry, this.prevId(), userKey)
      .pipe(
        tap({
          next: (e) => {
            // this.entry.set(e);
            this.entry = e;
            // this.timestamp = Date.now();
            this.filterItems();

            this.linkFiles(e);
            // this.$digest$(); // this prevent ask navigate to be displayed!! NOT-WORKING. Actual reason for dirty is html keep-value
            this.entryForm().form.markAsPristine();
            this.cdr.detectChanges();
          }
        }), first()
      )
  }

  linkFiles(e) {
    this.entryService.linkFiles(e.id, this.entryFiles, this.user().email)
      .subscribe(res => { });
  }

  // file: any = {}

  preCheckStr(code, dataV?: any) {
    let res = undefined;
    try {
      if (!dataV) {
        dataV = this.entry.data;
      }
      res = this._prePassive(dataV, code);
    } catch (e) { this.logService.log(`{form-precheck}-:${code}:${e}`) }
    return !code || res;
  }

  timeoutList: any[] = [];
  _setTimeout = (functionRef, delay, ...param) => {
    let timeoutId = setTimeout(() => {
      functionRef();
      this.$digest$();
    }, delay, ...param)
    this.timeoutList.push(timeoutId);
  }

  intervalList: any[] = [];
  _setInterval = (functionRef, delay, ...param) => {
    let intervalId = setInterval(() => {
      functionRef();
      this.$digest$();
    }, delay, ...param)
    this.intervalList.push(intervalId);
  }

  evalAll(data) {
    this.watchList.forEach((value, key) => {
      data[key] = this.changeEval(data, value);
    })
  }

  evalAllSection(data, section) {
    this.watchListSection[section.code]?.forEach((value, key) => {
      data[key] = this.changeEval(data, value);
    })
  }

  changeEval(data, js) {
    let res = undefined;
    try {
      res = this._eval(data, js, this.form());
    } catch (e) { this.logService.log(`{form-${this.form().title}-change}-${e}`) }
    return res;
  }

  $digest$ = () => {
    this.filterTabs();
    this.filterItems();
    this.evalAll(this.entry.data);
    this.cdr.detectChanges()
  }

  // added data parameter because form with prev data, prev view initform will evaluate this.entry.data instead of with previous data
  initForm(js, data, form) {
    let res = undefined;

    let jsTxt = this.compileTpl(js, {})
    // setTimeout(()=>{ // timeout utk flush DOM (utk markdown, mermaid n echarts)
    try {
      res = this._eval(data, jsTxt, form);
    } catch (e) { this.logService.log(`{form-${this.form().title}-initForm}-${e}`) }
    this.filterTabs();
    this.filterItems();
    // },0)

    return res;
  }

  loadScript = loadScript;

  log = (log) => this.logService.log(JSON.stringify(log));

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  elMap: any = {}
  $q = (el) => {
    if (!this.elMap[el]) {
      this.elMap[el] = document.querySelector(el);
    }
    return this.elMap[el];
  }

  openNav = (opened: boolean) => {
    this.pageTitleService.open(opened);
  }

  // _eval = (data, v, form) => new Function('setTimeout', 'setInterval', '$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$action$', '$setAction$', '$lookup$', '$http$', '$post$', '$upload$', '$endpoint$', '$saveAndView$', '$save$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$activeIndex$', '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$ngForm$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$file$', 'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
  //   `return ${v}`)(this._setTimeout, this._setInterval, this.app(), this.entry, data, this.entry?.prev, this.user(), this.runService?.appConfig, this._action, this.setAction, this._getLookup, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, this.save, () => this._save(form || this.form()), this.submit, form?.items || this.form()?.items, form || this.form(), this._this, this.loadScript, this.$digest$, this._param, this.log, this.setActive, this._navIndex(), this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl(), this.baseApi, this.entryForm(), this.lookup, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken(), deepMerge, this.http, this.filesMap, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);

  // _prePassive = (data, v) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$action$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$ngForm$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$file$', '$activeIndex$',
  //   `return ${v}`)(this.app(), this.entry, data, this.entry?.prev, this.user(), this.runService?.appConfig, this._action, this.form()?.items, this.form(), this._this, this.$digest$, this._param, this.log, this.base, this.baseUrl(), this.baseApi, this.entryForm(), this.lookup, dayjs, ServerDate, this.accessToken(), this.filesMap, this._navIndex());

  getEvalContext = (entry:any, data: any, approval:any, form: any, includeActive: boolean = false, additionalData: any = {}) => {
    let passive = {
      // READ ONLY CONTEXT
      // CAN BE USED IN TEMPLATE
      $app$: this.app(),
      // $screen$: this.screen,
      $_: entry,
      $: data,
      $$_: approval,
      $$: Object.values(approval || {}).map((appr: any) => appr?.data),
      $prev$: entry?.prev,
      $user$: this.user(),
      $conf$: this.appConfig,
      $action$: this._action,
      $el$: form?.items || this.form()?.items,
      $form$: form || this.form(),
      $this$: this._this,
      $param$: this.param(),
      $base$: this.base,
      $baseUrl$: this.baseUrl(),
      $baseApi$: this.baseApi,
      $ngForm$: this.entryForm(),
      $lookupList$: this.lookup,
      dayjs,
      ServerDate,
      $token$: this.accessToken(),
      $file$: this.filesMap,
      $activeIndex$: this._navIndex(),
    }
    let active = {
      $log$: this.log,
      $setAction$: this.setAction,
      $lookup$: this._getLookup,
      $http$: this.httpGet,
      $post$: this.httpPost,
      $upload$: this.uploadFile,
      $endpoint$: this.endpointGet,
      setTimeout: this._setTimeout,
      setInterval: this._setInterval,
      $digest$: this.$digest$,

      $saveAndView$: this.save,
      $save$: () => this._save(form || this.form()),
      $submit$: (resubmit: boolean) => this.submit(resubmit),

      $loadjs$: this.loadScript,
      $activate$: this.setActive,
      $toast$: this.$toast$,
      $update$: this.updateField,
      $updateLookup$: this.updateLookup,

      echarts,

      $live$: this.runService?.$live$(this.liveSubscription, this.$digest$),
      $merge$: deepMerge,
      $web$: this.http,

      onInit: this.onInit,
      onSave: this.onSave,
      onSubmit: this.onSubmit,
      onView: this.onView,
      // $go: this.goObj,
      // $popup: this.popObj, 
      $q$: this.$q,
      $showNav$: this.openNav,
    };

    return includeActive ? { ...passive, ...active, ...additionalData } : { ...passive, ...additionalData };
  }

  _eval = (data: any, v: string, form: any) => {
    const bindings = this.getEvalContext(this.entry,data, this.entry?.approval, form, true, {});
    const argNames = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
      `return ${v}`)(...argValues);
  }

  _prePassive = (data: any, v: string) => {
    const bindings = this.getEvalContext(this.entry,data, this.entry?.approval, this.form(), false, {});
    const argNames = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
      `return ${v}`)(...argValues);
  }

  setAction = (action) => this._action = action;

  /** Need to study either to implement deepMerge when updated entry: refer view-component */
  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.form().appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => {
          this.$digest$();
          if (this.asComp()) {
            this.updated.emit(this.entry); // why emit saved here? it will close modal in dataset
          }
        }),
        first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.form().appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => this.filterItems()),
        first()
      ));
  }

  // childPreItem:any = {};
  editChildData: any;
  editChildItems: any;
  editChild(content, section, data, isNew) {
    this.editChildData = data;
    this.editChildItems = { section: section }
    // this.preItem[section.code]={}

    // $index perlu diset awal supaya dlm template bleh pass sbg index_child
    this.editChildData['$index'] = this.entry.data[section.code] ? this.entry.data[section.code].length : 0;

    this.filterChildItems(data, section);

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        /** Ada evaluated field main masok dlm child sebab evalAll(data) kt fieldChange */
        if (res) {
          Object.assign(data, res); // why Object.assign? Adakah sebab mok mutate data?
        }
        if (isNew) {
          if (!this.entry.data[section.code]) {
            this.entry.data[section.code] = []
          }
          // res['$index'] = this.entry.data[section.code].length;
          this.entry.data[section.code].push(res);
        }
        this.entryForm().form.markAsDirty();
        this.evalAll(this.entry.data);
        this.filterItems();
      }, err => { });
  }

  removeChild(section, $index) {
    if (section.confirmable) {
      if (confirm("Are you sure you want to remove this data?")) {
        this.entry.data[section.code].splice($index, 1);
        this.entryForm().form.markAsDirty();
      }
    } else {
      this.entry.data[section.code].splice($index, 1);
      this.entryForm().form.markAsDirty();
    }
    this.$digest$();
  }

  onFileClear($event, data, f, evalEntryData, index, index_child) {
    // console.log("FIle SELECT:" + $event);
    /** Problem, bila user click Cancel, akan remove suma dlm entryFIles
     * sbb $event return current file value;
     * FIXED: Handle sebelah field-edit. If file length == 0, then dont trigger clear
     */
    // if ($event!=data[f.code]) {

    var fileList = f.subType.indexOf('multi') > -1 ? $event : [$event];
    this.entryService.deleteAttachment($event)
      .subscribe(res => {
        // delete this.uploadProgress[f.code + (index ?? '') + (index_child ?? '')];
        this.uploadProgress.update((currentProgress) => {
          const { [f.code + (index ?? '') + (index_child ?? '')]: _, ...updatedProgress } = currentProgress;
          return updatedProgress;
        });
        this.fieldChange($event, data, f, evalEntryData);
        fileList.forEach(file => {
          this.entryFiles.splice(this.entryFiles.indexOf(file), 1);
          delete this.filesMap[file];
        })
      });
    // }
  }

  entryFiles: any[] = [];

  uploadProgress = signal<any>({});

  onUpload(fileList, data, f, evalEntryData, index, index_child) {

    if (fileList && fileList.length) {
      var totalSize = fileList.reduce((total, i) => total + i.size, 0);
      var progressSize = 0;
      if (['image', 'imagemulti'].indexOf(f.subType) > -1) {

        // optimize image file here (ie: resize, compress)
        // files = compressImage(files, 300, 300)
        // const resizedImage = await resizeImage(config)
        if (f.subType == 'imagemulti') {
          var list = [];
          for (var i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            resizeImage({
              file: file,
              maxSize: f.v.max
            }).then(resizedImage => {
              let filename = file.name;
              if (f.x?.filenameTpl && f.x?.bucket) {
                let ext = getFileExt(filename);
                filename = this.compileTpl(f.x?.filenameTpl, { $unique$: Date.now(), $file$: file }) + ext;
              }
              this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form().appId, filename)
                .subscribe({
                  next: res => {
                    this.processUpload(res, data, fileList, evalEntryData, progressSize, f, totalSize, index, index_child, true, list);
                  }, error: err => {
                    this.toastService.show("File upload failed: " + err.error?.message, { classname: 'bg-danger text-light' });
                    console.error(err);
                  }
                })
            }).catch(function (err) {
              console.error(err);
            });
          }
        } else {
          resizeImage({
            file: fileList[0],
            maxSize: f.v.max
          }).then(resizedImage => {
            let filename = fileList[0].name;
            if (f.x?.filenameTpl && f.x?.bucket) {
              let ext = getFileExt(filename);
              filename = this.compileTpl(f.x?.filenameTpl, { $unique$: Date.now(), $file$: fileList[0] })
                + ext;
            }
            this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form().appId, filename)
              .subscribe({
                next: res => {
                  this.processUpload(res, data, fileList, evalEntryData, progressSize, f, totalSize, index, index_child, false, list);
                }, error: err => {
                  this.toastService.show("File upload failed: " + err.error?.message, { classname: 'bg-danger text-light' });
                }
              })
          }).catch(function (err) {
            console.error(err);
          });
        }
      } else {
        if (f.subType == 'othermulti') {
          var list = [];
          for (var i = 0; i < fileList.length; i++) {
            var file = fileList[i];
            if (f.v.max && file.size > f.v.max * 1024 * 1024) {
              return;
            }
            let filename = file.name;
            if (f.x?.filenameTpl && f.x?.bucket) {
              let ext = getFileExt(filename);
              filename = this.compileTpl(f.x?.filenameTpl, { $unique$: Date.now(), $file$: file })
                + ext;
            }
            this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form().appId, file.name)
              .subscribe({
                next: res => {
                  this.processUpload(res, data, fileList, evalEntryData, progressSize, f, totalSize, index, index_child, true, list);
                },
                error: err => {
                  this.toastService.show("File upload failed: " + err.error?.message, { classname: 'bg-danger text-light' });
                }
              })
          }
        } else {
          var file = fileList[0];
          // this.fileLarge[f.id]=[]
          if (f.v.max && file.size > f.v.max * 1024 * 1024) {
            return;
          }
          let filename = file.name;
          if (f.x?.filenameTpl && f.x?.bucket) {
            let ext = getFileExt(filename);
            filename = this.compileTpl(f.x?.filenameTpl, { $unique$: Date.now(), $file$: file })
              + ext;
          }
          this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form().appId, filename)
            .subscribe({
              next: res => {
                this.processUpload(res, data, fileList, evalEntryData, progressSize, f, totalSize, index, index_child, false, list);
              },
              error: err => {
                console.log(err)
                this.toastService.show("File upload failed: " + err.statusText, { classname: 'bg-danger text-light' });
              }
            })
        }
      }
    }
  }

  processUpload(res, data, fileList, evalEntryData, progressSize, f, totalSize, index, index_child, multi, list) {
    if (res.type === HttpEventType.UploadProgress) {
      progressSize = res.loaded;
      // console.log("progressSize",progressSize);
      this.uploadProgress.update(curr => ({...curr, [f.code + (index ?? '') + (index_child ?? '')]: Math.round(100 * progressSize / totalSize)}));
    } else if (res instanceof HttpResponse) {
      if (res.body?.success) {
        this.uploadProgress.update(curr => ({...curr, [f.code + (index ?? '') + (index_child ?? '')]: 100}));
        if (multi) {
          list.push(res.body.fileUrl)
          data[f.code] = list
        } else {
          data[f.code] = res.body.fileUrl;
        }
        // data[f.code] = multi?[res.body.fileUrl]:res.body.fileUrl;
        this.filesMap[res.body.fileUrl] = res.body;
        this.fieldChange(fileList, data, f, evalEntryData);
        this.entryFiles.push(res.body.fileUrl);

        if (f.x?.extractor) {
          this.extractData(f, f.x?.extractor, [res.body.fileUrl], null, data, index);
        }
        if (f.x?.imgcls) {
          this.imgclsData(f, f.x?.imgcls, [res.body.fileUrl], data, index);
        }
      } else {
        this.toastService.show(res.body?.message, { classname: 'bg-danger text-light' });
      }
    }
  }

  onBlur($event, data, field, section, index) {
    if (field.x?.extractor) {
      // if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())){
      this.extractData(field, field.x?.extractor, [], data[field.code], data, index);
      // }
    }
    if (field.x?.txtcls) {
      // if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())){
      this.classifyData(field, field.x?.txtcls, field.x?.txtclsTarget, data[field.code], data, index);
      // }
    }
  }

  editLookupItem: any = {};
  editLookupEntryData: any = {};
  editLookupEntry(content, field, entryData, value) {
    this.lookupService.getLookup(field.dataSource)
      .subscribe(lookup => {
        this.editLookupItem = lookup;
        this.editLookupEntryData = value;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
          .result.then(data => {
            if (lookup.x?.codeHidden) {
              data.code = data.name
            }
            this.lookupService.saveEntry(lookup.id, data)
              .subscribe({
                next: (res) => {
                  this.getLookup(field.code, field.dataSourceInit, entryData);
                  if (['select', 'radio', 'radioBtn'].indexOf(field.type) > -1) {
                    entryData[field.code] = res;
                  }
                  if (['checkboxOption'].indexOf(field.type) > -1) {
                    if (!entryData[field.code]) {
                      entryData[field.code] = [];
                    }
                    entryData[field.code]?.push(res);
                  }
                  this.toastService.show("Entry successfully saved", { classname: 'bg-success text-light' });
                }, error: (err) => {
                  this.toastService.show("Entry saving failed", { classname: 'bg-danger text-light' });
                }
              })
          }, res => { })
      })
  }

  extractLoading = signal<any>({});
  extractData(field, cognaId, docList, text, data, index) {
    this.extractLoading.update(curr=> ({...curr, [field.code + (index ?? '')]: true}));
    this.runService.cognaExtract(cognaId, text, docList, false, this.user().email)
      .subscribe({
        next: res => {
          var rval = res[0];
          delete rval[field.code];
          data = deepMerge(data, rval);
          this.evalAll(data);
          this.filterItems();
          this.extractLoading.update(curr=>({...curr,[field.code + (index ?? '')]: false}));
        },
        error: err => {
          this.extractLoading.update(curr=>({...curr,[field.code + (index ?? '')]: false}));
        }
      });
  }

  classifyLoading = signal<any>({})
  classifyData(field, cognaId, targetField, text, data, index) {
    this.classifyLoading.update(curr=>({...curr, [field.code]: true}));
    this.runService.cognaClassify(cognaId, text, false, this.user().email)
      .subscribe({
        next: res => {
          data[targetField] = res.data;
          this._this[field.code] = { txtcls: res.data }
          this.filterItems();
          this.classifyLoading.update(curr=>({...curr,[field.code + (index ?? '')]: false}));
        },
        error: err => {
          this.classifyLoading.update(curr=>({...curr,[field.code + (index ?? '')]: false}));
        }
      });
  }

  imgclsLoading = signal<any>({})
  imgclsVal: any = {}
  imgclsModel: any = {}
  imgclsData(field, cognaId, docList, data, indexChild) {
    this.imgclsLoading.update(curr=>({...curr, [field.code + (indexChild ?? '')]: true}));
    this.runService.cognaImgCls(cognaId, docList, false, this.user().email)
      .subscribe({
        next: res => {
          let txtList = [];
          Object.keys(res).forEach(k => {
            let txt = ""
            txt += k + "\n"
            res[k].forEach((pred, index) => {
              txt += ((index + 1) + ") " + pred.desc + " (" + pred.score + ")\n");
            })
            txtList.push(txt);
          })
          data[field.x?.imgclsTarget] = txtList.join("\n\n");
          // masalah dgn multi file upload
          this._this[field.code + (indexChild ?? '')] = { imgcls: res }
          this.filterItems();
          this.imgclsLoading.update(curr=>({...curr, [field.code + (indexChild ?? '')]: false}));
          if (field?.v?.imgcls) {
            var imgclsres = Object.values(res).map((i: any[]) => i.map(j => j.desc).join(",")).join(",");
            this.imgclsVal[field.code + (indexChild ?? '')] = (imgclsres ?? '').includes(field?.v?.imgcls) ? true : false;
            // console.log("imgclsVal", this.imgclsVal)
          }
        },
        error: err => {
          this.imgclsLoading.update(curr=>({...curr, [field.code + (indexChild ?? '')]: false}));
        }
      });
  }

  compileTpl = (code, additionalData) => {
    let obj = Object.assign(additionalData, { 
      $user$: this.user(), $: this.entry?.data, $_: this.entry, 
      $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl(), $baseApi$: this.baseApi, 
      $this$: this._this, $param$: this._param, $ngForm$: this.entryForm() 
    });
    return compileTpl(code, obj, this.scopeId())
  }

  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  // reason nya xmok swap b4 tok sbb nya linked by reference, perlu pake Object.assign()
  reorder(items, index, op) {
    items[index + op].altClass = 'swapStart';
    items[index].altClass = 'swapStart';

    items.forEach((i, $index) => {
      i.sortOrder = $index;
    }); // ensure current sortorder using index, to prevent jumping ordering

    var temp = Object.assign({}, items[index + op]);
    var tempSortOrder = items[index + op].sortOrder;
    items[index + op].sortOrder = items[index].sortOrder;
    items[index + op] = Object.assign({}, items[index]); // consider deepMerge

    items[index].sortOrder = tempSortOrder;
    items[index] = temp;
    // this.swapPositions(items,index,index+op);
    setTimeout(() => {
      items[index + op].altClass = 'swapEnd';
      items[index].altClass = 'swapEnd';
      this.cdr.detectChanges();
    }, 500);
    
    this.$digest$();
  }

  canDeactivate() {
    return !(this.form()?.x?.askNavigate && this.entryForm()?.dirty); //asknavigate && dirty --> modal
  }

  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key => this.liveSubscription[key].unsubscribe());//(sub => sub.unsubscribe());
    this.intervalList.forEach(i => clearInterval(i));
    this.timeoutList.forEach(i => clearTimeout(i));
  }
}