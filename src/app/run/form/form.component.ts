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

import { Component, OnInit, AfterViewChecked, ChangeDetectorRef, OnDestroy, input, output, effect, viewChild } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
// import { LookupService } from '../../service/lookup.service';
// import { EntryService } from '../../service/entry.service';
import { NgbModal, NgbDateAdapter, NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet, NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { base, baseApi } from '../../_shared/constant.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { PlatformLocation, NgTemplateOutlet, NgStyle, NgClass, DatePipe, JsonPipe } from '@angular/common';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
// import { RunService } from '../../service/run.service';
import { LogService } from '../../_shared/service/log.service';
import { ServerDate, btoaUTF, compileTpl, deepMerge, getFileExt, hashObject, loadScript, resizeImage } from '../../_shared/utils';
import { debounceTime, distinctUntilChanged, first, map, share, tap, withLatestFrom } from 'rxjs/operators';
import { ViewChild } from '@angular/core';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { Observable, Subject, lastValueFrom } from 'rxjs';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';
import { NgForm, FormsModule } from '@angular/forms';
import { ScreenComponent } from '../screen/screen.component';
import { ListComponent } from '../list/list.component';
// import { FieldEditComponent } from '../../_shared/component/field-edit/field-edit.component';
// import { FieldViewComponent } from '../../_shared/component/field-view.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// import { FormViewComponent } from '../../_shared/component/form-view.component';
// import { StepWizardComponent } from '../../_shared/component/step-wizard.component';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';
import { EditLookupEntryComponent } from '../../_shared/modal/edit-lookup-entry/edit-lookup-entry.component';
import { FieldEditComponent } from '../_component/field-edit/field-edit.component';
import { FieldViewComponent } from '../_component/field-view.component';
import { FormViewComponent } from '../_component/form-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { StepWizardComponent } from '../_component/step-wizard.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import mermaid from "mermaid";
// mermaid.initialize({startOnLoad:false})

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.css'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
    imports: [FormsModule, PageTitleComponent, StepWizardComponent, FormViewComponent, NgbAccordionDirective, NgbAccordionItem,
    NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody,
    NgTemplateOutlet, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, RouterLink, NgbNavContent, NgbNavOutlet,
    NgStyle, NgClass, FaIconComponent, FieldViewComponent, FieldEditComponent, ListComponent, ScreenComponent, DatePipe,
    NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, GroupByPipe,
    EditLookupEntryComponent]
})
export class FormComponent implements OnInit, OnDestroy, AfterViewChecked, ComponentCanDeactivate {

  user: any;
  app: any;
  appConst: any;
  form: any;
  lookupIds: any;
  baseApi: string = baseApi;
  base: string = base;
  baseUrl: string = '';
  hideTitle = input<boolean>(false);
  // prevEntry: any;
  // prevForm: any;
  hideGroup:any={}

  pageSize = 15;

  accessToken: string = "";

  entry: any = { currentStatus: 'drafted', data: {} };

  data: any = {}

  lookup = {};

  saving = false;
  submitting = false;

  lookupKey = {};

  lookups = {};
  // appId: number;
  // @Input() entryId: number;
  entryId = input<number>(); // PERLU CHECK
  _entryId:number;
  
  saved = output<any>();
  submitted = output<any>();
  closed = output<any>();
  // entryParam: any;
  action = input<string>('');
  _action:string;
  
  formId = input<number>();
  _formId:number;
  // _formId:number;
  // @Input() asComp: boolean;
  asComp = input<boolean>();
  preurl: string = '';
  loading: boolean;
  // @Input() $param$: any = {};
  $param$ = input<any>({});
  _param:any = {};
  // @Input() tab: number = 0;
  tab: number = 0;

  isEmpty = inputObject => inputObject && Object.keys(inputObject).length === 0;

  constructor(private userService: UserService, public runService: RunService,
    private router: Router, private route: ActivatedRoute, private http: HttpClient,
    private lookupService: LookupService, private entryService: EntryService,
    private modalService: NgbModal,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private logService: LogService,
    private location: PlatformLocation) {
    location.onPopState(() => this.modalService.dismissAll(''));
    
    effect(()=>{
      // x sure knak tok disabled sebelum tok 8/nov/2024
      if (this.entryId()){
        this._entryId = this.entryId();
      }
      if (this.formId()){
        this._formId = this.formId();
      }
      if (this.action()){
        this._action = this.action();
      }
      if (this.$param$()){
        this._param = this.$param$();
      }
    })

    this.valueUpdate
      .pipe(debounceTime(150))
      .subscribe((obj: any) => {
        // Call your search function here
        this.fieldChange(obj.event, obj.data, obj.field, obj.section);
      });
  }

  @ViewChild('entryForm', { static: false }) entryForm: NgForm;

  formInactive: boolean;

  defaultParam: string = "{'$prev$.$id':$.$id}";

  liveSubscription: any[] = [];

  ngOnInit() {

    this.app = this.runService.$app();
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    this.user = this.runService.$user();

    // this.app = this.runService.app;

    // new add
    // this._param = deepMerge(this._param,this.$param$());

    this.appConst = this.runService?.appConfig;

    this.accessToken = this.userService.getToken();

    this.userService.getUser().subscribe(user => {
      this.user = user;
      // console.log(this.user);
      this.entry['email'] = this.user?.email;

      // APP ID
      // this.route.parent.params
      //   .subscribe((params: Params) => {
      //     // this.appId = params['appId'];
      //     if (params['appId']) {
      //       this.preurl = `/run/${params['appId']}`;
      //     }
      //     this.baseUrl = (location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;
      //   });


      // parameter entryId perlu ada utk execute form query n update page. maybe bleh pake 'single'
      if (this.asComp()) {
        this._entryId = this.entryId();
        this._formId = this.formId();
        this._action = this.action();
        this._param = this.$param$();

        // console.log("## UPDATED INPUT", "entryId",this._entryId, "formId", this._formId, "action", this._action, "param", this._param );

        this.getForm(this._formId, this._entryId, this._action);
        this.getLookupIdList(this._formId);
        
      } else {
        // combineLatest([this.route.params, this.route.queryParams])
        //   .subscribe(([params, queryParams]) => {
        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams),
          // debounceTime(0)
          distinctUntilChanged() // mn xda tok nya akan trigger 2 kali on refresh
        ).subscribe(([url, params, queryParams]) => {
          // const formId = +params['formId'];
          // console.log("## UPDATED PARAM", params, queryParams);
          this._action = params['action'];
          this._formId = +params['formId'];
          // this.action.set(action);
          // this.$param$ = queryParams;
          // new add
          // this._param = deepMerge(this._param,queryParams);
          // this.$param$.update(p=>({...p, ...queryParams}));
          this._param = queryParams;
          this.tab = queryParams['tab'] ?? 0;
          this._entryId = queryParams['entryId'];

          // tok comment lok: 1/nov/2024
          // if (this._entryId){
          //   // kenak entryParam perlu di nullified ctok???
          //   this.entryParam = null;
          // }else{
          //   this.entryParam = queryParams;
          // }

          // if (entryId) {
          //   this._entryId = +entryId;
          //   this.entryParam = null;
          // } else {
          //   this._entryId = null;
          //   this.entryParam = queryParams;
          // }

          this.getForm(this._formId, this._entryId, this._action);
          this.getLookupIdList(this._formId);
        })
      }


    });
  }

  dsChanged(ev, fieldCode) {
    this.$this$[fieldCode] = ev;
    // console.log(ev);
    this.fieldChange(ev, this.entry?.data, this.form.items[fieldCode], false)
    this.cdr.detectChanges();
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  // activeTab=0;
  // getForm(formId, entryId, prevEntryId) {
  watchList = new Map();
  watchListSection: any = {};
  // userUnauthorized: boolean;

  onInit;
  onSave;
  onSubmit;
  onView;

  invalidFacet: boolean = false;
  invalidFacetKey: string = "";
  editWithoutId: boolean = false;

  sectionMap: any = {};
  // tabMap:any = {}
  getForm(formId, entryId, action) {
    this.loading = true;
    this.runService.getForm(formId)
      .subscribe(form => {
        // console.log("form equal(old)",this._formId == form.id)
        // console.log("form equal(new)",formId == form.id)

        // if (formId == form.id) { // why perlu da checking tok
          this.form = form;
          this.form.activeNav = 0;
          var formTab = this.form.nav != 'simple' ? this.form.tabs : [{}]

          // TAMBAHAN UNTUK FEATURE HEAD & BOTTOM SECTION UNTUK TABBED NAV
          if (this.form.nav != 'simple'){
            this.sectionMap[-1] = this.filterSection(this.form.sections, ['section', 'list'], -1)
            this.sectionMap[-999] = this.filterSection(this.form.sections, ['section', 'list'], -999)
          }

          formTab.forEach(tab => {
            this.sectionMap[tab?.id] = this.filterSection(this.form.sections, ['section', 'list'], tab?.id)
          });

          // check interception
          // dlm accessList = [100,101,102]
          // dlm keys(user.groups) = ["100","101","102"]
          // let intercept = this.form.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
          // if (this.form.accessList?.length > 0 && intercept.length == 0) {
          //   // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
          //   this.userUnauthorized = true;
          // }

          this.isAuthorized = this.checkAuthorized(this.form, this.user, null);

          // delete this.entry;
          this.entry = { currentStatus: 'drafted', data: {} }; // reset entry 
          this.onInit = () => this.initForm(form.f, this.entry.data, form);
          this.onView = () => this.initForm(form.onView, this.entry.data, form);
          this.onSave = () => this.initForm(form.onSave, this.entry.data, form);
          this.onSubmit = () => this.initForm(form.onSubmit, this.entry.data, form);

          this.loading = false;


          if (action == 'edit') {
            if (entryId || !this.isEmpty(this._param || {})){
              this.getData(entryId, form);
            }else{
              if (form.single){
                this.getDataSingle(form);
              }else{
                this.editWithoutId = true;
              }
            }            
          } else if (action == 'edit-single') {
            this.getDataSingle(form);
            this.formInactive = (form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now())
          } else if (action == 'prev') {
            this.formInactive = (form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now())
            this.getPrevData(entryId, this._param, form.prev);
          } else if (action == 'add') {
            this.formInactive = (form.startDate && form.startDate > Date.now()) || (form.endDate && form.endDate < Date.now())
            this.initForm(this.form.f, this.entry.data, this.form);
          } else if (form.x?.facet?.includes(action)) {
            this.getData(entryId, form);
            // this.initForm(this.form.f); //comment after change initform receive data parameter
          } else {
            this.invalidFacet = true;
            this.invalidFacetKey = action;
          }
  
          // this.watchList = new Map();
          // make sure order of eval field is followed
          this.form.sections.forEach(s => {
            if (['section'].indexOf(s.type) > -1) { // watch for section eval. previously section+approval
              s.items.forEach(item => {
                if (this.form.items[item.code].type == 'eval') {
                  this.watchList.set(item.code, this.form.items[item.code].f)
                }
              });
            } else if (s.type == 'list') { // watch for section in list
              this.watchListSection[s.code] = new Map();
              s.items.forEach(item => {
                if (this.form.items[item.code].type == 'eval') {
                  this.watchListSection[s.code].set(item.code, this.form.items[item.code].f)
                }
              });
            }
          })

          this.evalAll(this.entry.data);
          this.filterTabs();
          this.filterItems();

          // perlu engkah lepas filterTabs(); Tp knak nya run twice??!!
          this.tabPostAction(0);

      });
  }

  unAuthorizedMsg:string = "";
  isAuthorized:boolean = false;
  // userUnauthorized by default is false
  checkAuthorized = (form, user, entry)=>{
    if (form?.x?.restrictAccess){
      let groupAuthorized = false;
      let approverAuthorized = false;
      // let isAdd = false;
      let userAuthorized = false;
      let condAuthorized = false;
      let formSingle = false;

      let intercept = form.accessList?.filter(v => Object.keys(user.groups).includes(v + ""));
      if (intercept.length > 0) {
        // this.form.accessList?.length == 0 || 
        // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        groupAuthorized = true;
      }else{
        this.unAuthorizedMsg = this.app?.x?.lang=='ms'?"Anda tidak mempunyai akses kepada borang ini":"You are not authorized to access this form";
      }
      // mn set restrict access + user + approver, time add request knak restrict sbb group x set yg allowed
      // so, condition nya always false.
      // tp mn include isAdd, bila da set group, nya always allow on on.
      // mn tambah condition (isAdd && this.form.accessList?.length==0)?
      let isAddNoGroup = ['add','prev'].includes(this._action) && this.form.accessList?.length==0;
      
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

      // console.log("user", userAuthorized,"approver", approverAuthorized,"group", groupAuthorized,"cond",condAuthorized, "isAddNoGroup", isAddNoGroup,"formSingle", formSingle)
      return groupAuthorized||approverAuthorized||userAuthorized||condAuthorized||isAddNoGroup||formSingle;
    }else{
      return true;
    }
  }

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
          // var param = null;
          // try {
          // param = this._eval(this.entry.data, key.dataSourceInit);// new Function('$', '$prev$', '$user$', '$lookup$', '$http$', 'return ' + key.dataSourceInit)(this.entry, this.entry && this.entry.prev, this.user, this.getLookup, this.httpGet)
          // } catch (e) { }

          // only pre-load lookup data if not select or text. select/text init param value might not available for loading
          // select/text also loaded when onfocus.
          if (['select', 'text'].indexOf(key.type) == -1 && !key.skipLoadSource) {
            this.getLookup(key.code, key.dataSourceInit, this.entry.data);
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
        param = this._eval(dataV, dsInit, this.form);// new Function('$', '$prev$', '$user$', '$lookup$', '$http$', 'return ' + key.dataSourceInit)(this.entry, this.entry && this.entry.prev, this.user, this.getLookup, this.httpGet)
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
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.form.appId, params, callback, error).pipe(tap(() => this.$digest$())))

  uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app?.id, obj.file.name)
    .pipe( tap({ next: callback, error: error }), first() ));


  navIndex: number = 0;
  // @ViewChild('nav') navOutlet;
  navOutlet = viewChild<any>('nav')

  setActive = (index) => {
    this.navIndex = index;
    if (['tabs', 'pills'].indexOf(this.form.nav) > -1) {
      this.navOutlet().select(this._action + index);
    } else if (this.form.nav == 'accordions') {
      this.navOutlet().toggle(this._action + index);
    }
  }

  sForm: any;

  filteredTabs = [];
  disabledTabs = {};
  filterTabs() {// || (t.x?.facet?.[this.action()]=='disabled')
    this.filteredTabs = this.form.tabs.filter(t => this.preCheckStr(t.pre) && !(t.x?.facet?.[this._action] == 'none'));
    this.filteredTabs.forEach((t) => this.disabledTabs[t.id] = (this.preCheckStr(t.x?.enableCond, false)) && (t.x?.facet?.[this._action] != 'disabled'))
  }

  groupByPipe = new GroupByPipe();

  getPathForGrouping(code){
    let fieldPath = code;
    if(code){
      // let split = rootDotCode.split(".");
      let field = this.form.items[code];
      if (['select', 'radio'].indexOf(field?.type)>-1){
        fieldPath += '.name';
      }else if (['modelPicker'].indexOf(field?.type)>-1){
        fieldPath += '.' + field?.bindLabel;
      }else if (['date'].indexOf(field?.type)>-1){
        fieldPath += '|date:'+(field.format??'yyyy-MM-dd');
      }
    }
    return fieldPath;
  }

  timestamp: number = 0;
  preItem: any = {};
  dynDefaultValue: any = {};
  preSection: any = {}
  classSection: any = {}
  preCompFilter: any = {}
  groupedChildList:any = {}
  filterItems() {
    // console.log("filter items")
    this.form.sections.forEach(s => {
      this.preSection[s.id] = this.preCheckStr(s.pre);
      this.classSection[s.id] = compileTpl(s.style??'', { $user$: this.user, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
      if (this.preSection[s.id]) {
        // only evaluate items pre when section is available. If not, no need.
        if (s.type != 'list') {
          s.items.forEach(i => {
            // console.log(i);
            this.preItem[i.code] = this.preCheckStr(this.form.items[i.code].pre);
            try{
              this.dynDefaultValue[i.code] = this._eval(this.entry?.data, this.form.items[i.code]?.x?.dyn_default, this.form);
              // console.log(this.dynDefaultValue)
            }catch(e){}
            if (['dataset', 'screen'].indexOf(this.form.items[i.code].type) > -1) {
              // console.log(this.form.items[i.code].dataSourceInit);
              try{
                this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam);
              }catch(e){}
            }
            if (['checkboxOption', 'radio'].indexOf(this.form.items[i.code].type) > -1) {
              // console.log(this.form.items[i.code].dataSourceInit);
              try{
                this.getLookup(i.code,this.form.items[i.code].dataSourceInit, this.entry?.data);
                // this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam)
              }catch(e){}
            }
          })
        } else {
          this.preItem[s.code] = [];
          this.dynDefaultValue[s.code] = [];
          if (this.sectionSort[s.code] || s.x?.sortable) {
            let sort = this.sectionSort[s.code] ?? (s.x?.defSort?{
              label: this.form.items[s.x?.defSort].label,
              field: s.x?.defSort,
              dir: s.x?.defSortDir
            }:{});
            // if ada section sort
            this.sortChild(s.code, sort.field, sort.label, sort.dir);
          }
          if (this.entry.data && Array.isArray(this.entry.data[s.code])){
            // console.log("child data",this.entry.data[s.code])
            // var groupedEntryList = this.groupByPipe.transform(this.entry.data[s.code], this.getPathForGrouping(s.x?.defGroupField));
            this.groupedChildList[s.code] = this.groupByPipe.transform(this.entry.data[s.code], this.getPathForGrouping(s.x?.defGroupField));

            // console.log('groupedEntryList',this.groupedChildList[s.code]);

            var idx = 0;
            this.groupedChildList[s.code].forEach((ge, index_g)=>{
              ge.value.forEach((child, index_c)=>{
                child.$index = idx++; // re-assign index
                var index = index_g+'-'+index_c; 
                this.preItem[s.code][index] = {}
                this.dynDefaultValue[s.code][index] = {}
                s.items.forEach(i => {
                  this.preItem[s.code][index][i.code] = this.preCheckStr(this.form.items[i.code].pre, child);
                  try{
                    this.dynDefaultValue[s.code][index][i.code] = this._eval(this.entry?.data, this.form.items[i.code]?.x?.dyn_default, this.form);
                  }catch(e){}
                  if (['dataset', 'screen'].indexOf(this.form.items[i.code].type) > -1) {
                    try{
                      this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam)
                    }catch(e){}
                  }
                  if (['checkboxOption', 'radio'].indexOf(this.form.items[i.code].type) > -1) {
                    try{
                      this.getLookup(i.code,this.form.items[i.code].dataSourceInit, child);
                      // this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam)
                    }catch(e){}
                  }
                })
              })

            })

            this.entry.data[s.code]?.forEach((child, index) => {
              child.$index = index; // re-assign index
              this.preItem[s.code][index] = {}
              this.dynDefaultValue[s.code][index] = {}
              s.items.forEach(i => {
                this.preItem[s.code][index][i.code] = this.preCheckStr(this.form.items[i.code].pre, child);
                try{
                  this.dynDefaultValue[s.code][index][i.code] = this._eval(this.entry?.data, this.form.items[i.code]?.x?.dyn_default, this.form);
                }catch(e){}
                if (['dataset', 'screen'].indexOf(this.form.items[i.code].type) > -1) {
                  try{
                    this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam)
                  }catch(e){}
                }
                if (['checkboxOption', 'radio'].indexOf(this.form.items[i.code].type) > -1) {
                  try{
                    this.getLookup(i.code,this.form.items[i.code].dataSourceInit, child);
                    // this.preCompFilter[i.code] = this._pre(this.entry?.data, this.form.items[i.code].dataSourceInit || this.defaultParam)
                  }catch(e){}
                }
              })
            })
          }
        }
      }
    })
    this.timestamp = Date.now();
  }

  preChildItem: any = {}
  childDynDefaultValue: any = {};
  filterChildItems(data, section) {
    section.items.forEach(i => {
      this.preChildItem[i.code] = this.preCheckStr(this.form.items[i.code].pre, data)
      try{
        this.childDynDefaultValue[i.code] = this._eval(this.entry?.data, this.form.items[i.code]?.x?.dyn_default, this.form);
      }catch(e){}
      // if (['dataset','screen'].indexOf(this.form.items[i.code].type)>-1){
      //   this.preCompFilter[i.code]=this._pre(this.entry?.data,this.form.items[i.code].dataSourceInit||this.defaultParam)
      // }
    })
  }

  sectionSort: any = {}

  sortChild(sectionKey, field, label, dir) {
    this.sectionSort[sectionKey] = {
      label: label,
      field: field,
      dir: dir
    };
    if (dir == 'desc') {
      this.entry.data[sectionKey]?.sort((a, b) => (b[field] > a[field]) ? 1 : ((a[field] > b[field]) ? -1 : 0))
    } else {
      this.entry.data[sectionKey]?.sort((a, b) => (a[field] > b[field]) ? 1 : ((b[field] > a[field]) ? -1 : 0))
    }
  }


  valueUpdate = new Subject<any>();

  debFieldChange($event, data, field, section) {
    // EXTRACT BY AI
    if (field.x?.extractor) {
      if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())){
        this.extractData(field, field.x?.extractor, [], $event, data);        
      }
    }
    
    this.valueUpdate.next({ event: $event, data: data, field: field, section: section })
  }
  // $el='as';
  fieldChange($event, data, field, section) {
    // console.log("--fieldChange--", data, $event)
    if (field.post) {
      try {
        this._eval(data, field.post, this.form);
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
    // mn _pre direct value sentiasa diupdate.
    // need more study
    // update: dlm built-in anonymous function semua dh tap(filterItems);
    this.filterItems();
  }

  submit = (resubmit: boolean) => {
    this.saving = true;
    this._save(this.form)
      .subscribe({
        next: res => {
          this.entry = res;
          this.saving = false;
          this.submitting = true;
          this.entryService.submit(res.id, this.user.email, resubmit)
            .subscribe({
              next: res => {
                if (this.form.onSubmit) {
                  try {
                    this._eval(this.entry.data, this.form.onSubmit, this.form);
                  } catch (e) { this.logService.log(`{form-${this.form.title}-onSubmit}-${e}`) }
                }
                this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
                this.submitting = false;
                if (this.asComp()) {
                  this.submitted.emit(res);
                } else {
                  if (!(this.form.x && this.form.x.submitAndStay)) {
                    this.router.navigate([this.preurl, "form", this.form.id, "view"], { queryParams: { entryId: res.id } });
                  }
                }
              }, error: err => {
                this.submitting = false;
                this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
              }
            })
        }, error: err => {
          this.saving = false;
          this.toastService.show("Entry saving failed", { classname: 'bg-danger text-light' });
        }
      })
  }


  getDataSingle(form) {
    // console.log(form);
    this.entryService.getFirstEntryByParam(this._eval({}, form.singleQ, form), form.id)
      .subscribe({
        next: res => {
          this.entry = res; //Object.assign(this.entry, res);
          this.evalAll(this.entry.data);
          this.initForm(form.f, this.entry.data, form);
          this.loading = false;
        }, error: err => {
          // consider getPrevData() but need to add support for prevParam;
          if (form.prev) {
            this.getPrevData(null, this.getPrevParam(this._eval({}, form.singleQ, form)), form.prev);
          } else {
            this.initForm(form.f, this.entry.data, form);
            this.loading = false;
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
  getData(id, form) {
    // console.log(this.entry);
    // console.log("try to load entry", id)
    if (id) {
      // if using entry id
      this.loading = true;
      // why use this.entryId()??? why not id? changed to id, 31/10/2024
      this.entryService.getEntry(id, form.id)
        .subscribe({
          next: res => {
            console.log("## LOADED ENTRY", id,res.id)
            this.entry = res;//Object.assign(this.entry, res);
            this.getDataFiles('data', res.id);
            this.evalAll(this.entry.data);
            this.initForm(this.form.f, this.entry.data, this.form);
            this.loading = false;
            this.isAuthorized = this.checkAuthorized(this.form, this.user, this.entry)
            // console.log("isAuthorized", this.isAuthorized);
            if (form.prev) {
              // this.prevEntry = res.prev;
              // this.entry.prev = res.data;
              // this.getDataFiles('prev', res.id);
              // this.evalAll(this.entry.data);
              // this.initForm(form?.onView, res.data, form);
              // this.initForm(this.form.f, this.entry.data, this.form);
              // this.loading = false;
              this.getPrevData(res.prev?.$id, {}, form.prev);
            }else{
              this.prevId = undefined;
              this.prevEntry = undefined;
              delete this.entry.prev;
            }
          }, error: err => {
            this.loading = false;
          }
        })
    } else {
      if (!this.isEmpty(this._param)) {
        // if using param instead of entry id
        this.loading = true;
        this.entryService.getFirstEntryByParam(this._param, form.id)
          .subscribe({
            next: res => {
              this.entry = res;//Object.assign(this.entry, res);
              this.getDataFiles('data', res.id);
              this.evalAll(this.entry.data);
              this.initForm(this.form.f, this.entry.data, this.form);
              this.loading = false;
              this.isAuthorized = this.checkAuthorized(this.form, this.user, this.entry)
              // console.log("isAuthorized", this.isAuthorized);
            }, error: err => {
              this.loading = false;
            }
          })
      } else {
        if (this.form.single) {
          var f = this._eval({}, this.form.singleQ, this.form);
          this.entryService.getFirstEntryByParam(f, form.id)
            .subscribe({
              next: res => {
                this.entry = res; //Object.assign(this.entry, res);
                this.getDataFiles('data', res.id);
                this.evalAll(this.entry.data);
                this.initForm(this.form.f, this.entry.data, this.form);
                this.loading = false;
                this.isAuthorized = this.checkAuthorized(this.form, this.user, this.entry)
                // console.log("isAuthorized", this.isAuthorized);
              }, error: err => {
                this.loading = false;
              }
            })
        }
      }
    }
  }


  prevId: number | null;
  prevEntry: any;
  prevLoading: boolean;
  getPrevData(id, params, form) {
    if (id) {
      this.prevId = id;
      this.prevLoading = true;
      this.entryService.getEntry(id, form?.id)
        .subscribe({
          next: res => {
            this.prevEntry = res;
            this.entry.prev = res.data;
            this.getDataFiles('prev', res.id);
            this.evalAll(this.entry.data);
            this.initForm(form?.onView, res.data, form);
            this.initForm(this.form.f, this.entry.data, this.form);
            this.prevLoading = false;
          }, error: err => {
            this.prevLoading = false;
          }
        })
    } else {
      this.prevLoading = true;
      this.entryService.getFirstEntryByParam(params, form?.id)
        .subscribe({
          next: res => {
            this.prevId = res.id;
            this.prevEntry = res;
            this.entry.prev = res.data;
            this.getDataFiles('prev', res.id);
            this.evalAll(this.entry.data);
            this.initForm(form?.onView, res.data, form);
            this.initForm(this.form.f, this.entry.data, this.form);
            this.prevLoading = false;
          }, error: err => {
            this.prevLoading = false;
          }
        });
    }
  }

  progBack(index) {
    this.saving = true;
    this._save(this.form)
      .subscribe({
        next: res => {
          this.saving = false;
          this.tabPostAction(index - 1);
          this.setActive(index - 1); // utk tukar tab
        },
        error: err => {
          this.saving = false;
        }
      })
    // this.timestamp = Date.now();
    // console.log("time", this.timestamp)

  }

  progNext(index) {
    this.saving = true;
    this._save(this.form)
      .subscribe({
        next: res => {
          this.saving = false;
          this.tabPostAction(index + 1);
          this.setActive(index + 1); // utk tukar tab
        },
        error: err => {
          this.saving = false;
        }
      })
    // this.timestamp = Date.now();
    // console.log("time", this.timestamp)

  }

  tabPostAction(index){ 
    console.log("index",index)   
    this.navIndex = index;
    var curTab = this.filteredTabs[index];
    if (curTab && curTab?.x?.post) {
      try {
        this._eval(this.entry.data, curTab?.x?.post, this.form);
      } catch (e) { this.logService.log(`{form-${this.form.title}-onSave}-${e}`) }
    }

  }

  save = () => {
    this.saving = true;
    // console.log(this.entry);
    this._save(this.form)
      .subscribe({
        next: res => {
          this.entry = res;
          this.saving = false;
          if (this.form.onSave) {
            try {
              this._eval(this.entry.data, this.form.onSave, this.form);
            } catch (e) { this.logService.log(`{form-${this.form.title}-onSave}-${e}`) }
          }
          // this.router.navigate(["run", this.form.app.id, "form", this.form.id, "view", this.entry.id]);
          this.toastService.show("Entry saved successfully", { classname: 'bg-success text-light' });
          if (this.asComp()) {
            this.saved.emit(res);
          } else {
            if (!(this.form.x && this.form.x.saveAndStay)) {
              this.router.navigate([this.preurl, "form", this.form.id, "view"], { queryParams: { entryId: this.entry.id } });
            }
          }
        }, error: err => {
          this.saving = false;
          this.toastService.show("Entry saving failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  _save = (form) => {
    // console.log("Saving form...", form);
    let userKey = this.user.email;
    if (form?.x?.userKey) {
      userKey = compileTpl(form?.x?.userKey, { $user$: this.user, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
    }
    return this.entryService.save(form.id, this.entry, this.prevId, userKey)
      .pipe(
        tap({
          next: (e) => {
            this.entry = e;
            // this.timestamp = Date.now();
            this.filterItems();

            // console.log("time (save)", this.timestamp)
            this.linkFiles(e);
            // this.$digest$(); // this prevent ask navigate to be displayed!! NOT-WORKING. Actual reason for dirty is html keep-value
            this.entryForm.form.markAsPristine();
          }
        }), first()
      )
  }

  linkFiles(e) {
    this.entryService.linkFiles(e.id, this.entryFiles, this.user.email)
      .subscribe(res => { });
  }

  file: any = {}

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

  timeoutList:any[]=[];
  _setTimeout = (functionRef, delay, ...param) => {
    let timeoutId = setTimeout(() => {
      functionRef();
      this.$digest$();
    }, delay, ...param)
    this.timeoutList.push(timeoutId);
  }

  intervalList:any[]=[];
  _setInterval = (functionRef, delay, ...param) => {
    let intervalId = setInterval(() => {
      functionRef();
      this.$digest$();
    }, delay, ...param)
    this.intervalList.push(intervalId);
  }

  // preCheck(f, dataV?: any, prop?:string) {
  //   let res = undefined;
  //   try {
  //     if (!dataV) {
  //       dataV = this.entry.data;
  //     }
  //     if (!prop){
  //       prop = 'pre';
  //     }
  //     res = this._pre(dataV, f?.[prop]);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
  //   } catch (e) { this.logService.log(`{form-${f?.code}-precheck}-${e}`) }
  //   return !f?.[prop] || res;
  // }

  evalAll(data) {
    this.watchList.forEach((value, key) => {
      data[key] = this.changeEval(data, value);
    })

    // STILL NEED TO RUN ON COMP. RUN ON compileTpl not working
    // setTimeout(()=>{
    //   mermaid.run({querySelector:'.mermaid'})
    // },100) 
  }
  evalAllSection(data, section) {
    this.watchListSection[section.code]?.forEach((value, key) => {
      data[key] = this.changeEval(data, value);
    })
  }

  changeEval(data, js) {
    let res = undefined;
    try {
      res = this._eval(data, js, this.form);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f.f)(data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{form-${this.form.title}-change}-${e}`) }
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
    // console.log("hhhh")
    let res = undefined;
    setTimeout(()=>{
      try {
        res = this._eval(data, js, form);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
      } catch (e) { this.logService.log(`{form-${this.form.title}-initForm}-${e}`) }
      this.filterTabs();
      this.filterItems();

      // setTimeout(()=>{
      //   mermaid.run({querySelector:'.mermaid'})
      // },100) 
  
    },0)

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

  $this$ = {};
  _eval = (data, v, form) => new Function('setTimeout', 'setInterval', '$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$action$', '$setAction$', '$lookup$', '$http$', '$post$', '$upload$', '$endpoint$', '$saveAndView$', '$save$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$activeIndex$', '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$ngForm$', '$lookupList$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$file$', 'onInit', 'onSave', 'onSubmit', 'onView', '$q$',
    `return ${v}`)(this._setTimeout, this._setInterval, this.app, this.entry, data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this._action, this.setAction, this._getLookup, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, this.save, () => this._save(form || this.form), this.submit, form?.items || this.form?.items, form || this.form, this.$this$, this.loadScript, this.$digest$, this._param, this.log, this.setActive, this.navIndex, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.entryForm, this.lookup, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.filesMap, this.onInit, this.onSave, this.onSubmit, this.onView, this.$q);
  _pre = (data, v) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$action$', '$el$', '$form$', '$this$', '$digest$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$ngForm$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$file$', '$activeIndex$',
    `return ${v}`)(this.app, this.entry, data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this._action, this.form && this.form.items, this.form, this.$this$, this.$digest$, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.entryForm, this.lookup, dayjs, ServerDate, this.accessToken, this.filesMap, this.navIndex);


  setAction = (action)=> this._action=action;

  /** Need to study either to implement deepMerge when updated entry: refer view-component */
  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.form.appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => {
          this.$digest$();
          if (this.asComp()) {
            this.saved.emit(this.entry);
          }      
        }),
        first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.form.appId)
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

    this.filterChildItems(data, section);

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        /** Ada evaluated field main masok dlm child sebab evalAll(data) kt fieldChange */
        if (res) {
          Object.assign(data, res);
        }
        if (isNew) {
          if (!this.entry.data[section.code]) {
            this.entry.data[section.code] = []
          }
          res['$index'] = this.entry.data[section.code].length;
          this.entry.data[section.code].push(res);
        }
        this.entryForm.form.markAsDirty();
        this.evalAll(this.entry.data);
        this.filterItems();
      }, err => { });
  }

  removeChild(section, $index) {
    if (section.confirmable) {
      if (confirm("Are you sure you want to remove this data?")) {
        this.entry.data[section.code].splice($index, 1);
        this.entryForm.form.markAsDirty();
      }
    } else {
      this.entry.data[section.code].splice($index, 1);
      this.entryForm.form.markAsDirty();
    }

    this.evalAll(this.entry.data);
  }

  // uploading = {};

  onFileClear($event, data, f, evalEntryData, index) {
    // console.log("FIle SELECT:" + $event);
    /** Problem, bila user click Cancel, akan remove suma dlm entryFIles
     * sbb $event return current file value;
     * FIXED: Handle sebelah field-edit. If file length == 0, then dont trigger clear
     */
    // if ($event!=data[f.code]) {

    var fileList = f.subType.indexOf('multi') > -1 ? $event : [$event];
    this.entryService.deleteAttachment($event)
      .subscribe(res => {
        // data[f.code]=null;
        delete this.uploadProgress[f.code+(index??'')];
        this.fieldChange($event, data, f, evalEntryData);
        fileList.forEach(file => {
          this.entryFiles.splice(this.entryFiles.indexOf(file), 1);
          delete this.filesMap[file];
        })
      });
    // }
  }

  entryFiles: any[] = [];

  uploadProgress: any = {};

  onUpload(fileList, data, f, evalEntryData, index) {
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
              if (f.x?.filenameTpl && f.x?.bucket){
                let ext = getFileExt(filename);
                filename = compileTpl(f.x?.filenameTpl, { $user$: this.user, $unique$: Date.now(), $file$: file, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
                           +ext;
              }              
              console.log("FILENAME### : " + filename)
              this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form.appId, filename)
                .subscribe({
                  next: res => {
                    this.processUpload(res, data, fileList, evalEntryData, progressSize,f, totalSize, index, true, list);
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
            if (f.x?.filenameTpl && f.x?.bucket){
              let ext = getFileExt(filename);
              filename = compileTpl(f.x?.filenameTpl, { $user$: this.user, $unique$: Date.now(), $file$: fileList[0], $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
                         +ext;
            }              
            console.log("FILENAME### : " + filename)
            this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form.appId, filename)
              .subscribe({
                next: res => {
                  this.processUpload(res, data, fileList, evalEntryData, progressSize,f, totalSize, index, false, list);
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
          // this.fileLarge[f.id]=[];
          for (var i = 0; i < fileList.length; i++) {
            var file = fileList[i];
            if (f.v.max && file.size > f.v.max * 1024 * 1024) {
              return;
            }
            let filename = file.name;
            if (f.x?.filenameTpl && f.x?.bucket){
              let ext = getFileExt(filename);
              filename = compileTpl(f.x?.filenameTpl, { $user$: this.user, $unique$: Date.now(), $file$: file, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
                         +ext;
            }              
            console.log("FILENAME### : " + filename)
            this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form.appId, file.name)
              .subscribe({
                next: res => {
                  this.processUpload(res, data, fileList, evalEntryData, progressSize,f, totalSize, index, true, list);
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
          if (f.x?.filenameTpl && f.x?.bucket){
            let ext = getFileExt(filename);
            filename = compileTpl(f.x?.filenameTpl, { $user$: this.user, $unique$: Date.now(), $file$: file, $: this.entry?.data, $_: this.entry, $prev$: this.entry?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param, $ngForm$: this.entryForm })
                       +ext;
          }
          this.entryService.uploadAttachment(file, f.id, f.x?.bucket, this.form.appId, filename)
            .subscribe({
              next: res => {
                this.processUpload(res, data, fileList, evalEntryData, progressSize,f, totalSize, index, false, list);
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

  processUpload(res, data, fileList, evalEntryData, progressSize,f, totalSize, index, multi, list){
    if (res.type === HttpEventType.UploadProgress) {
      progressSize = res.loaded;
      this.uploadProgress[f.code + (index ?? '')] = Math.round(100 * progressSize / totalSize);
    } else if (res instanceof HttpResponse) {
      if (res.body?.success){
        if (multi){
          list.push(res.body.fileUrl)
          data[f.code] = list
        }else{
          data[f.code] = res.body.fileUrl;
        }
        // data[f.code] = multi?[res.body.fileUrl]:res.body.fileUrl;
        this.filesMap[res.body.fileUrl] = res.body;
        this.fieldChange(fileList, data, f, evalEntryData);
        this.entryFiles.push(res.body.fileUrl);

        if (f.x?.extractor) {
          this.extractData(f, f.x?.extractor, [res.body.fileUrl],null, data);
        }
        if (f.x?.imgcls){
          this.imgclsData(f, f.x?.imgcls,[res.body.fileUrl], data );
        }
      }else{
        this.toastService.show(res.body?.message, { classname: 'bg-danger text-light' });
      }
    }
  }

  onBlur($event,data,field,section){
    if (field.x?.extractor) {
      // if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())){
        this.extractData(field, field.x?.extractor, [], data[field.code], data);        
      // }
    }
    if (field.x?.txtcls) {
      // console.log("data",data[field.code])
      // if (!field.x?.stopWord || $event?.toLowerCase().includes(field.x?.stopWord?.toLowerCase())){
        this.classifyData(field, field.x?.txtcls, field.x?.txtclsTarget, data[field.code], data);        
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

  extractLoading:any={}
  extractData(field, cognaId, docList, text, data) {
    this.extractLoading[field.code] = true;
    this.runService.cognaExtract(cognaId, text, docList, false, this.user.email)
      .subscribe({
        next: res => {
          var rval = res[0];
          delete rval[field.code];
          deepMerge(data, rval);
          this.evalAll(data);
          this.filterItems();
          this.extractLoading[field.code] = false;
        },
        error: err => {
          this.extractLoading[field.code] = false;
        }
      });
  }

  classifyLoading:any={}
  classifyData(field, cognaId, targetField, text, data) {
    this.classifyLoading[field.code] = true;
    this.runService.cognaClassify(cognaId, text, false, this.user.email)
      .subscribe({
        next: res => {
          data[targetField] = res.data;
          this.$this$[field.code]={txtcls:res.data}
          this.filterItems();
          this.classifyLoading[field.code] = false;
        },
        error: err => {
          this.classifyLoading[field.code] = false;
        }
      });
  }

  imgclsLoading:any={}
  imgclsData(field, cognaId, docList, data) {
    this.imgclsLoading[field.code] = true;
    this.runService.cognaImgCls(cognaId, docList, false, this.user.email)
      .subscribe({
        next: res => {
          let txtList = [];
          Object.keys(res).forEach(k=>{
            let txt = ""
            txt+=k+"\n"
            res[k].forEach((pred,index)=>{
              txt+= ((index+1)+") " + pred.desc + " ("+ pred.score+")\n");
            })
            txtList.push(txt);
          })
          data[field.x?.imgclsTarget] = txtList.join("\n\n");
          this.$this$[field.code]={imgcls:res}
          this.filterItems();
          this.imgclsLoading[field.code] = false;
        },
        error: err => {
          this.imgclsLoading[field.code] = false;
        }
      });
  }

  getIcon = (str) => str ? str.split(":") : ['far', 'file'];

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
    }, 500);
  }

  canDeactivate() {
    return !(this.form?.x?.askNavigate && this.entryForm?.dirty); //asknavigate && dirty --> modal
  }

  ngOnDestroy() {
    this.liveSubscription.forEach(sub => sub.unsubscribe());
    // console.log("destroy");
    this.intervalList.forEach(i=> clearInterval(i));
    this.timeoutList.forEach(i=> clearTimeout(i));
  }
}