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

import { ChangeDetectorRef, Component, OnChanges, OnInit, SimpleChanges, effect, forwardRef, input, model, output } from '@angular/core';
// import { EntryService } from '../../service/entry.service';
import { UserService } from '../../_shared/service/user.service';
// import { LookupService } from '../../service/lookup.service';
import { ActivatedRoute, NavigationExtras, Router, RouterLink } from '@angular/router';
import { base, baseApi } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbTooltip, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { PlatformLocation, Location, NgClass, KeyValuePipe, JsonPipe } from '@angular/common';
import { ToastService } from '../../_shared/service/toast-service';
import { ServerDate, br2nl, btoaUTF, compileTpl, deepMerge, hashObject, loadScript, nl2br, splitAsList } from '../../_shared/utils';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
// import { RunService } from '../../service/run.service';
import { LogService } from '../../_shared/service/log.service';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, first, lastValueFrom, map, Observable, share, tap, withLatestFrom } from 'rxjs';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
import { HttpClient } from '@angular/common/http';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { ScreenComponent } from '../screen/screen.component';
import { ViewComponent } from '../view/view.component';
import { FormComponent } from '../form/form.component';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
// import { StepWizardComponent } from '../../_shared/component/step-wizard.component';
// import { FieldViewComponent } from '../../_shared/component/field-view.component';
import { FormsModule } from '@angular/forms';
import { FaIconComponent, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { FieldViewComponent } from '../_component/field-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { StepWizardComponent } from '../_component/step-wizard.component';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
    imports: [PageTitleComponent, NgbTooltip, FaIconComponent, RouterLink, FormsModule, NgbDropdown, NgbDropdownToggle,
        NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, NgClass, FieldViewComponent, StepWizardComponent,
        NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, UserEntryFilterComponent, AngularEditorModule, 
        forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent),
        SafePipe, KeyValuePipe]
})
export class ListComponent implements OnInit, OnChanges {

  groupByPipe = new GroupByPipe();

  // @Input() datasetId: number;
  datasetId = input<number>();
  _datasetId:number;
  dataset: any;
  baseApi: string = baseApi;
  base: string = base;
  // appId: number;
  formId: any;
  entryTotal: number;
  entryList: any[];
  groupedEntryList: any[];
  entryPages: number;
  user: any;
  form: any = {};
  pageSize = 25;
  itemLoading: boolean;
  searchText: string = "";
  pageNumber = 1;
  offline: boolean = false;
  // @Input() filters: any = {}; // utk kegunaan dari @input (utk asComp=true)
  filters= model<any>({}); // utk kegunaan dari @input (utk asComp=true)
  // statuses:any = {};
  filtersEncoded: string; // utk kegunaan export url
  lookupIds: any;
  lookupKey = {};
  lookup = {};
  preurl: string = '';
  baseUrl: string = '';
  // @Input() $param$: any = {}; // utk kegunaan dari queryparam (utk asComp=false)
  $param$ = input<any>({}); // utk kegunaan dari queryparam (utk asComp=false)
  _param:any={}
  // @Input() asComp: boolean;
  asComp = input<boolean>(false);
  hideTitle = input<boolean>(false);
  $this$: any = {};
  app: any;
  // @Output() changed = new EventEmitter();
  changed = output<any>();
  accessToken: string = '';

  appConst: any;

  tiersMap:any={};

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
    'insertImage',
    'removeFormat',
    'toggleEditorMode'
  ]
    ]
  };

  timestamp = input<number>();

  builtInItems = {
    $id:{label:"System ID",code:'$id',type:'number',subType:'number'},
    $code:{label:"System Code",code:'$code',type:'text',subType:'input'},
    $counter:{label:"System Counter",code:'$counter',type:'number',subType:'number'}
  }


  // mapFm = { 'data': '$', 'prev': '$prev$', 'approval': '$$' }

  constructor(private userService: UserService,
    public runService: RunService,
    private entryService: EntryService,
    private lookupService: LookupService, 
    private route: ActivatedRoute,
    private router: Router,
    private utilityService: UtilityService,
    private modalService: NgbModal,
    private toastService: ToastService, private logService: LogService,
    private cdr: ChangeDetectorRef,
    private loc: Location,
    private faIconLib: FaIconLibrary,
    private location: PlatformLocation,
    private http: HttpClient) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

    // run dlm constructor to prevent flicker
    // if(this.asComp()){
    this.startListenFilter();
    // }
    
    effect(()=>{
    //   const _datasetId = this.datasetId();
      this._param = this.$param$();
    //   // use `untracked` to trigger operation that might change signal (BUT WHERE!!!!!)
    //   untracked(()=>{
    //     if (_datasetId){ // if dsId not undefined
    //       console.log("ds id")
    //       this.getDataset(_datasetId);
    //     }
    //   })
    })
  }

  private _filter = new BehaviorSubject<any>({});

  // Untuk ngecek changes dari @Input
  ngOnChanges(changes: SimpleChanges): void {
    if (JSON.stringify(changes.filters?.previousValue) != JSON.stringify(changes.filters?.currentValue)) {
      // console.log("changes",changes.filters?.currentValue)
      this._filter.next(changes.filters?.currentValue)
    }
  }

  prevId: number;

  ngOnInit() {
    this.app = this.runService.$app();
    // console.log("app",this.app)
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();

    // this.app = this.runService.app;

    this.accessToken = this.userService.getToken();

    this.appConst = this.runService?.appConfig;

    this.userService.getUser().subscribe((user) => {
      this.user = user;
      // this.route.parent.params
      //   .subscribe((params: Params) => {
      //     this.appId = params['appId'];
      //     if (this.appId) {
      //       this.preurl = `/run/${this.appId}`;
      //     }
      //     this.$baseUrl$ = (location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;
      //   });

      this._datasetId = this.datasetId();

      if (this.datasetId()) {
        //alert(JSON.stringify(this.$param$))
        this._param = this.$param$();

        this.getDataset(this._datasetId);
        //$param$ ialah param passed ke init function, bukan dataset parameter

        // listen to filter changes on @Input
        

      } else {

        // testt
        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams),
          distinctUntilChanged() // mn xda tok nya akan trigger 2 kali on refresh
          // debounceTime(0)
        ).subscribe(([url, params, queryParams]) => {
            this._datasetId = params['datasetId'];
            this.pageNumber = 1;
            
            this.getDataset(this._datasetId);

            this._param = {...this._param, ...queryParams};

            // this.$param$.update(p=>({...p,...queryParams})); // so, user can pass parameter through init parameter
            // this.$param$.set(params);
            const page = queryParams['page']; // page pn spatutnya boleh add jd param
            if (page) {
              this.pageNumber = page;
            }
        })
        // testt


        // this.route.params
        //   .subscribe((params: Params) => {
        //     this.datasetId.set(params['datasetId']);
        //     this.pageNumber = 1;
        //     if (this.datasetId()) {
        //       this.getDataset(this.datasetId());
        //     }
        //   });
      }

      // this.route.queryParams
      //   .subscribe((params: Params) => {
      //     this.$param$.update(p=>({...p,...params})); // so, user can pass parameter through init parameter
      //     // this.$param$.set(params);
      //     const page = params['page'];
      //     if (page) {
      //       this.pageNumber = page;
      //     }
      //   })

    });
  }

  // filters && $param$ berbeza
  startListenFilter() {
    this._filter.pipe(
      debounceTime(10),
      distinctUntilChanged()
    ).subscribe(f => {
      // console.log(f);
      this.filters.set(f);
      // if ada prevId, pass as prev-entryId dlm add button. add button perlu da return.
      if (f['$prev$.$id']) {
        this.prevId = f['$prev$.$id'];
      }
      if (this.dataset && this.user){
        this.getEntryList(this.pageNumber, this.sort);
      }      
    })
  }

  // page:number;

  // action list : submitted
  // action archive list: approved, rejected, returned
  // admin submission : ['submitted','approved','rejected','returned']
  // my submission: 'approved,rejected,returned,resubmitted,submitted'
  // my draft: drafted
  preCount: number;

  actionsInline: any[] = [];
  actionsDropdown: any[] = [];

  hideGroup:any={}

  userUnauthorized: boolean = false;
  loading: boolean;
  mailerList = [];
  totalColumn:number=0;
  getDataset(id) {
    this.loading = true;
    this.userUnauthorized = false;
    // console.log("--pre:loading data",id)
    this.runService.getDataset(id)
      .subscribe({
        next: res => {
          // console.log("--sub:loading data",id)
          this.dataset = res;
          this.totalColumn = res.items.length
           + (res?.x?.bulkAction?1:0) 
           + (res?.showIndex?1:0)
           + (res?.showStatus?1:0)
           + (res?.showAction?1:0);
          this.groupFieldCode = res.x?.defGroupField;
          this.actionsInline = res.actions.filter(f => f.type == 'inline');
          this.actionsDropdown = res.actions.filter(f => f.type == 'dropdown');
          this.loading = false;
          // if run via designer, no restriction, hence checking this.appId
          // if (this.dataset.access && !this.user.groups[this.dataset.access.id] && !this.appId) {
          //   this.userUnauthorized = true;
          // }
          let intercept = this.dataset.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
          if (this.dataset.accessList?.length > 0 && intercept.length == 0) {
            // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
            this.userUnauthorized = true;
          }

          this.form['data'] = res.form;
          this.form['data'].items = deepMerge(this.builtInItems, this.form['data'].items)
          this.form['prev'] = res.form.prev;
          // this.getLookupList();
          if (res.form.prev) {
          } else {
            this.form['prev'] = null;
          }
          this.getLookupInFilter()
          if (this.dataset.canBlast) {
            this.runService.getMailerList({ appId: this.dataset?.appId })
              .subscribe(res => {
                this.mailerList = res.content;
              })
          }

          res.form.tiers.forEach(t=>this.tiersMap[t.id]=t);
          // this.getForm(res.form.id);
          // this.filters = Object.create(res.presetFilters)||{};
          this.getEntryList(this.pageNumber);
        }, error: err => {
          this.loading = false;
        }
      })
  }

  loadTemplate(template) {
    // console.log(template);
    this.blastData = template;
    // this.blastData.content = this.br2nl(template.content);
    // this.blastData.content = template.content;
    // console.log(this.blastData);
  }

  changeParam(pageNumber) {
    this.router.navigate([],{queryParams:{page:pageNumber}, queryParamsHandling:'merge'})
    // this.loc.go(this.loc.path().split("?")[0], "page=" + pageNumber);
  }

  rowClass:any={};
  searchTextEncoded: string = "";
  // last: boolean; first: boolean; 
  numberOfElements: number;
  sort: string;
  getEntryList(pageNumber, sort?) {
    this.sort = sort;
    this.itemLoading = true;
    let filtersAll: any = {};
    if (!this.asComp()) {
      // dont read filter from localstorage if asComp 
      var savedFilter = localStorage.getItem("filter-" + this.dataset.id);
      this.filtersData = savedFilter ? JSON.parse(savedFilter) : {};
      filtersAll = Object.assign(filtersAll, this.filters(), this.filtersData, this._param);
    } else {
      filtersAll = Object.assign(filtersAll, this.filters(), this._param);
    }

    this.filtersEncoded = encodeURIComponent(JSON.stringify(filtersAll)); // utk export link
    this.searchTextEncoded = encodeURIComponent(this.searchText);

    this.changeParam(pageNumber);

    this.preCount = this.pageSize * (pageNumber - 1);

    let params = {
      email: this.user?.email,
      // status: this.statusEncoded,
      searchText: this.searchText,
      filters: JSON.stringify(filtersAll),
      page: pageNumber - 1,
      size: this.pageSize
    }

    if (this.dataset.presetFilters){
      Object.keys(this.dataset.presetFilters).forEach(k=>{
        params[k] = compileTpl(this.dataset.presetFilters[k]??'', { $user$: this.user, $conf$:this.runService.appConfig, $: {}, $_: {}, $prev$: {}, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param })
      })
    }


    params = Object.assign(params, this._pre({},this.dataset.x?.initParam, false));
    if (this.sort) {
      params['sorts'] = this.sort;
    }
    params['@cond'] = this.filtersCond;
    // if (this.dataset.defaultSort) {
    //   params['sort'] = this.dataset.defaultSort
    // }
    if (this.dataset?.id) {
      this.entryService.getListByDataset(this.dataset.id, params)
        .subscribe({
          next: res => {
            this.entryList = res.content;
            this.groupedEntryList = this.groupByPipe.transform(this.entryList, this.getPathForGrouping(this.groupFieldCode));
            this.entryTotal = res.page?.totalElements;
            this.itemLoading = false;
            // this.last = res.page?.last;
            // this.first = res.page?.first;
            this.numberOfElements = res.content?.length;
            this.entryPages = res.page?.totalPages;

            try{
              this.changed.emit(res);
            }catch(e){}

            this.entryList.forEach(e=>{
              this.rowClass[e.id]=compileTpl(this.dataset?.x?.rowClass??'', { $user$: this.user, $conf$:this.runService.appConfig, $: e?.data, $_: e, $prev$: e?.prev, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this._param })
            })

          }, error: err => {
            this.itemLoading = false
          }
        });
    }

  }

  insertTextAtCursor(text) {
    // cm.insertText("{{" + text + "}}");
    this.insertText("{{" + text + "}}")
  }
  insertText(text) {
    var sel, range;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }
    } else if ((document as any).selection && (document as any).selection.createRange) {
      (document as any).selection.createRange().text = text;
    }
  }

  blastList(data: any, ids: number[]) {
    let filtersAll: any = {};
    Object.assign(filtersAll, this.filters(), this.filtersData, this._param);
    this.filtersEncoded = encodeURIComponent(JSON.stringify(filtersAll));
    let params: any = {
      email: this.user.email,
      status: this.dataset.status,
      searchText: this.searchText,
      filters: JSON.stringify(filtersAll) //this.filtersEncoded
    }
    if (ids) {
      params.ids = ids;
    }
    this.entryService.blastByDataset(this.dataset.id, data, params)
      .subscribe({
        next: res => {
          let result = `<table width="100%">
                          <tr><td>Total Entry</td><td>: ${res.totalCount}</td></tr>
                          <tr><td>Total Sent</td><td>: ${res.totalSent}</td></tr>
                          <tr><td>Success</td><td>: ${res.success ? 'Yes' : 'No'}</td></tr>
                        </table>`;
          this.toastService.show("Blast successful <br/>" + result, { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show("Email blast failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  showHint;
  blastData: any = {};
  blastEmail(tpl, data) {
    this.blastData = data;

    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.blastList(res, undefined);
      }, res => { });
  }

  deleteEntry(id) {
    if (confirm("Remove this entry?")) {
      this.entryService.delete(id, this.user.email)
        .subscribe({
          next: res => {
            this.pageNumber = (this.numberOfElements == 1 && this.pageNumber==this.entryPages) ? this.pageNumber - 1 : this.pageNumber;
            this.getEntryList(this.pageNumber);
            this.toastService.show("Entry removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
          }
        })
    }
  }

  inPopEntryId: number;
  inPopType: string;
  inPopFacet: string;
  inPopFormId: string;
  inPopParams: any={};
  // tpl, entryId, formId, 'form','prev'
  inPop(content, entryId, formId, type, facet, params) {
    this.inPopEntryId = entryId;
    this.inPopType = type;
    this.inPopFacet = facet;
    this.inPopFormId = formId;
    if (params){
      params.entryId = entryId;
      this.inPopParams = params;
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => { 
        this.getEntryList(this.pageNumber,this.sort);
       }, err => { });

  }
  // #### ATTEMPT TO UNIFY POPUP AND NAVIGATE
  runAction(url,inpop, content, entryId, formId, type, facet, params) {
    if (inpop){ 
      this.inPop(content, entryId, formId, type, facet, params) 
    }else{
      let navigationExtras: NavigationExtras = {
        queryParams: deepMerge({entryId:entryId},params),
      };
      this.router.navigate([this.preurl + url], navigationExtras);
    }
  }

  deepMerge = deepMerge;

  actionUrl: string;
  actionTitle: string;
  openUrl(content, url, title) {
    this.actionUrl = url;
    this.actionTitle = title;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg', windowClass: 'browser-window' })
      .result.then(res => { }, err => { });
  }

  // openRoute(content, url, title) {
  //   this.actionUrl = url;
  //   this.actionTitle = title;
  //   // alert(this.$baseUrl$ + '/screen/642')
  //   // this.router.navigateByUrl('(extroute:'+this.$baseUrl$+'/screen/642)');//
  //   // this.router.navigate([{outlets:{'extroute':['screen','642']}}])
  //   history.pushState(null, null, window.location.href);
  //   this.modalService.open(content, { backdrop: 'static', size: 'lg', windowClass: 'browser-window' })
  //     .result.then(res => { }, err => { });
  // }

  cancelEntry(id) {
    if (confirm("Cancel this entry submission?")) {
      this.entryService.cancel(id, this.user.email)
        .subscribe(res => {
          this.getEntryList(this.pageNumber);
        })
    }
  }

  editTier: any;

  removeApproval(entry, tierId) {
    this.entryService.removeApproval(entry.id, tierId)
      .subscribe(res => {
        this.getEntryList(this.pageNumber);
        delete entry.approval[tierId];
      })
  }

  // Problem if prev form not yet loaded
  getLookupInFilter() {
    this.dataset.filters.forEach(f => {
      let ds = this.form[f.root]?.items[f.code]?.dataSource;
      let dsInit = this.form[f.root]?.items[f.code]?.dataSourceInit;
      let type = this.form[f.root]?.items[f.code]?.type;
      if (ds) { // only load filter with ds, which is lookup
        this.lookupKey[f.code] = {
          ds: ds,
          type: type
        }
        var param = null;
        try {
          param = new Function('$user$', 'return ' + dsInit)(this.user)
        } catch (e) { this.logService.log(`{list-${f.code}-dataSourceInit}-${e}`) }
        this._getLookup(f.code, dsInit ? param : null);
      }
    })
  }

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

      var cacheId =  'key_'+btoaUTF(this.lookupKey[code].ds + hashObject(param??{}));
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
            map((res:any)=>res.content), share()
          )
      }
      return this.lookupDataObs[cacheId];
  }



  getVal(field, entry, data) {
    var value = "";
    if (field) {
      value = data ? data[field.code] : null;
      if (field.type == 'eval' && value == null) {
        if (field.f) {
          try {
            value = this._eval(entry, data, field.f);
          } catch (e) { this.logService.log(`{list-${field.code}-f}-${e}`) }
        }
      }
    }
    return value;
  }


  filtersData: any = {};
  filtersCond: string = "AND";
  // statusFilterForm:any={}; 
  editFilterItems: any;
  editFilter(content, data, isNew) {
    // this.filtersData = Object.assign({}, data, this.dataset?.presetFilters);
    this.filtersData = Object.assign({}, data);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.filtersData = res; // re-assign sbb mungkin da Reset ({})
        localStorage.setItem("filter-" + this.dataset.id, JSON.stringify(this.filtersData));
        this.getEntryList(1);
      }, res => { });
  }

  // clearFilter(){
  //   this.filters=Object.create(this.dataset.presetFilters)||{};
  //   this.filtersData=Object.create(this.dataset.presetFilters)||{};
  //   localStorage.removeItem("filter-"+this.dataset.id);
  // }

  checkFilter = () => Object.keys(this.filtersData).length === 0 && this.filtersData.constructor === Object
  filterSize = () => Object.keys(this.filtersData).length;

  getAsList = splitAsList;

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data);
    } catch (e) {
      this.logService.log(`{list-${this.dataset?.title}-compiletpl}-${e}`)
    }
    return f;
  }




  sortDir = {};
  sortField: number;
  sortFieldName: string;
  sortByField(id,name, field: string, dir: boolean) {
    this.sortField = id;
    this.sortFieldName = name;
    this.getEntryList(this.pageNumber, field + '~' + (dir ? 'asc' : 'desc'));
  }

  groupFieldName:string;
  groupFieldCode:string;
  groupFieldId:number;
  groupFilter:string;
  groupByField(id,name, field: string) {
    this.groupFieldId = id;
    this.groupFieldCode = field;
    this.groupFieldName = name;
    this.groupedEntryList = this.groupByPipe.transform(this.entryList, this.getPathForGrouping(this.groupFieldCode));
    this.groupFilter = null;
  }
  
  // groupByField2(id,root: string, code: string) {
  //   this.groupFieldId = id;
  //   this.groupFieldCode = root+'.'+code;
  //   this.groupFieldName = this.form[root].items[code].label;
  //   this.groupedEntryList = this.groupByPipe.transform(this.entryList, this.groupFieldCode);
  //   this.groupFilter = null;
  // }

  getPathForGrouping (rootDotCode){
    let fieldPath = rootDotCode;
    if (rootDotCode=='currentStatus') return rootDotCode;
    if (rootDotCode=='submissionDate') return rootDotCode+='|date:'+('yyyy-MM-dd');
    if(rootDotCode){
      let split = rootDotCode.split(".");
      let field = this.form[split[0]].items[split[1]];
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

  nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
  br2nl = br2nl;// (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

  selectedEntries = new Map<number, any>();

  checkAllEntry(checked) {
    if (checked) {
      this.entryList
        .forEach(e => this.selectedEntries.set(e.id, e));
    } else {
      this.entryList
        .forEach(e => this.selectedEntries.delete(e.id));
    }
  }

  toggleSelect(i) {
    if (this.selectedEntries.has(i.id)) {
      this.selectedEntries.delete(i.id);
    } else {
      this.selectedEntries.set(i.id, i);
    }
  }

  checkAllInput:boolean;
  bulkRemoveEntries() {
    if (confirm("Remove all " + this.selectedEntries.size + " entries?")) {
      this.entryService.bulkDelete(Array.from(this.selectedEntries.keys()), this.user.email)
        .subscribe({
          next: res => {
            this.selectedEntries.clear();
            this.checkAllInput = false;
            this.pageNumber = (this.numberOfElements == 1 && this.pageNumber==this.entryPages) ? this.pageNumber - 1 : this.pageNumber;
            // this.pageNumber = (this.numberOfElements == 1 && !this.first) ? this.pageNumber - 1 : this.pageNumber;
            this.getEntryList(this.pageNumber);
            this.toastService.show("Entries removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show("Entries removal failed", { classname: 'bg-danger text-light' });
            this.selectedEntries.clear();
            this.checkAllInput = false;
          }
        });
    }
  }

  checkSelect(i) {
    return this.selectedEntries.has(i.id);
  }

  bulkEmail(content, data) {
    this.blastData = data;
    this.blastData.bulk = true;

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.blastList(res, Array.from(this.selectedEntries.keys()));
      }, res => { });
  }

  resyncDataset(dsId){
    if (confirm("Are you sure you want to resynchronize data using this dataset?")){
        this.runService.resyncDataset(this.dataset?.id)
        .subscribe(res=>{
            this.toastService.show("Dataset successfully resynchronized", { classname: 'bg-success text-light' });
        })            
    }
}

  bulkEvalRun(f) {
    this.selectedEntries.forEach(e => {
      this._evalRun(e, f, true);
    })
  }

  bulkCancelEntry() {
    if (confirm("Cancel selected entry submission?")) {
      var list: any[] = [];
      this.selectedEntries.forEach(e => {
        if (e.currentStatus != 'drafted') {
          list.push(this.entryService.cancel(e.id, this.user.email));
        }
        // this.entryService.cancel(e.id, this.user.email)
        //   .subscribe(res => {
        //     // deepMerge(e,res);
        //   })
      });
      combineLatest(list)
        .subscribe(res => {
          this.toastService.show(`${res.length} entries successfully retracted`, { classname: 'bg-success text-light' });
          this.getEntryList(this.pageNumber);
        })
    }
  }


  getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  _eval = (data, entry, v) => this._evalRun(entry, v, false);// new Function('$_', '$', '$prev$', `return ${v}`)(entry, data, entry && entry.prev);

  _evalRun = (entry, f, bulk) => new Function('$app$','$_', '$', '$prev$', '$user$','$conf$', '$http$', '$post$', '$endpoint$', '$submit$', '$el$', '$form$', '$this$','$loadjs$', '$digest$', '$param$', '$log$', '$toast$', '$update$', '$updateLookup$', '$base$','$baseUrl$','$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$live$', '$token$', '$merge$', '$web$', '$bulk$',
    `return ${f}`)(this.runService.$app(),entry, entry?.data, entry && entry?.prev, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.submit, this.form && this.form.items, this.form, this.$this$, this.loadScript, this.$digest$, this._param, this.log, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, bulk);
  _pre = (entry, f, bulk) => !f || new Function('$app$','$_', '$', '$prev$', '$user$','$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$','$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
    `return ${f}`)(this.runService.$app(),entry, entry?.data, entry && entry?.prev, this.user, this.runService?.appConfig, this.$this$, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);

  preCheck(entry,f,bulk) {
    let res = undefined;
    try {
      res = this._pre(entry,f,bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !f || res;
  }

  $digest$ = () => {
    this.cdr.detectChanges()
  }

  liveSubscription:any[]=[];

  loadScript = loadScript;
  
  log = (log) => this.logService.log(JSON.stringify(log));

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  /** Need to study either to implement deepMerge when updated entry: refer view-component */
  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.dataset?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.form.appId, params, callback, error)

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.dataset.appId, params, callback, error))


  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.dataset?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  submit = (entry, resubmit: boolean) => {
    this.entryService.submit(entry.id, this.user.email, resubmit)
      .subscribe({
        next: res => {
          if (this.form.onSubmit) {
            try {
              this._evalRun(entry.data, this.form['data'].onSubmit, false);
            } catch (e) { this.logService.log(`{form-${this.form.title}-onSubmit}-${e}`) }
          }
          deepMerge(entry, res);
          this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
        }
      })
  }

}
