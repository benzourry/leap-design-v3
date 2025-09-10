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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbAccordionDirective, NgbModal, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';
import { base, baseApi } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { LogService } from '../../_shared/service/log.service';
import { first, map, share, tap } from 'rxjs/operators';
import { ServerDate, btoaUTF, compileTpl, createProxy, deepEqual, deepMerge, hashObject, loadScript, resizeImage } from '../../_shared/utils';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { KeyValue, NgClass, DatePipe, KeyValuePipe, JsonPipe } from '@angular/common';
import { lastValueFrom, Observable, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { InitDirective } from '../../_shared/directive/init.directive';
import { FormsModule } from '@angular/forms';
import { FieldEditComponent } from '../_component/field-edit-b/field-edit-b.component';
import { FieldViewComponent } from '../_component/field-view.component';
import { FormViewComponent } from '../_component/form-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { PageTitleService } from '../../_shared/service/page-title-service';

@Component({
    selector: 'app-view',
    templateUrl: './view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./view.component.css'],
    imports: [PageTitleComponent, FormsModule, FormViewComponent, NgClass, InitDirective,
      FieldEditComponent, FaIconComponent, FieldViewComponent, RouterLink, DatePipe, KeyValuePipe]
})
export class ViewComponent implements OnInit, OnDestroy {

  private userService = inject(UserService);
  private modalService = inject(NgbModal);
  private entryService = inject(EntryService);
  private lookupService = inject(LookupService);
  private runService = inject(RunService);
  private utilityService = inject(UtilityService);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private cdr = inject(ChangeDetectorRef);
  private pageTitleService = inject(PageTitleService);

  lookupIds: any[];
  user = computed<any>(() => this.runService.$user());
  baseApi: string = baseApi;
  base: string = base;
  prevEntry:any = createProxy({ data: {} },()=>this.cdr.markForCheck());
  
  entry:any = createProxy({ data: {} },()=>this.cdr.markForCheck());
  form = signal<any>({ tiers: [] });

  appId: number;
  entryId = input<number>();
  _entryId:number;

  formId = input<number>();
  _formId:number;
  asComp = input<boolean>();
  action = input<string>();
  approved = output<any>()
  closed = output<any>();
  submitted = output<any>();
  isEmpty = inputObject => inputObject && Object.keys(inputObject).length === 0;
  param = input<any>({});
  _param:any = {};
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  baseUrl = computed<string>(() => this.runService.$baseUrl());
  preurl = computed<string>(()=>this.runService.$preurl());
  accessToken = computed<string>(()=>this.userService.getToken());

  navIndex = input<number>(0);
  _navIndex = signal<number>(0);

  hideTitle = input<boolean>(false);

  offline = signal<boolean>(false);

  prevSignalKey:string='';

  appConfig:any = this.runService.appConfig;

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

  filesMap: any = {}


  
  constructor() {
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));

    effect(()=>{

      if (this.formId() && this._formId != this.formId()){
        this.getLookupIdList(this.formId());
      }

        this._entryId = this.entryId();
        this._formId = this.formId();

      const key = `${this._formId}|${this._entryId}|${this.user()?.email}`;

      if (this._formId && this.user() && (this.prevSignalKey != key || !deepEqual(this._param, this.param()))){ // kadang2 without entryId and use param instead
        this.prevSignalKey = key;
        this._param = this.param();
        this.getForm(this._formId, this._entryId);
      }

      this._navIndex.set(this.navIndex());

      // this.approval.email = this.user()?.email;

    })
  }

  liveSubscription: any = {};
  
  ngOnInit() {
    this.appConfig = this.runService.appConfig;
    this.timestamp.set(Date.now());
  }

  appr: any = {}; // placeholder for approval form data
  loading = signal<boolean>(true);

  filterSection = (sectionList, type, tab) => sectionList && sectionList.filter(s => type.indexOf(s.type) > -1 && (!tab || s.parent == tab));

  preCheckStr(code, dataV?: any) {
    let res = undefined;
    try {
      if (!dataV) {
        dataV = this.entry.data;
      }
      res = this._pre(dataV, code);
    } catch (e) { this.logService.log(`{view-precheckStr}-:${code}:${e}`) }
    return !code || res;
  }

  preCheckAppr(code, appr: any) { // approval object, ie: {data:{}}
    let res = undefined;
    try {
      res = this._preAppr(appr, code);
    } catch (e) { this.logService.log(`{view-${code}-precheckAppr}-${e}`) }
    return !code || res;
  }

  // evalAllEntry(entry,data) { // should be {data:{}} structure, ie: approval, entry
  //   this.watchList.forEach((value, key) => {
  //     if (!entry) {
  //       entry = { data: {} }
  //     }
  //     entry.data[key] = this.changeEval(entry,data,{},value);// changeEval nya fix dgn entry,data,approval
  //   })
  // }

  watchList = new Map();
  watchListSection: any = {};
  evalAllApproval(appr) { // should be {data:{}} structure, ie: approval, entry
    this.watchList.forEach((value, key) => {
      if (!appr) {
        appr = { data: {} }
      }
      appr.data[key] = this.changeEval(this.entry,this.entry?.data,appr,value);
    })
  }

  // evalAllSection(entry, data, appr, section) {
  //   this.watchListSection[section.code].forEach((value, key) => {
  //     data[key] = this.changeEval(entry, data, appr, value);
  //   })
  // }

  timestamp = signal<number>(0);

  changeEval(entry, data, appr, js) {
    let res;
    try {
      res = this._eval(entry, data, appr, js, this.form());
    } catch (e) { this.logService.log(`{view-${this.form().title}-changeEval}-${e}`) }
    return res;
  }

  lookup:any = {};

  lookupKey:any = {};

  getLookupIdList(id:number) {
    this.lookupService.getInForm(id, ['approval'])
      .subscribe(res => {
        this.lookupIds = res;
        this.lookupIds.forEach((key) => {
          this.lookupKey[key.code] = {
            ds: key.dataSource,
            type: key.type,
            dsInit: key.dataSourceInit
          }
          if (['select', 'text'].indexOf(res.type) == -1) {
            this.getLookup(key.code, {}, key.dataSourceInit);
          }
        });
      });
  }

  lookupLoading: any = {}
  lookupDataObs: any = {}

  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this.lookupLoading[code] = true;
      this._getLookupObs(code, param, cb, err)
        .subscribe({
          next: res => {
            this.lookup[code] = res;
            this.lookupLoading[code] = false;
          }, error: err => {
            this.lookupLoading[code] = false;
          }
        })
    }
  }

  _getLookupObs(code, param, cb?, err?): Observable<any> {

    var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}),null);
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
      param = Object.assign(param || {}, {});
      this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
        .pipe(
          tap({ next: cb, error: err }), first(),
          map((res:any) => res.content), share()
        )
    }
    return this.lookupDataObs[cacheId];
  }


  // need appr data sebab perlu eval dgn appr value via $$.
  getLookup = (code, appr?, dsInit?: string) => {
    let param = null;
    try {
      param = this._eval(this.entry, this.entry.data, appr, dsInit, this.form());
    } catch (e) { this.logService.log(`view-{${code}-dsInit}-${e}`) }

    if (code && this.lookupKey[code]) {
      this._getLookup(code, param);
    }
  }

  getLookupSearch = (event, code, appr, dsInit: string) => {
    if (dsInit.indexOf('$search$') > -1) {
      dsInit = dsInit.replace('$search$', event.term);
      this.getLookup(code, appr, dsInit);
    }
  }

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.form().appId, params, callback, error)
  // must run digest/filterItems to ensure rerun pre..
  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.form().appId, params, callback, error).pipe(tap(()=>this.$digest$())))
  
  uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app()?.id, obj.file.name)
    .pipe( tap({ next: callback, error: error }), first() ));



  loadScript = loadScript;

  $digest$ = () => {
    this.cdr.detectChanges()
    this.timestamp.set(Date.now()); // setting new value for timestamp will force effect in field-view
  }

  readonly navOutlet = viewChild<NgbNav | NgbAccordionDirective>('nav');
  setActive = (index) => {
    this._navIndex.set(index);
    const navOutlet = this.navOutlet();
    if (navOutlet instanceof NgbNav) {
      navOutlet.select('view' + index);
    } else if (navOutlet instanceof NgbAccordionDirective) {
      navOutlet.expand('view' + index);
    }
  }

  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.form().appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap({
          next: (res: any) => {
            if (res?.id == this.entry?.id) {
              this.entry = deepMerge(this.entry, res);
            }
            if (callback) {
              callback();
            }
          }, error: error
        }),
        first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.form().appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  fieldChange($event, appr, f, section) { // appr should be {data:{}} structure, ie: approval, entry
    if (f.post) {
      this._eval(this.entry, this.entry?.data, appr, f.post, this.form())
    }
    // if (!section) {
      this.evalAllApproval(appr);
    // } else {
    //   this.evalAllSection(appr.data, section);
    //   this.evalAll(this.entry)
    // }
    // this.evalAll(appr);
  }

  log = (log) => this.logService.log(JSON.stringify(log));

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


  _this:any = createProxy({},()=>this.cdr.markForCheck());

  // passiveCtx = {
  //   // READ ONLY CONTEXT
  //   // CAN BE USED IN TEMPLATE
  //   $app$: this.app(),
  //   // $screen$: this.screen,
  //   $_: this.entry,
  //   $: {},
  //   $$_: {},
  //   $$: {},
  //   $prev$: this.entry?.prev,
  //   $user$: this.user(),
  //   $conf$: this.appConfig,

  //   $action$: this.action(),

  //   $el$: this.form()?.items,
  //   $form$: this.form(),
  //   $this$: this._this,

  //   $param$: this.param(),

  //   $base$: this.base,
  //   $baseUrl$: this.baseUrl(),
  //   $baseApi$: this.baseApi,        
  //   $lookupList$: this.lookup,

  //   dayjs,
  //   ServerDate,
  //   $token$: this.accessToken(),
  //   $file$: this.filesMap,
  //   $activeIndex$: this._navIndex(),
  // }

  getEvalContext = (entry: any, data: any, appr: any, form: any, includeActive:boolean = false, additionalData:any = {}) => {
    // { $user$: this.user(), $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, 
    //   $base$: this.base, $baseUrl$: this.baseUrl(), $baseApi$: this.baseApi, $this$: this._this, 
    //   $param$: this.param() }
    let passive = {
      // READ ONLY CONTEXT
      // CAN BE USED IN TEMPLATE
      $app$: this.app(),
      // $screen$: this.screen,
      $_: entry,
      $: data,
      $$_: appr,
      $$: appr?.data,
      $prev$: entry?.prev,
      $user$: this.user(),
      $conf$: this.appConfig,

      $action$: this.action(),

      $el$: form?.items || this.form()?.items,
      $form$: form || this.form(),
      $this$: this._this,

      $param$: this.param(),

      $base$: this.base,
      $baseUrl$: this.baseUrl(),
      $baseApi$: this.baseApi,        
      // $ngForm$: this.entryForm(),
      $lookupList$: this.lookup,

      dayjs,
      ServerDate,
      $token$: this.accessToken(),
      $file$: this.filesMap,
      $activeIndex$: this._navIndex(),
    }
    
    let active = {
      $log$: this.log,
      // $setAction$: this.setAction,
      $lookup$: this._getLookup,
      $http$: this.httpGet,
      $post$: this.httpPost,
      $upload$: this.uploadFile,
      $endpoint$: this.endpointGet,
      setTimeout: this._setTimeout,
      setInterval: this._setInterval,
      $digest$: this.$digest$,

      // $saveAndView$: this.save,
      $save$: () => this._save(this.entry,form || this.form()),
      $submit$: (resubmit: boolean) => this.submit(resubmit, this.entry, form || this.form()),
      
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
      $showNav$:this.openNav,
    };

    return includeActive ? {...passive, ...active, ...additionalData} : {...passive, ...additionalData};
  }

  _eval = (entry:any,data:any, appr:any, v:string, form:any) => { 
    const bindings = this.getEvalContext(entry, data, appr, form, true, {});
    const argNames  = Object.keys(bindings);
    const argValues = Object.values(bindings);
    // console.log("## EVAL", v);
    return new Function(...argNames,
    `return ${v}`)(...argValues);
  }

  _pre = (data:any, v:string) => { 
    const bindings = this.getEvalContext(this.entry, data, this.entry.approval, this.form(), false, {});
    const argNames  = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
    `return ${v}`)(...argValues);
  }

  _preAppr = (appr:any, v:string) => { 
    const bindings = this.getEvalContext(this.entry, this.entry?.data, appr, this.form(), false, {});
    const argNames  = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
    `return ${v}`)(...argValues);
  }


  // _eval = (appr, v, form) => new Function('$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$',             '$lookup$', '$http$', '$post$', '$endpoint$',                       '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$toast$', '$update$', '$save$', '$submit$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$','$web$',           'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
  //   `return ${v}`)(this.entry, this.entry && this.entry.data, appr, appr && appr.data, this.entry?.prev, this.user, this.runService?.appConfig, this.getLookup, this.httpGet, this.httpPost, this.endpointGet, form?.items || this.form()?.items, form || this.form, this._this, this.loadScript, this.$digest$, this.param(), this.log, this.setActive, this.$toast$, this.updateField, () => this._save(form || this.form()), this.submit, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, echarts, this.$live$, this.accessToken, deepMerge, this.http, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);
  // _eval = (entry:any, appr:any, v:string, form:any) => new Function('setTimeout','setInterval','$app$','$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$', '$action$', '$lookup$', '$http$', '$post$','$upload$', '$endpoint$', '$save$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$activeIndex$', '$toast$', '$update$',                       '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$','$web$', '$file$', 'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
  //   `return ${v}`)(this._setTimeout, this._setInterval, this.app(), entry, entry?.data, appr, appr?.data, entry?.prev, this.user(), this.appConfig, this.action(), this._getLookup, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, ()=>this._save(entry,form||this.form()), (resubmit:boolean)=>this.submit(resubmit,entry,form||this.form()), form?.items||this.form()?.items, form||this.form(), this._this, this.loadScript, this.$digest$, this.param(), this.log, this.setActive, this._navIndex(), this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl(), this.baseApi, this.lookup, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken(), deepMerge, this.http, this.filesMap, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);

  // _pre = (data:any, v:string) =>     new Function('$app$','$_', '$',              '$prev$','$user$', '$conf$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$activeIndex$',
  //   `return ${v}`)(this.app(),this.entry, data, this.entry?.prev, this.user(), this.appConfig, this.form()?.items, this.form(), this._this, this.$digest$, this.param(), this.log, this.base, this.baseUrl(), this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken(), this._navIndex());
  
  // _preAppr = (appr:any, v:string) => new Function('$app$','$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$',
  //   `return ${v}`)(this.app(),this.entry, this.entry?.data, appr, appr && appr.data, this.entry?.prev, this.user(), this.appConfig, this.form()?.items, this.form(), this._this, this.$digest$, this.param(), this.log, this.base, this.baseUrl(), this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken());

    
  timeoutList:any[]=[];
  _setTimeout = (functionRef, delay, ...param) =>{
    let timeoutId = setTimeout(()=>{
      functionRef();
      this.$digest$();
    }, delay, ...param)  
    this.timeoutList.push(timeoutId);
  }

  intervalList:any[]=[];
  _setInterval = (functionRef, delay, ...param) =>{
    let intervalId = setInterval(()=>{
      functionRef();
      this.$digest$();
    }, delay, ...param)  
    this.intervalList.push(intervalId);
  }

  onInit:() => any;
  onSave:() => any;
  onSubmit:() => any;
  onView:() => any;

  getForm(formId:number, entryId:number) {

    Object.defineProperty(window, '_this_'+this.scopeId(), {
      get: () => this._this,
      configurable: true,   // so you can delete it later 
    });  

    this.runService.getRunForm(formId)
      .subscribe(res => {
        if (formId == res.id) { // check if the returned form is current formId, to solve twice firing
          this.form.set(res);

          this.getData(entryId, this.form());

          // just to initialize this.appr
          this.form().tiers.forEach(t => {
            this.appr[t.id] = { data: {}, list: [], tierId: t.id }
          });
        }
      });
  }

  initForm(f:string, entry:any,form:any) {
    let res = undefined;

    let fTxt = this.compileTpl(f,{});
    
    try {
      res = this._eval(entry, entry.data, entry.approval, fTxt, form);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{view-${form.title}-initForm}-${e}`) }
    this.timestamp.set(Date.now());

    return res;
  }

  bagS: any = {}
  updateWatchList(section:any, appr:any) {
    // console.log("## UPDATE WATCH LIST", section, appr);
    if (!this.bagS[section.id]) {
      this.bagS[section.id] = true;
      section.items.forEach((i) => {
        if (this.form().items[i.code].type == 'eval') {
          this.watchList.set(i.code, this.form().items[i.code].f)
        }
      })
      this.evalAllApproval(appr);
    }
  }

  sortOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
    return a.value.sortOrder - b.value.sortOrder;
  }

  getDataFiles(holder, id) {
    if (id) {
      this.filesMap[holder] = {};
      this.entryService.getEntryFiles(id)
        .subscribe(res => {
          res.content?.forEach(ea => this.filesMap[holder][ea.fileUrl] = ea);
        })
    }
  }

  trails = signal<any[]>([]);
  prevLoading = signal<boolean>(false);
  getData(id, form) {
    this.loading.set(true);
    this.getDataObs(id, form)
      .subscribe({
        next: (res) => {
          this.entry = res;
          this.loading.set(false);
          this.runCheckTier();
          if (form.prev) {
            this.prevLoading.set(true);
            this.getDataObs(res.prev?.$id, form.prev)
            .subscribe({
              next: (prevEntry)=>{
                this.prevEntry = prevEntry;
                this.getDataFiles('prev', res.prev?.$id);
                this.initForm(form.prev?.onView, this.prevEntry, form.prev);
                this.prevLoading.set(false);
              }, error: (err) => {
                this.prevLoading.set(false);
              }
            })

          }else{
              this.prevEntry = undefined;
              delete this.entry.prev;
          }
          this.getDataFiles('data', res.id);

          // perlu dlm tok sbb perlu dpt res(data entry);
          this.onInit = () => this.initForm(form.f,this.entry, form);
          this.onView = () => this.initForm(form.onView,this.entry, form);
          this.onSave = () => this.initForm(form.onSave,this.entry, form);
          this.onSubmit = () => this.initForm(form.onSubmit,this.entry, form);
          
          // this.initForm(form.onView, this.entry, form);
          this.onView();

          // console.log("data after initform", this.entry.data);

          // this.isAuthorized.set(this.checkAuthorized(form,this.user(), this.entry));

          this.entryService.getEntryApprovalTrail(res.id)
            .subscribe(trail => { this.trails.set(trail.content) });
        }, error: (err) => {
          // this.isAuthorized.set(this.checkAuthorized(form,this.user(), null));
          this.loading.set(false);
        }
      })
  }
  
  isAuthorized = computed<boolean>(()=>this.checkAuthorized(this.form(),this.user(), this.entry));
  unAuthorizedMsg: string = ""
  // userUnauthorized by default is false
  checkAuthorized = (form, user, entry)=>{
    if (form.x?.restrictAccess){
      let groupAuthorized = false;
      let approverAuthorized = false;
      let userAuthorized = false;
      let condAuthorized = false;
      let formSingle = false;
      let msgList:any[] = [];

      let intercept = form.accessList?.filter(v => Object.keys(user.groups||{}).includes(v + ""));
      if (intercept.length > 0) {
        // this.form().accessList?.length == 0 || 
        // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        groupAuthorized = true;
      }else{
        this.unAuthorizedMsg = this.lang()=='ms'?"Anda tidak mempunyai akses kepada borang ini":"You are not authorized to access this form";
      }
      if (entry?.id){
        if (form.x?.accessByApprover){
          let authorizer = Object.values(entry.approver).join(",")
          approverAuthorized = authorizer.includes(user.email)
        }
        if (form.x?.accessByUser){
          userAuthorized = entry.email==user.email
        }
        if (form.x?.accessByCond){
          condAuthorized = this.preCheckStr(form.x?.accessByCond, entry.data);
        }
        if (!(approverAuthorized||userAuthorized||condAuthorized)){
          this.unAuthorizedMsg = this.lang()=='ms'?"Anda tidak mempunyai akses kepada maklumat ini":"You are not authorized to access this information";
        }
      }else{
        formSingle = form.single;
      }
      return groupAuthorized||approverAuthorized||userAuthorized||condAuthorized||formSingle;
    }else{
      return true;
    }
  }

  getDataObs(id, form): Observable<any> {

    if (id) {
      return this.entryService.getEntry(id, form.id)
    } else {

      // flip inside-out condition, sbb single-data akan problem mn da parameter (ie: page=1)

      if (this.form().single) {
        var f = this._eval({},{},{}, this.form().singleQ, this.form());
        var params = deepMerge(f, this._param);
        return this.entryService.getFirstEntryByParam(params, form.id)
      } else {

        if (!this.isEmpty(this._param)) {
          return this.entryService.getFirstEntryByParam(this._param, form.id)
        } else {
            return of({});
        }
      }      
    }
  }


  isMine(tier) {
    return this.entry.approver[tier.id].indexOf(this.user().email) > -1
  }

  tierCheckStatus: any = {};
  runCheckTier() {
    // var i = 0; //using i because sortOrder unreliable if there's prerequisite on tiers
    this.form().tiers.forEach(t => {
      this.tierCheckStatus[t.id] = this.checkTier(t);
    })
  }
  editTier: any = {};
  checkTier(tier) {
    return this.entry && this.entry.approver[tier.id]
      && (
        (tier.type == 'ALL' || this.entry.approver[tier.id]?.indexOf(this.user().email) > -1)
        // check if this tier is current tier
        && tier.sortOrder == this.entry.currentTier
        // check if this tier is not decided with action curTier (ie:stop)
        && (!this.entry.approval[tier.id] || tier.actions[this.entry.approval[tier.id].status]?.action != 'curTier' || ["submitted", "resubmitted"].indexOf(this.entry.currentStatus) > -1)
        // check if current allow user edit
        && !this.entry.currentEdit //tier ccurrently pending edit from user
      );
  }

  cancelEntry() {
    this.entryService.cancel(this.entry.id, this.user().email)
      .subscribe({
        next: res => {
          this.getData(this.entry.id, this.form());
          this.toastService.show(this.lang()=='ms'?"Penghantaran entri berjaya dibatalkan":"Entry cancelled successfully", { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show(this.lang()=='ms'?"Penghantaran entri tidak berjaya dibatalkan":"Entry cancellation failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  submitApproval(approval) {
    var tier = this.form().tiers[this.entry.currentTier];
    approval['tier'] = tier;

    this.entryService.action(this.entry.id, this.user().email, approval)
      .subscribe({
        next: res => {
          this.getData(this.entry.id, this.form());
          if (tier.post) {
            try {
              this._eval(this.entry,this.entry?.data, res.approval[tier.id], tier.post, this.form());
            } catch (e) { this.logService.log(`{view-${tier.name}-post}-${e}`) }
          }
          this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan berjaya":"Approval submission success", { classname: 'bg-success text-light' });
          if (this.asComp()) {
            this.approved.emit(res);
          }
        }, error: err => {
          this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan tidak berjaya":"Approval submission failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  editApproval(approval, tier) {
    this.editTier[tier.id] = true;
    this.appr[tier.id] = approval;
  }

  cancelApproval(approval, tier) {
    this.editTier[tier.id] = false;
    this.appr[tier.id] = { data: {} };
    if (this.action()=='approve') {
      this.closed.emit(approval);
    }
  }

  saveApproval(approval, tier) {
    approval['tier'] = tier;
    this.entryService.saveApproval(this.entry.id, this.user().email, approval)
      .subscribe(res => {
        this.getData(this.entry.id, this.form());
        if (tier.post) {
          try {
            this._eval(this.entry, this.entry?.data, res.approval[tier.id], tier.post, this.form());
          } catch (e) { this.logService.log(`{view-${tier.name}-post}-${e}`) }
        }
        this.editTier[tier.id] = false;
        this.entry = res;
        this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan berjaya":"Approval update success", { classname: 'bg-success text-light' });
        this.runCheckTier();
        if (this.asComp()) {
          this.approved.emit(res);
        }
      })
  }
  removeApproval(tier) {
    this.entryService.removeApproval(this.entry.id, tier.id)
      .subscribe(res => {
        this.getData(this.entry.id, this.form());
        this.editTier[tier.id] = false;
        this.entry = res;
        this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan berjaya":"Approval successfully removed", { classname: 'bg-success text-light' });
        this.runCheckTier();
        if (this.asComp()) {
          this.approved.emit(res);
        }
      })
  }

  // editChildData: any;
  // editChildItems: any
  // editChild(content, tier, data, isNew) {
  //   this.editChildData = data;
  //   this.editChildItems = { section: tier.section }
  //   history.pushState(null, null, window.location.href);
  //   this.modalService.open(content, { backdrop: 'static' })
  //     .result.then(res => {
  //       if (res) {
  //         Object.assign(data, res);
  //       }
  //       if (isNew) {
  //         if (!this.appr[tier.id].list) {
  //           this.appr[tier.id].data = []
  //         }
  //         res['$index'] = this.appr[tier.id].list.length;
  //         this.appr[tier.id].list.push(res);
  //       }
  //       this.evalAll(this.appr[tier.id].list);
  //     }, res => { });
  // }

  // removeChild(section, $index) {
  //   if (section.confirmable) {
  //     if (confirm("Are you sure you want to remove this data?")) {
  //       this.entry.data[section.code].splice($index, 1);
  //     }
  //   } else {
  //     this.entry.data[section.code].splice($index, 1);
  //   }
  //   this.evalAll(this.entry);
  // }


  onFileClear(event, data, f, e) {
    this.entryService.deleteAttachment(event)
      .subscribe(res => {
      });
  }

  file: any = {};
  uploading = {};
  uploadProgress: any = {}

  entryFiles: any[] = [];
  onUpload(fileList, data, f, section) {
    if (fileList && fileList.length) {
      var totalSize = fileList.reduce((total, i) => total + i.size, 0);
      var progressSize = 0;
      if (['image', 'imagemulti'].indexOf(f.subType) > -1) {

        // optimize image file here (ie: resize, compress)
        if (f.subType == 'imagemulti') {
          var list = [];
          for (var i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            resizeImage({
              file: file,
              maxSize: f.v.max
            }).then(resizedImage => {
              this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form().appId, file.name)
                .subscribe(res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    data[f.code] = list;
                    this.fieldChange(fileList, data, f, section);
                    this.entryFiles.push(res.body.fileUrl);
                  }                  
                  this.cdr.markForCheck();
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
            this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form().appId, fileList[0].name)
              .subscribe(res => {
                if (res.type === HttpEventType.UploadProgress) {
                  progressSize = res.loaded;
                  this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
                } else if (res instanceof HttpResponse) {
                  data[f.code] = res.body.fileUrl;
                  this.fieldChange(fileList, data, f, section);
                  this.entryFiles.push(res.body.fileUrl);
                }
                this.cdr.markForCheck();
              })
            // console.log("upload resized image")
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
            this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form().appId, file.name)
              .subscribe(res => {
                if (res.type === HttpEventType.UploadProgress) {
                  progressSize = res.loaded;
                  this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
                } else if (res instanceof HttpResponse) {
                  list.push(res.body.fileUrl);
                  data[f.code] = list;
                  this.fieldChange(fileList, data, f, section);
                  this.entryFiles.push(res.body.fileUrl);
                }
                this.cdr.markForCheck();
              })
          }
        } else {
          var file = fileList[0];
          if (f.v.max && file.size > f.v.max * 1024 * 1024) {
            return;
          }
          this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form().appId, file.name)
            .subscribe(res => {
              if (res.type === HttpEventType.UploadProgress) {
                progressSize = res.loaded;
                this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
              } else if (res instanceof HttpResponse) {
                data[f.code] = res.body.fileUrl;
                this.fieldChange(fileList, data, f, section);
                this.entryFiles.push(res.body.fileUrl);
              }              
              this.cdr.markForCheck();
            })
        }

      }
    }
  }

  editApprovalData: any = {};
  approver;

  assignApprover(content, tier) {
    this.editApprovalData = tier;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.entryService.assign(this.entry.id, tier.id, res.approver)
          .subscribe({
            next: res => {
              this.getForm(this.form().id, this.entry.id);
              this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan berjaya":"Approver successfully assigned", { classname: 'bg-success text-light' });
            }, error: err => {
              this.toastService.show(this.lang()=='ms'?"Penghantaran pengesahan tidak berjaya":"Approver assignment failed", { classname: 'bg-success text-light' });
            }
          })
      }, res => { });
  }

  printReport() {
    try {
      window.print();
    } catch (e) {}
  }

  // problem mn list
  getVal(field, appr, child?) {
    var value = "";
    var achild = child || appr.data;
    if (field) {
      value = achild[field.code];
      if (field.type == 'eval' && value == null) {
        if (field.f) {
          try {
            value = this._eval(this.entry, this.entry?.data, appr, field.f, this.form());
          } catch (e) { this.logService.log(`{view-${field.code}-f}-${e}`) }
        }
      }
    }
    return value;
  }


  viewTrail(content) {
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
      }, res => { });
  }

  _save = (entry,form) => {
    let userKey = this.user().email;
    if (form?.x?.userKey) {
      userKey = this.compileTpl(form?.x?.userKey, 
        { $: entry?.data, $_: entry, $prev$: entry?.prev })
    }
    return this.entryService.save(form.id, entry, entry?.prev?.id, userKey)
      .pipe(
        tap({
          next: (e) => {
            entry = deepMerge(entry,e);
            // this.linkFiles(e);
            // this.entryForm.form().markAsPristine();
          }
        }), first()
      )
  }

  submit = (resubmit: boolean, entry, form) => {
    this.entryService.submit(entry.id, this.user().email, resubmit)
      .subscribe({
        next: res => {
          if (form.onSubmit) {
            try {
              this._eval(entry, entry.data, entry.approval, form.onSubmit, form);
            } catch (e) { this.logService.log(`{form-${form.title}-onSubmit}-${e}`) }
          }
          this.toastService.show(this.lang()=='ms'?"Penghantaran entri berjaya":"Entry submitted successfully", { classname: 'bg-success text-light' });
          if (this.asComp()) {
            this.submitted.emit(res);
          }
          this.entry = deepMerge(entry, res);
          this.$digest$();
        }, error: err => {
          this.toastService.show(this.lang()=='ms'?"Penghantaran entri tidak berjaya":"Entry submission failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  compileTpl = (code, additionalData) => {
    // let obj = Object.assign( additionalData, { $user$: this.user(), $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl(), $baseApi$: this.baseApi, $this$: this._this, $param$: this.param() })
    let obj = Object.assign( additionalData, this.getEvalContext(this.entry, this.entry?.data, this.entry.approval, this.form(), false, {}))
    return compileTpl(code, obj, this.scopeId())
  }


  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key=>this.liveSubscription[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(i=> clearInterval(i));
    this.timeoutList.forEach(i=> clearTimeout(i));
    delete window['_this_' + this.scopeId()];
    this.elMap = {};
  }

}

