import { ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild, computed, effect, forwardRef, input, model, output, viewChild } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbInputDatepicker, NgbTimepicker, NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
// import { EntryService } from '../../service/entry.service';
import { ActivatedRoute, Router, Params, RouterLink } from '@angular/router';
// import { LookupService } from '../../service/lookup.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { UtilityService } from '../../_shared/service/utility.service';
import { compileTpl, deepMerge, splitAsList, loadScript, btoaUTF, hashObject, ServerDate, linkify } from '../../_shared/utils';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
// import { RunService } from '../../service/run.service';
import { base, baseApi } from '../../_shared/constant.service';
import { LogService } from '../../_shared/service/log.service';
import { debounceTime, distinctUntilChanged, first, map, share, tap, withLatestFrom } from 'rxjs/operators';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';
import { ScanComponent } from './scan/scan.component';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
import { FullCalendarModule } from '@fullcalendar/angular';
import { DatePipe, JsonPipe, NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
import { FormComponent } from '../form/form.component';
import { ViewComponent } from '../view/view.component';
import { BucketComponent } from './bucket/bucket.component';
// import { NgLeafletComponent } from '../../_shared/component/ng-leaflet/ng-leaflet.component';
import { MailboxComponent } from './mailbox/mailbox.component';
import { CombinedComponent } from './combined/combined.component';
import { NgLeafletComponent } from '../_component/ng-leaflet/ng-leaflet.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';

@Component({
    selector: 'app-screen',
    templateUrl: './screen.component.html',
    styleUrls: ['./screen.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
    standalone: true,
    imports: [PageTitleComponent, FormsModule, FaIconComponent, NgClass, UserEntryFilterComponent, DatePipe, ScanComponent, 
      ChatbotComponent, NgbPagination, NgbPaginationFirst,NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FullCalendarModule, RouterLink, NgbInputDatepicker,
      forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent), 
       NgbTimepicker, NgSelectModule, SafePipe, NgbDropdown, NgbDropdownToggle, 
       NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, BucketComponent, NgLeafletComponent, MailboxComponent, CombinedComponent, JsonPipe]
})
export class ScreenComponent implements OnInit, OnDestroy {

  offline: boolean = false;
  user: any;
  // appId: any;
  app: any;
  preurl: string = '';
  screen: any;
  entryListLoading: boolean = false;
  // @Input() filters: any = {};
  filters = model<any>({});
  // statuses:any = {};
  filtersEncoded: string;
  form: any = {};
  lookupIds: any;
  lookupKey = {};
  lookup = {};
  base: string = base;
  baseApi: string = baseApi;
  baseUrl: string = '';
  filtersData: any = {};
  dataset: any = {};
  cogna: any = {};
  // @Input() screenId: number;
  screenId = input<number>();
  // @Input() entryId: number;
  entryId = model<number>();
  // @Input() asComp: boolean;
  asComp = input<boolean>();
  hideTitle = input<boolean>(false);
  // @Input() action: string;
  action = input<string>();
  param = input<any>();
  // @Output() closed = new EventEmitter();
  closed = output<any>();
  // @Output() changed = new EventEmitter();
  changed = output<any>()
  accessToken: string = "";
  // @ViewChild('inPopTpl', { static: false }) inPopTpl;
  inPopTpl = viewChild<TemplateRef<any>>('inPopTpl')


  constructor(private userService: UserService, private modalService: NgbModal,
    private entryService: EntryService, private route: ActivatedRoute, private lookupService: LookupService,
    private http: HttpClient, private toastService: ToastService, private logService: LogService,
    private cdr: ChangeDetectorRef,
    private pageTitleService: PageTitleService,
    public runService: RunService, private router: Router, private utilityService: UtilityService) {

    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

    // effect(()=>{
    //   this.app = this.runService.$app();

    //   // if (this.app) {
    //   //   this.preurl = `/run/${this.app.id}`;
    //   // }
    //   this.baseUrl = this.runService.$baseUrl();//(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;

    // })
  }

  private _filter = new BehaviorSubject<any>({});

  $param$: any = {}
  liveSubscription: any[] = [];
  
  ngOnInit() {
    this.app = this.runService.$app();
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    
    // this.app = this.runService.app;
    this.accessToken = this.userService.getToken();
    this.userService.getUser().subscribe((user) => {
      this.user = user;

      console.log("ada screenId")
      // at the top to ensure entryId is populated when loading entry
      if (this.screenId()){
        console.log("dari param", this.param())
        this.$param$ = this.param();
        this.getScreen(this.screenId());
      }else{
        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams)
        ).subscribe(([url, params, queryParams]) => {
          const id = queryParams['entryId'];
          const screenId = params['screenId'];
          this.$param$ = queryParams;
          // this.$param$.update(p=>({...p,...queryParams}));
          if (id) {
            // this.entryId = id;
            this.entryId.set(id);
            this.entryParams = null;
          } else {
            this.entryParams = queryParams;
            // this.entryId=null;
            this.entryId.set(null);
          }
          if (screenId) {
            this.getScreen(screenId);
          }
        });
      }
    });
  }

  
  // filters && $param$ berbeza
  startListenFilter() {
    this._filter.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(f => {
      if (JSON.stringify(f)!=JSON.stringify(this.filters())){
        this.filters.set(f);
        // if ada prevId, pass as prev-entryId dlm add button. add button perlu da return.
        if (f['$prev$.$id']) {
          this.prevId = f['$prev$.$id'];
        }
        this.loadDatasetEntry(this.dataset,this.pageNumber, this.sort);
      }
    })
  }


  options: any = {}
  userUnauthorized: boolean;
  getScreen(screenId: any) {
    this.loading = true;
    this.userUnauthorized = false;

    this.runService.getScreen(screenId)
      .subscribe(res => {
        this.screen = res;
        this.dataset = {};
        this.loading = false;
        // if run via designer, no restriction, hence checking this.appId
        // if (this.dataset.access && !this.user.groups[this.dataset.access?.id] && !this.appId) {
        //   this.userUnauthorized = true;
        // }
        let intercept = this.screen.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
        if (this.screen.accessList?.length > 0 && intercept.length == 0) {
          // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
          this.userUnauthorized = true;
        }

        this.goObj = this.buildGo(this.entryId(), true);
        this.popObj = this.buildPop(this.entryId(), true);

        if (['list','map'].indexOf(this.screen.type)>-1) {
          this.dataset = this.screen.dataset;
          this.form = {
            data: this.dataset.form,
            prev: this.dataset.form.prev
          }

          // this.getLookupIdList(this.form.data.id);
          if (this.form.prev) {
            // this.getLookupIdList(this.form['prev'].id)
          } else {
            this.form['prev'] = null;
          }
          this.getLookupInFilter();

          // loadDatasetEntry + strtListenFilter cause double loading and flicker
          this.loadDatasetEntry(this.dataset, this.pageNumber);
          this.startListenFilter();

        }
        if (this.screen.type == 'calendar') {
          this.calOptions = {
            initialView: this.screen?.data?.defaultView,
            weekends: true,
            headerToolbar: {
              start: 'prev,next',
              center: 'title',
              end: 'today'
            },
            buttonText: {
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              list: 'list'
            },
            height: 640,
            plugins: [dayGridPlugin, timeGridPlugin],
            events: (function (info, success, failure) {
              var ds = this.screen.dataset;
              var param = { email: this.user.email, size: 999 };
              var filter = {};
              if (this.screen.data.start) {
                filter['$.' + this.screen.data.start + '~between'] = info.start.valueOf() + ',' + info.end.valueOf();
              }
              if (this.screen.data.end) {
                filter['$.' + this.screen.data.end + '~between'] = info.end.valueOf() + ',' + info.end.valueOf();
              }
              param['filters'] = JSON.stringify(filter);
              param['@cond'] = "OR";

              var ac = this.screen.actions[0];

              this.entryService.getListByDataset(ds.id, param)
                .subscribe(res => {
                  this.entryList = res.content;
                  // console.log(this.entryList)
                  var events = this.entryList.filter(e => e.data[this.screen.data.start])
                    .map(e => {
                      // var acLink = ac ? this.buildGo(e.id)[ac.id] : `#${this.preurl}/form/${ds.form.id}/view?entryId=${e.id}`;
                      return {
                        title: this.screen.data?.titleTpl? 
                                this.compileTpl(this.screen?.data?.titleTpl, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})
                                :e.data[this.screen.data.title],
                        start: e.data[this.screen.data.start],
                        end: e.data[this.screen.data.end] ? e.data[this.screen.data.end] : e.data[this.screen.data.start],
                        id: e.id,
                        color: this.randomHsl()
                      };
                    });
                  success(events);

                  this.loading = false;
                })
            }).bind(this),
            eventContent: function( info ) {
              return {html: info.event.title};
            },    
            eventClick: this.eventClick.bind(this)
          }
        }
        if (this.screen.type == 'page') {
          this.form = {
            data: this.screen.form,
            prev: this.screen.form.prev
          }
          // this.form = this.screen.form;
          this.loadFormEntry(this.screen.form.id);
        }
        if (this.screen.type == 'static') {
          this.entry = { data: {} }
          var f = this.screen.data.f;// this.compileTpl(this.screen.data.f, {$:{},$prev$:{},$_:{},$go:this.buildGo(null),$popup:this.buildPop(null),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})
          console.log(f);
          this.initScreen(f);
        }
        if (this.screen.type == 'chatbot'){
        }
        this.cdr.detectChanges();
      })
  }

  initScreen(js) {
    let res = undefined;
    try {
      res = this._eval(this.entry, js);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{screen-${this.screen.title}-initScreen}-${e}`) }
    return res;
  }

  loadScript = loadScript;

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  log = (log) => this.logService.log(JSON.stringify(log));

  elMap:any = {}
  $q = (el)=>{
    if (!this.elMap[el]){
      this.elMap[el] = document.querySelector(el);
    }
    return this.elMap[el];
  }

  openNav = (opened: boolean)=>{
    this.pageTitleService.open(opened);
  }

  $this$ = {}
  _eval = (data, v) => new Function('$app$','$screen$','$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$popup','$q$','$showNav$',
  `return ${v}`)(this.app, this.screen, this.entry, this.entry && this.entry.data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);

  _qrEval = (code, v) => new Function('$app$','$code$','$screen$','$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$popup','$q$','$showNav$',
  `return ${v}`)(this.app, code, this.screen, this.entry, this.entry && this.entry.data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.screen.appId, params, callback, error)

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.screen.appId, params, callback, error))


  $digest$ = () => {
    this.cdr.detectChanges()
  }


  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.screen?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.screen?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  ///// Actions
  // navigate
  // Edit, Form
  goObj: any = {};
  popObj: any = {};

  // Perlu called directly dlm template supaya dpt replace per entry
  buildGo(entryId, noParam?) {
    let obj: any = {}
    let hash = "#"; 
    this.screen.actions.forEach(ac => {
      if (ac.nextType == 'form') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/add`;
      }
      if (ac.nextType == 'view') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/view${noParam ? '' : '?entryId=' + (entryId || '')}`
      }
      if (ac.nextType == 'view-single') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/view-single`
      }
      if (ac.nextType == 'edit') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/edit${noParam ? '' : '?entryId=' + (entryId || '')}`
      }
      if (ac.nextType == 'edit-single') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/edit-single`
      }
      if (ac.nextType == 'prev') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/prev${noParam ? '' : '?entryId=' + (entryId || '')}`
      }
      if (ac.nextType == 'static') {
        obj[ac.id] = `${hash}${this.preurl}/screen/${ac.next}`
      }
      if (ac.nextType == 'screen') {
        obj[ac.id] = `${hash}${this.preurl}/screen/${ac.next}${noParam ? '' : '?entryId=' + (entryId || '')}`
      }
      if (ac.nextType == 'dataset') {
        obj[ac.id] = `${hash}${this.preurl}/dataset/${ac.next}`
      }
      if (ac.nextType == 'dashboard') {
        obj[ac.id] = `${hash}${this.preurl}/dashboard/${ac.next}`
      }
      if (ac.nextType == 'lookup') {
        obj[ac.id] = `${hash}${this.preurl}/lookup/${ac.next}`
      }
      if (ac.nextType == 'user') {
        obj[ac.id] = `${hash}${this.preurl}/user/${ac.next}`
      }
    });
    return obj;
  }

  buildPop(entryId, noHash?, noParam?){
    var pop: any = {}
    this.screen.actions.forEach(ac => {
      // console.log(ac.id,ac.params)
      // xpat engkah evaljate param sitok, sebab mn evaluate awal, value param yg pake variable xkan undefined sbb blom da value
      if (ac.nextType == 'form') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','add',{})
      }
      if (ac.nextType == 'view') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'view','view',noParam?{}:{entryId: entryId})
      }
      if (ac.nextType == 'view-single') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'view','view-single',{})
      }
      if (ac.nextType == 'edit') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','edit',noParam?{}:{entryId: entryId})
      }
      if (ac.nextType == 'edit-single') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','edit-single',{})
      }
      if (ac.nextType == 'prev') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','prev',noParam?{}:{entryId: entryId})
      }
      if (ac.nextType == 'static') {
        // console.log("param",param)
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'screen',null,{})
      }
      if (ac.nextType == 'screen') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'screen',null,noParam?{}:{entryId: entryId})
      }
      if (ac.nextType == 'dataset') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'dataset',null,{})
      }
      if (ac.nextType == 'dashboard') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'dashboard',null,{})
      }
      if (ac.nextType == 'lookup') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'lookup',null,{})
      }
      if (ac.nextType == 'user') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(),entryId,ac,'user',null,{})
      }
    });
    return pop;// {go:obj,pop:pop};
  }

  inPopEntryId: number;
  inPopType: string;
  inPopFacet: string;
  inPopFormId: string;
  inPopParams: any={};
  // tpl, entryId, formId, 'form','prev'
  inPop(content, entryId, action, type, facet, params) {
    this.inPopEntryId = entryId;
    this.inPopType = type;
    this.inPopFacet = facet;
    this.inPopFormId = action.next;

    params = action.params ? this._pre({id:entryId},action.params,false) : {};
    console.log("===>",params)

    if (params){
      params.entryId = entryId;
      this.inPopParams = params;
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => { 
        // this.getEntryList(this.pageNumber,this.sort);
       }, err => { });

  }
  

  // entry: any = {};
  // entryId: number;
  // loading:boolean = false;
  // loadFormEntry(fId) {
  //   if (this.entryId) {
  //     this.loading = true;
  //     this.entryService.getEntry(this.entryId, fId)
  //       .subscribe(res => {
  //         this.entry = res.data;
  //         this.entry.$id = res.id;
  //         this.entry.$prev = res.prev;
  //         this.loading = false;
  //       })
  //   }
  // }

  entry: any = {};
  entryParams: any;
  loading: boolean = false;
  loadFormEntry(fId) {
    if (this.entryId()) {
      this.loading = true;
      this.entryService.getEntry(this.entryId(), fId)
        .subscribe(res => {
          this.entry = res;
          // this.entry = res.data;
          // this.entry.$id = res.id;
          // this.entry.$prev = res.prev;
          this.loading = false;
          this.initScreen(this.screen.data.f);
        })
    } else {
      this.loading = true;
      this.entryService.getFirstEntryByParam(this.entryParams, fId)
        .subscribe(res => {
          this.entryId.set(res.id);
          this.entry = res;
          // this.entry = res.data;
          // this.entry.$id = res.id;
          // this.entry.$prev = res.prev;
          this.loading = false;
          this.initScreen(this.screen.data.f);
        })
    }
  }
  // replaceActionHtml(html, data){
  //   return html && html.replace("$action$",this.getActionHtml(data));
  // }
  // getAction(data){
  //   var actions = {};

  //   // var html = ""
  //   this.screen.actions.forEach(a => {
  //     actions[a.label]=this.preurl+'/form/'+a.next+'/'+a.nextType+'/'+data.$id;
  //     // html+='<div class="btn btn-round btn-secondary me-1 mb-1" routerLink="'+this.preurl+'/form/'+a.next+'/'+a.nextType+'/'+data.$id+'">'+a.label+'</div>';
  //   });
  //   // console.log(html);
  //   return actions;
  // }
  sortDir = {};
  sortField: number;
  sortFieldName: string;
  sortByField(id,name, field: string, dir: boolean) {
    this.sortField = id;
    this.sortFieldName = name;
    this.loadDatasetEntry(this.dataset, this.pageNumber, field + '~' + (dir ? 'asc' : 'desc'));
  }


  prevId: number;

  searchTextEncoded: string = "";
  entryList: any[] = [];
  entryTotal: number = 0;
  searchText: string = "";
  // filtersEncoded;
  pageSize: number = 25;
  pageNumber = 1;
  // last: boolean; first: boolean; 
  numberOfElements: number;
  sort: string;
  entryPages:number;
  filtersByUserAndStorage:any={};
  // innerHTML:any = ""
  // dataset:any={}
  loadDatasetEntry(ds, pageNumber, sort?) {
    // console.log("loadedEntry")
    this.sort = sort;
    this.loading = true;
    // this.runService.getDataset(dsId)
    // .subscribe(ds => {

    let filtersAll: any = {};
    if (!this.asComp()) {
      // dont read filter from localstorage if asComp 
      var savedFilter = localStorage.getItem("filter-" + ds.id);
      this.filtersData = savedFilter ? JSON.parse(savedFilter) : {};
      filtersAll = Object.assign(filtersAll, this.filters(), this.filtersData, this.$param$);
    } else {
      filtersAll = Object.assign(filtersAll, this.filters(), this.$param$);
    }

    this.filtersByUserAndStorage = {...this.filters(), ...this.filtersData};


    this.entryList = [];

    // var savedFilter = localStorage.getItem("filter-" + ds.id);
    // this.filters = savedFilter ? JSON.parse(savedFilter) : {};
    // Object.assign(this.filters, this.$param$);
    // this.innerHTML = "";
    // this.dataset = ds;
    this.filtersEncoded = encodeURIComponent(JSON.stringify(this.filters()));
    this.searchTextEncoded = encodeURIComponent(this.searchText);

    // this.preCount = this.pageSize * (pageNumber - 1);

    let params = {
      email: this.user.email,
      searchText: this.searchText,
      filters: JSON.stringify(filtersAll),
      page: pageNumber - 1,
      size: this.screen.data.paginate ? this.pageSize : 999999
    }
    if (this.sort) {
      params['sorts'] = this.sort;
    }
    params['@cond'] = this.filtersCond;

    if (ds.presetFilters){
      Object.keys(ds.presetFilters).forEach(k=>{
        params[k] = compileTpl(ds.presetFilters[k]??'', { $user$: this.user, $conf$:this.runService.appConfig, $: {}, $_: {}, $prev$: {}, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this.$param$ })
      })
    }

    // let param:any = {email: this.user.email};
    // params['size']=9999;
    this.entryService.getListByDataset(ds.id, params)
      .subscribe({
        next:res=>{
          this.entryList = res.content;
          this.entryTotal = res.page?.totalElements;
          this.loading = false;
          this.entry = { list: res.content };
          this.$this$['_list'] = res.content;
          
          // this.last = res.last;
          // this.first = res.first;
          this.numberOfElements = res.content?.length;
          this.entryPages = res.page?.totalPages;

          this.initScreen(this.screen.data.f);
          this.changed.emit(res); 
          // console.log("loaded list") 
          if (this.screen.type=='map'){
            this.processForMap();
          }
        },
        error:err=>{
          this.loading = false;
        }
      })
    // })
  }

  timestamp:number=0;
  mapList:any[];
  processForMap(){
    this.mapList = this.entryList
    .filter(e=>e.data?.[this.screen.data?.lat]&&e.data?.[this.screen.data?.lng])
    .map(e=>({
      id: e.id,
      latitude: e.data[this.screen.data.lat],
      longitude: e.data[this.screen.data.lng],
      // title: e.data[this.screen.data.title],
      title: this.compileTpl(this.screen?.data?.popupTpl, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi}),
      marker: this.compileTpl(this.screen?.data?.icon, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi}),
    }))
    // console.log(this.mapList)
    this.timestamp=Date.now();
  }

  calOptions: any;

  eventClick(info) {
    // alert(JSON.stringify(info.event));
    // alert(JSON.stringify(this.screen));
    var event = info.event;
    if (event?.id) {
      var actions = this.screen?.actions;
      if (actions?.length > 0) {
        this.actionLinks = [];
        actions.forEach(action => {
          let url = this.goObj[action.id]?.replace("#","");
          let param = action.params ? JSON.parse(action.params.replace("$code$", event?.id)) : {};
          param.entryId = event?.id;
          this.actionLinks.push({ url: url, param: param, label: action.label });
        })

        if (this.actionLinks.length == 0) {
          this.router.navigate([`${this.preurl}`,'form',this.screen.dataset.form.id,'view'], {queryParams:{entryId: event?.id}})
        }else if (this.actionLinks.length == 1) {
          // if only 1 action, immediately navigate
          this.router.navigate([this.actionLinks[0].url], { queryParams: this.actionLinks[0].param })
        } else {
          // if more than 1, show options
          //  this.showActions = true;
          this.showActionOptions()
        }
      } else {
        this.toastService.show("No action specified for calendar");
      }
    }
  }

  randomHsl = () => `hsla(${Math.random() * 360}, 60%, 40%, 1)`;

  runEntry(entryId) {
    this.entryId.set(entryId);
    this.loadFormEntry(this.screen.form.id);
    this.router.navigate([this.preurl, 'screen', this.screen.id], { queryParams: { entryId: entryId } });
  }

  // qrPause:boolean = false;
  @ViewChild('scanner') scanner: ScanComponent;
  showActions: boolean = false;
  actionLinks: any[] = [];
  qrValueChange(code, screen) {

    if (code) {
      var actions = screen?.actions;
      if (actions?.length > 0) {

        this.actionLinks = [];
        actions.forEach(action => {
          let url = this.goObj[action.id]?.replace("#","");
          let param = action.params ? JSON.parse(action.params.replace("$code$", code)) : {};
          if (action.nextType=='function'){
            this.actionLinks.push({ type:'fn', url: url, f: action.f, label: action.label });            
          }else{
            this.actionLinks.push({ type:'nav', url: url, param: param, label: action.label });            
          }

        })

        if (this.actionLinks.length == 1) {
          // if only 1 action, immediately navigate
          if (this.actionLinks[0].type=='fn'){
            this._qrEval(code, this.actionLinks[0].f);
            this.scanner.resume();
            // this.qrPause=false;
            // console.log("qrpaused:",this.qrPause)
          }else{
            this.router.navigate([this.actionLinks[0].url], { queryParams: this.actionLinks[0].param })
          }
        } else {
          // if more than 1, show options
          //  this.showActions = true;
          this.showActionOptions()

        }

      } else {
        alert("No action found for QR scanner :" + screen.title);
      }
    }
  }

  printReport() {
    window.print();
  }

  trackById(index: number, d: any): string {
    return d.id;
  }


  // filtersData: any={};
  // statusFilterForm:any={}; 
  editFilterItems: any;
  filtersCond: string = "AND";
  editFilter(content, data, isNew) {
    // this.statusFilterForm = this.convertStatusToDisplay(this.statuses, this.form);
    // this.statusFilterForm = this.dataset.statusFilter;
    this.filtersData = data;
    // this.editFilterItems = { section: section }
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        // this.statuses = this.convertDisplayToStatus(this.statusFilterForm);
        // console.log(this.statuses);
        this.filters.set(res);
        localStorage.setItem("filter-" + this.screen.dataset.id, JSON.stringify(this.filters()));
        this.loadDatasetEntry(this.screen.dataset, 1);
      }, res => { });
  }

  @ViewChild('showOptTpl') optTpl;
  @ViewChild('screenviewport') viewport;
  showActionOptions() {
    history.pushState(null, null, window.location.href);
    this.modalService.open(this.optTpl, {
      modalDialogClass: 'modal-dialog-centered modal-no-footer',
      windowClass: '',
      container: '#screen-'+ this.screen.id
    })
      .result.then(res => {
        // this.statuses = this.convertDisplayToStatus(this.statusFilterForm);
        // console.log(this.statuses);
        // this.filters = res;
        // localStorage.setItem("filter-" + this.screen.dataset.id, JSON.stringify(this.filters));
        // this.loadDatasetEntry(this.screen.dataset, 1);
        // this.scanner.ngOnInit();
      }, res => {
        // alert("cancel")
        if (this.screen.type == 'qr') {
          this.scanner.ngOnInit();
        }
      });
  }

  // clearFilter(){
  //   this.filters=Object.create(this.screen.dataset.presetFilters)||{};
  //   this.filtersData=Object.create(this.screen.dataset.presetFilters)||{};
  //   localStorage.removeItem("filter-"+this.screen.dataset.id);
  // }

  checkFilter = () => Object.keys(this.filtersByUserAndStorage).length === 0 && this.filtersByUserAndStorage.constructor === Object
  // checkFilter = computed(()=>Object.keys({...this.filters() }).length === 0 && this.filters().constructor === Object) 

  getAsList = splitAsList;
  // compileTpl = compileTpl;
  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data);
    } catch (e) {
      this.logService.log(`{screen-${this.screen.title}-compiletpl}-${e}`)
    }
    return f;
  }

  _pre = (entry, f, bulk) => !f || new Function('$app$','$screen$','$_', '$', '$prev$', '$maps$', '$user$','$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$','$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
  `return ${f}`)(this.app, this.screen, entry, entry?.data, entry && entry?.prev, this.mapList, this.user, this.runService?.appConfig, this.$this$, this.$param$, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);

  preCheck(entry,f,bulk) {
    let res = undefined;
    try {
      res = this._pre(entry,f,bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !f || res;
  }

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
        // console.log(f.code)
        // console.log(ds);
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
  
  linkify=linkify;

  getIcon=(str)=>str?str.split(":"):['far','question-circle'];

  ngOnDestroy() {
    this.liveSubscription.forEach(sub => sub.unsubscribe());
  }

}
