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

import { ChangeDetectorRef, Component, OnInit, ViewChild, effect, input, model, output } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// import { EntryService } from '../../service/entry.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
// import { LookupService } from '../../service/lookup.service';
import { base, baseApi } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
// import { RunService } from '../../service/run.service';
import { LogService } from '../../_shared/service/log.service';
import { debounceTime, distinctUntilChanged, first, map, share, tap, withLatestFrom } from 'rxjs/operators';
import { ServerDate, btoaUTF, compileTpl, deepMerge, hashObject, loadScript, resizeImage } from '../../_shared/utils';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { KeyValue, NgClass, DatePipe, KeyValuePipe } from '@angular/common';
import { lastValueFrom, Observable, of } from 'rxjs';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
// import { FieldViewComponent } from '../../_shared/component/field-view.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// import { FieldEditComponent } from '../../_shared/component/field-edit/field-edit.component';
import { InitDirective } from '../../_shared/directive/init.directive';
// import { FormViewComponent } from '../../_shared/component/form-view.component';
import { FormsModule } from '@angular/forms';
import { FieldEditComponent } from '../_component/field-edit-b/field-edit-b.component';
import { FieldViewComponent } from '../_component/field-view.component';
import { FormViewComponent } from '../_component/form-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
// import mermaid from "mermaid";
// mermaid.initialize({startOnLoad:false})
// import { PageTitleComponent } from '../../_shared/component/page-title.component';

@Component({
    selector: 'app-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.css'],
    imports: [PageTitleComponent, FormsModule, FormViewComponent, NgClass, InitDirective, FieldEditComponent, FaIconComponent, FieldViewComponent, RouterLink, DatePipe, KeyValuePipe]
})
export class ViewComponent implements OnInit {

  lookupIds: any[];
  user: any;
  baseApi: string = baseApi;
  base: string = base;
  baseUrl: string = '';
  prevEntry: any;
  // prevForm: any;
  appId: number;
  // @Input() entryId: number;
  entryId = input<number>();
  _entryId:number;

  entryParam: any;
  preurl: string = '';
  // @Input() formId: number;
  formId = input<number>();
  _formId:number;
  // @Input() asComp: boolean;
  asComp = input<boolean>();
  // @Input() action: string;
  action = input<string>();
  // @Output() approved = new EventEmitter();
  approved = output<any>()
  // @Output() closed = new EventEmitter();
  closed = output<any>();
  // @Output() submitted = new EventEmitter();
  submitted = output<any>();
  isEmpty = inputObject => inputObject && Object.keys(inputObject).length === 0;
  $param$: any = {};
  app: any;
  accessToken: string = '';

  hideTitle = input<boolean>(false);

  offline = false;

  prevSignalKey:string='';

  constructor(private userService: UserService, private modalService: NgbModal,
    private entryService: EntryService, private route: ActivatedRoute, private lookupService: LookupService,
    private http: HttpClient, private toastService: ToastService, private logService: LogService,
    private cdr: ChangeDetectorRef,
    public runService: RunService, private router: Router, private utilityService: UtilityService) {
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

    effect(()=>{

      if (this.formId() && this._formId != this.formId()){
        this.getLookupIdList(this.formId());
      }

      // if (this._entryId != this.entryId()){
        this._entryId = this.entryId();
      // }
      // if (this._formId != this.formId()){
        this._formId = this.formId();
        
      // }

      const key = `${this._formId}|${this._entryId}`;

      if (this._formId && this._entryId && this.prevSignalKey != key){
        this.prevSignalKey = key;
        this.getForm(this._formId, this._entryId);
      }

      // if (
      //   this.entryId() && this.formId() &&
      //   (this._entryId != this.entryId() || this._formId != this.formId())
      // ){
      //   this.getForm(this._formId, this._entryId);
      // }
      
    })
  }

  liveSubscription: any[] = [];
  
  ngOnInit() {
    this.app = this.runService.$app();
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();

    // this.app = this.runService.app;
    this.accessToken = this.userService.getToken();
    this.userService.getUser().subscribe((user) => {
      this.user = user;
      this.approval['email'] = user.email;

      // this.route.parent.params
      //   .subscribe((params: Params) => {
      //     this.appId = params['appId'];
      //     if (this.appId) {
      //       this.preurl = `/run/${this.appId}`;
      //     }
      //     this.baseUrl = (location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;
      //   });

      if (this.asComp()) {

        // this.navIndex = this._param?.['navIndex'] ?? 0;

        this.getForm(this._formId, this._entryId);
        this.getLookupIdList(this._formId);

      } else {

        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams),
          // debounceTime(0)
          distinctUntilChanged()
        ).subscribe(([url, params, queryParams]) => {
          // console.log("ttt")
          // const formId = +params['formId'];
          this._formId = +params['formId'];

          this.$param$ = queryParams;
          this._entryId = queryParams['entryId'];

          this.navIndex = queryParams['navIndex'] ?? 0;

          if (this._entryId) {
            // this.entryId.set(entryId);
            this.entryParam = null;
          } else {
            // this.entryId.set(null);
            this.entryParam = queryParams;
          }

          this.getForm(this._formId, this._entryId);
          this.getLookupIdList(this._formId);

        })
      }
      this.timestamp = Date.now();
    });

  }


  approval: any = { data: {} }
  appr: any = {};
  // watchList = [];
  loading = true;

  filterSection = (sectionList, type, tab) => sectionList && sectionList.filter(s => type.indexOf(s.type) > -1 && (!tab || s.parent == tab));

  preCheckStr(code, dataV?: any) {
    let res = undefined;
    try {
      if (!dataV) {
        dataV = this.entry.data;
      }
      res = this._pre(dataV, code);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
    } catch (e) { this.logService.log(`{form-precheck}-:${code}:${e}`) }
    return !code || res;
  }

  preCheckAppr(code, dataV?: any) {
    let res = undefined;
    try {
      if (!dataV) {
        dataV = this.entry.data;
      }
      res = this._preAppr(dataV, code);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
      // console.log(res);
    } catch (e) { this.logService.log(`{view-${code}-precheck}-${e}`) }
    return !code || res;
  }

  // setApproval(holder, approval) {
  //   Object.assign(holder, approval, {});
  // }

  watchList = new Map();
  watchListSection: any = {};
  evalAll(entry) {
    // console.log(data);
    // console.log(this.watchList);
    // for (const prop in this.watchList) {
    //   // PROBLEM, knek tok approval = data , so, utk field dalam, perlu data.data;
    //   if (!entry) {
    //     entry = { data: {} }
    //   }
    //   entry.data[prop] = this.changeEval(entry, this.watchList[prop]);
    // }
    this.watchList.forEach((value, key) => {
      if (!entry) {
        entry = { data: {} }
      }
      entry.data[key] = this.changeEval(this.entry,entry, value);
    })
  }

  evalAllSection(data, section) {
    this.watchListSection[section.code].forEach((value, key) => {
      data[key] = this.changeEval(this.entry, data, value);
    })
  }
  // evalAll(data) {
  //   // console.log("evalAll$$$");
  //   console.log(this.watchList);
  //   this.watchList.forEach(f => {
  //     data[f.code] = this.changeEval(data, f);//$scope.$eval(f.placeholder);
  //     // console.log("evallAll::"+f.code)
  //   })
  // }
  timestamp:number;

  changeEval(entry,data, js) {
    let res;
    try {
      res = this._eval(entry, data, js, this.form); // new Function('$', '$$', '$prev$', '$user$', 'return ' + f.f)(this.entry && this.entry.data, data, this.prevEntry && this.prevEntry.data, this.user);
    } catch (e) { this.logService.log(`{view-${this.form.title}-changeEval}-${e}`) }
    return res;
  }

  // getLookupName(lookupId, code) {
  //   // return code && code.name;
  //   return this.lookup[lookupId] && code && this.lookup[lookupId].filter(e => e.code == code)[0].name;
  // }

  entry: any = { data: {} };
  form: any = { tiers: [] };


  lookup:any = {};

  lookupKey:any = {};

  getLookupIdList(id:number) {
    this.lookupService.getInForm(id, ['approval'])
      .subscribe(res => {
        this.lookupIds = res;
        this.lookupIds.forEach((key) => {
          //console.log("hhhh:"+key.code+","+key.dataSourceInit)
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

    var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}));
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
          map((res:any) => res.content), share()
        )
    }
    return this.lookupDataObs[cacheId];
  }


  // need appr data sebab perlu eval dgn appr value via $$.
  getLookup = (code, appr?, dsInit?: string) => {
    let param = null;
    try {
      param = this._eval(this.entry, appr, dsInit, this.form);// new Function('$', '$prev$', '$user$', '$lookup$', '$http$', 'return ' + key.dataSourceInit)(this.entry, this.entry && this.entry.prev, this.user, this.getLookup, this.httpGet)
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
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.form.appId, params, callback, error)
  // must run digest/filterItems to ensure rerun pre..
  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.form.appId, params, callback, error).pipe(tap(()=>this.$digest$())))
  
  uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app?.id, obj.file.name)
    .pipe( tap({ next: callback, error: error }), first() ));



  loadScript = loadScript;

  $digest$ = () => {
    this.cdr.detectChanges()
    this.timestamp = Date.now(); // setting new value for timestamp will force effect in field-view
    // console.log(this.timestamp);
  }


  navIndex:number=0;
  @ViewChild('nav') navOutlet;
  setActive = (index) => {
    this.navIndex = index;
    if (['tabs', 'pills'].indexOf(this.form.nav) > -1) {
      this.navOutlet.select('view' + index);
    } else if (this.form.nav == 'accordions') {
      this.navOutlet.expand('view' + index);
    }
  }

  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.form.appId)
      .pipe(
        tap({
          next: (res: any) => {
            if (res?.id == this.entry?.id) {
              this.entry = deepMerge(this.entry, res);
            }
            if (callback) {
              callback();
            }
          }, error: error
        }), first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.form.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  fieldChange($event, appr, f, section) {
    if (f.post) {
      this._eval(this.entry, appr, f.post, this.form)
    }
    if (!section) {
      this.evalAll(appr);
    } else {
      this.evalAllSection(appr, section);
      this.evalAll(this.entry.data)
    }
    this.evalAll(appr);
  }

  log = (log) => this.logService.log(JSON.stringify(log));

  elMap: any = {}
  $q = (el) => {
    if (!this.elMap[el]) {
      this.elMap[el] = document.querySelector(el);
    }
    return this.elMap[el];
  }

  $this$ = {};

  // _eval = (appr, v, form) => new Function('$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$',             '$lookup$', '$http$', '$post$', '$endpoint$',                       '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$toast$', '$update$', '$save$', '$submit$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$','$web$',           'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
  //   `return ${v}`)(this.entry, this.entry && this.entry.data, appr, appr && appr.data, this.entry?.prev, this.user, this.runService?.appConfig, this.getLookup, this.httpGet, this.httpPost, this.endpointGet, form?.items || this.form?.items, form || this.form, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.setActive, this.$toast$, this.updateField, () => this._save(form || this.form), this.submit, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, echarts, this.$live$, this.accessToken, deepMerge, this.http, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);
  _eval = (entry:any, appr:any, v:string, form:any) => new Function('setTimeout','setInterval','$app$','$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$', '$action$', '$lookup$', '$http$', '$post$','$upload$', '$endpoint$', '$save$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$activeIndex$', '$toast$', '$update$',                       '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$','$web$', '$file$', 'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
    `return ${v}`)(this._setTimeout, this._setInterval, this.app,entry, entry?.data, appr, appr && appr.data, entry?.prev, this.user, this.runService?.appConfig, this.action(), this._getLookup, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, ()=>this._save(entry,form||this.form), (resubmit:boolean)=>this.submit(resubmit,entry,form||this.form), form?.items||this.form?.items, form||this.form, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.setActive, this.navIndex, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.filesMap, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);


  _pre = (data:any, v:string) => new Function('$app$','$_', '$', '$prev$','$user$', '$conf$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$activeIndex$',
    `return ${v}`)(this.app,this.entry, data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.form && this.form.items, this.form, this.$this$, this.$digest$, this.$param$, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, this.navIndex);
  _preAppr = (appr:any, v:string) => new Function('$app$','$_', '$', '$$_', '$$', '$prev$', '$user$', '$conf$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$',
    `return ${v}`)(this.app,this.entry, this.entry && this.entry.data, appr, appr && appr.data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.form && this.form.items, this.form, this.$this$, this.$digest$, this.$param$, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken);

    
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

  onInit;
  onSave;
  onSubmit;
  onView;

  getForm(formId:number, entryId:number) {
    this.runService.getForm(formId)
      .subscribe(res => {
        if (formId == res.id) { // check if the returned form is current formId, to solve twice firing
          // console.log(`dlm getForm:res::-formId:${formId},-entryId:${entryId}`);
          this.form = res;
          // this.onInit = () => this.initForm(res.f, this.form);
          // this.onView = () => this.initForm(res.onView, this.form);
          // this.onSave = () => this.initForm(res.onSave, this.form);
          // this.onSubmit = () => this.initForm(res.onSubmit, this.form);

          this.getData(entryId, this.form);

          // just to initialize this.appr
          this.form.tiers.forEach(t => {
            this.appr[t.id] = { data: {}, list: [], tierId: t.id }
          });
        }
      });
  }

  initForm(f:string, entry:any,form:any) {
    // console.log("*****initForm")

    let res = undefined;

    let fTxt = this.compileTpl(f,{});
    
    try {
      res = this._eval(entry, entry.data, fTxt, form);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{view-${form.title}-initForm}-${e}`) }
    this.timestamp = Date.now();

    // setTimeout(()=>{
    //   mermaid.run({querySelector:'.mermaid'})
    // },100) 

    return res;
  }

  // createSvg(element)

  bagS: any = {}

  updateWatchList(s:any, appr:any) {
    if (!this.bagS[s.id]) {
      this.bagS[s.id] = true;
      s.items.forEach((i) => {
        if (this.form.items[i.code].type == 'eval') {
          this.watchList.set(i.code, this.form.items[i.code].f)
          // this.watchList[i.code] = this.form.items[i.code].f;
        }
      })
      this.evalAll(appr);
    }
  }

  sortOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
    return a.value.sortOrder - b.value.sortOrder;
  }

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

  trails: any[] = [];
  prevLoading:boolean=false;
  getData(id, form) {
    this.loading = true;
    this.getDataObs(id, form)
      .subscribe({
        next: (res) => {
          this.entry = res;
          this.loading = false;
          this.runCheckTier();
          if (form.prev) {
            this.prevLoading=true;
            this.getDataObs(res.prev?.$id, form.prev)
            .subscribe({
              next: (prevEntry)=>{
                this.prevEntry = prevEntry;
                this.getDataFiles('prev', res.prev?.$id);
                this.initForm(form.prev?.onView, prevEntry,form.prev);
                this.prevLoading=false;
              }, error: (err) => {
                this.prevLoading=false;
              }
            })

          }else{
            // this.prevId = undefined;
              this.prevEntry = undefined;
              delete this.entry.prev;
          }
          this.getDataFiles('data', res.id);
          this.onInit = () => this.initForm(form.f,res, this.form);
          this.onView = () => this.initForm(form.onView,res, this.form);
          this.onSave = () => this.initForm(form.onSave,res, this.form);
          this.onSubmit = () => this.initForm(form.onSubmit,res, this.form);
          
          this.initForm(form.onView, res, form);

          this.isAuthorized = this.checkAuthorized(form,this.user, this.entry);

          this.entryService.getEntryApprovalTrail(res.id)
            .subscribe(trail => { this.trails = trail.content });
        }, error: (err) => {
          this.isAuthorized = this.checkAuthorized(form,this.user, null);
          this.loading = false;
        }
      })
  }
  
  isAuthorized:boolean = false;
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

      let intercept = form.accessList?.filter(v => Object.keys(user.groups).includes(v + ""));
      if (intercept.length > 0) {
        // this.form.accessList?.length == 0 || 
        // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        groupAuthorized = true;
      }else{
        this.unAuthorizedMsg = this.app?.x?.lang=='ms'?"Anda tidak mempunyai akses kepada borang ini":"You are not authorized to access this form";
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
          condAuthorized = this.preCheckStr(form.x?.accessByCond, entry);
        }
        if (!(approverAuthorized||userAuthorized||condAuthorized)){
          this.unAuthorizedMsg = this.app?.x?.lang=='ms'?"Anda tidak mempunyai akses kepada maklumat ini":"You are not authorized to access this information";
        }
      }else{
        formSingle = form.single;
      }
      console.log("user", userAuthorized,"approver", approverAuthorized,"group", groupAuthorized,"cond",condAuthorized, "formSingle", formSingle)
      return groupAuthorized||approverAuthorized||userAuthorized||condAuthorized||formSingle;
    }else{
      return true;
    }
  }

  getDataObs(id, form): Observable<any> {
    // this.loading = true;

    if (id) {
      return this.entryService.getEntry(id, form.id)
    } else {

      // flip inside-out condition, sbb single-data akan problem mn da parameter (ie: page=1)

      if (this.form.single) {
        var f = this._eval({},{}, this.form.singleQ, this.form);
        // console.log(f);
        var params = deepMerge(f, this.entryParam);
        return this.entryService.getFirstEntryByParam(params, form.id)
      } else {

        if (!this.isEmpty(this.entryParam)) {
          // console.log(this.entryParam)
          // if using param instead of entry id
          // this.loading = true;
          return this.entryService.getFirstEntryByParam(this.entryParam, form.id)
        } else {
            return of({});
        }


        // return of({});
      }
      
      // if (!this.isEmpty(this.entryParam)) {
      //   // console.log(this.entryParam)
      //   // if using param instead of entry id
      //   // this.loading = true;
      //   return this.entryService.getFirstEntryByParam(this.entryParam, form.id)
      // } else {
      //   if (this.form.single) {
      //     var f = this._eval({},{}, this.form.singleQ, this.form);
      //     // console.log(f);
      //     return this.entryService.getFirstEntryByParam(f, form.id)
      //   } else {
      //     return of({});
      //   }
      // }
    }

  }


  checkPerson() {
    var result = false;
    if (this.form.tiers[this.entry]) {
      // if (this.form.tiers[this.entry.currentTier].type == 'PERSON') {
      result = this.form.tiers[this.entry.currentTier].approver == 'all' || this.form.tiers[this.entry.currentTier].approver.indexOf(this.user.email) > -1
      // }
    }
    return result;
  }

  isMine(tier) {
    return this.entry.approver[tier.id].indexOf(this.user.email) > -1
  }

  tierCheckStatus: any = {};
  runCheckTier() {
    // var i = 0; //using i because sortOrder unreliable if there's prerequisite on tiers
    // this.tierList=[];
    this.form.tiers.forEach(t => {
      // if (this.preCheck(t)){
      // this.tierList.push(t);
      this.tierCheckStatus[t.id] = this.checkTier(t);
      // i++;
      // }
      // console.log("TIER####:"+t.id)
      // this.tierInfo[t.id]=t;

    })
  }
  editTier: any = {};
  checkTier(tier) {
    // console.log(`###### TIER ${tier.name} #####`);
    // console.log(`tier.sortOrder = ${tier.sortOrder}, this.entry.currentTier = ${this.entry.currentTier}`);
    // console.log(`tier.actions[this.entry.currentStatus]?.action = ${tier.actions[this.entry.currentStatus]?.action}`);
    // console.log(`###########`);  
    // console.log("sortOrder:"+(tier.sortOrder == this.entry.currentTier));
    // console.log("not curtier:"+(!this.entry.approval[tier.id] || tier.actions[this.entry.approval[tier.id].status].action != 'curTier'));
    // console.log("currentEdit:"+(!this.entry.currentEdit)); 

    // console.log("========")
    // console.log("approver:" + (tier.type == 'ALL' || this.entry.approver[tier.id]?.indexOf(this.user.email) > -1))
    // console.log("i=" + tier.sortOrder + ",currentTier=" + this.entry.currentTier, "isCur=" + (tier.sortOrder == this.entry.currentTier))
    // console.log("curTier=" + (!this.entry.approval[tier.id] || tier.actions[this.entry.approval[tier.id].status]?.action != 'curTier'))
    // console.log("edit=" + !this.entry.currentEdit)

    return this.entry && this.entry.approver[tier.id]
      && (
        (tier.type == 'ALL' || this.entry.approver[tier.id]?.indexOf(this.user.email) > -1)
        // check if this tier is current tier
        && tier.sortOrder == this.entry.currentTier
        // check if this tier is not decided with action curTier (ie:stop)
        && (!this.entry.approval[tier.id] || tier.actions[this.entry.approval[tier.id].status]?.action != 'curTier' || ["submitted", "resubmitted"].indexOf(this.entry.currentStatus) > -1)
        // check if current allow user edit
        && !this.entry.currentEdit //tier ccurrently pending edit from user
      );
  }

  cancelEntry() {
    this.entryService.cancel(this.entry.id, this.user.email)
      .subscribe({
        next: res => {
          this.getData(this.entry.id, this.form);
          this.toastService.show("Entry cancelled successfully", { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show("Entry cancellation failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  submitApproval(approval) {
    var tier = this.form.tiers[this.entry.currentTier];
    approval['tier'] = tier;

    this.entryService.action(this.entry.id, this.user.email, approval)
      .subscribe({
        next: res => {
          this.getData(this.entry.id, this.form);
          if (tier.post) {
            try {
              this._eval(this.entry,res.approval[tier.id], tier.post, this.form);
            } catch (e) { this.logService.log(`{view-${tier.name}-post}-${e}`) }
          }
          this.toastService.show("Approval submission success", { classname: 'bg-success text-light' });
          if (this.asComp()) {
            this.approved.emit(res);
          }
        }, error: err => {
          this.toastService.show("Approval submission failed", { classname: 'bg-danger text-light' });
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
    this.closed.emit(approval);
  }

  saveApproval(approval, tier) {
    approval['tier'] = tier;
    // console.log(approval);
    this.entryService.saveApproval(this.entry.id, this.user.email, approval)
      .subscribe(res => {
        // Object.assign(approval,res);
        this.getData(this.entry.id, this.form);
        if (tier.post) {
          try {
            this._eval(this.entry, res.approval[tier.id], tier.post, this.form);
            // this.evalAll(this.entry);
          } catch (e) { this.logService.log(`{view-${tier.name}-post}-${e}`) }
        }
        this.editTier[tier.id] = false;
        this.entry = res;
        this.toastService.show("Approval update success", { classname: 'bg-success text-light' });
        this.runCheckTier();
        if (this.asComp()) {
          this.approved.emit(res);
        }
      })
  }

  editChildData: any;
  editChildItems: any
  editChild(content, tier, data, isNew) {
    this.editChildData = data;
    this.editChildItems = { section: tier.section }
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        if (res) {
          Object.assign(data, res);
        }
        if (isNew) {
          if (!this.appr[tier.id].list) {
            this.appr[tier.id].data = []
          }
          res['$index'] = this.appr[tier.id].list.length;
          this.appr[tier.id].list.push(res);
        }
        this.evalAll(this.appr[tier.id].list);
      }, res => { });
  }

  removeChild(section, $index) {
    if (section.confirmable) {
      if (confirm("Are you sure you want to remove this data?")) {
        this.entry.data[section.code].splice($index, 1);
      }
    } else {
      this.entry.data[section.code].splice($index, 1);
    }
    this.evalAll(this.entry.data);
  }


  onFileClear(event, data, f, e) {
    this.entryService.deleteAttachment(event)
      .subscribe(res => {
        // data[f.code]=null;
        // this.fieldChange(event, data, f);
        // console.log("##FILE CLEARED##")
      });
  }

  file: any = {};
  uploading = {};
  uploadProgress: any = {}

  entryFiles: any[] = [];
  onUpload(fileList, data, f, section) {
    // [file]
    // console.log("is upload"); 
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
              // console.log("FILENAME### : " + file.name)
              this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form.appId, file.name)
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
                })
              // console.log("upload resized image")
            }).catch(function (err) {
              console.error(err);
            });
          }
        } else {
          resizeImage({
            file: fileList[0],
            maxSize: f.v.max
          }).then(resizedImage => {
            this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form.appId, fileList[0].name)
              .subscribe(res => {
                if (res.type === HttpEventType.UploadProgress) {
                  progressSize = res.loaded;
                  this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
                } else if (res instanceof HttpResponse) {
                  data[f.code] = res.body.fileUrl;
                  this.fieldChange(fileList, data, f, section);
                  this.entryFiles.push(res.body.fileUrl);
                }
              })
            // console.log("upload resized image")
          }).catch(function (err) {
            console.error(err);
          });
        }

      } else {
        if (f.subType == 'othermulti') {
          var list = [];
          // this.fileLarge[f.id]=[];
          for (var i = 0; i < fileList.length; i++) {
            var file = fileList[i];
            if (f.v.max && file.size > f.v.max * 1024 * 1024) {
              return;
            }
            this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form.appId, file.name)
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

              })
          }
        } else {
          var file = fileList[0];
          // this.fileLarge[f.id]=[]
          if (f.v.max && file.size > f.v.max * 1024 * 1024) {
            return;
          }
          this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form.appId, file.name)
            .subscribe(res => {
              if (res.type === HttpEventType.UploadProgress) {
                progressSize = res.loaded;
                this.uploadProgress[f.code] = Math.round(100 * progressSize / totalSize);
              } else if (res instanceof HttpResponse) {
                data[f.code] = res.body.fileUrl;
                this.fieldChange(fileList, data, f, section);
                this.entryFiles.push(res.body.fileUrl);
              }
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
              this.getForm(this.form.id, this.entry.id);
              this.toastService.show("Approver successfully assigned", { classname: 'bg-success text-light' });
            }, error: err => {
              this.toastService.show("Approver assignment failed", { classname: 'bg-success text-light' });
            }
          })
      }, res => { });
  }

  printReport() {
    try {
      window.print();
    } catch (e) {
      // console.log(e);
    }
  }

  // problem mn list
  getVal(field, appr, child?) {
    var value = "";
    var achild = child || appr.data;
    if (field) {
      value = achild[field.code];
      // console.log(value);
      if (field.type == 'eval' && value == null) {
        if (field.f) {
          try {
            value = this._eval(this.entry, appr, field.f, this.form);
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
    // this.evalAll(this.entry.data);
    let userKey = this.user.email;
    if (form?.x?.userKey) {
      userKey = compileTpl(form?.x?.userKey, { $user$: this.user, $: entry?.data, $_: entry, $prev$: entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this.$param$ })
    }
    return this.entryService.save(form.id, entry, entry?.prev?.id, userKey)
      .pipe(
        tap({
          next: (e) => {
            deepMerge(entry,e);
            // this.linkFiles(e);
            // this.entryForm.form.markAsPristine();
          }
        }), first()
      )
  }

  submit = (resubmit: boolean, entry, form) => {
    this.entryService.submit(entry.id, this.user.email, resubmit)
      .subscribe({
        next: res => {
          if (form.onSubmit) {
            try {
              this._eval(entry, entry.data, form.onSubmit, form);
            } catch (e) { this.logService.log(`{form-${form.title}-onSubmit}-${e}`) }
          }
          this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
          if (this.asComp()) {
            this.submitted.emit(res);
          }
          deepMerge(entry, res);
          // this.entry = res;
          this.$digest$();
        }, error: err => {
          this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  compileTpl = (code, additionalData) => {
    let obj = Object.assign( additionalData, { $user$: this.user, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this.$param$ })
    return compileTpl(code, obj)
  }


  ngOnDestroy() {
    this.liveSubscription.forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(i=> clearInterval(i));
    this.timeoutList.forEach(i=> clearTimeout(i));
  }

}

