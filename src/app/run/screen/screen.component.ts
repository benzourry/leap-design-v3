import { ChangeDetectorRef, Component, Inject, OnChanges, OnDestroy, OnInit, SimpleChanges, TemplateRef, ViewChild, effect, forwardRef, input, model, output, viewChild } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
// import { EntryService } from '../../service/entry.service';
import { ActivatedRoute, NavigationExtras, Router, RouterLink } from '@angular/router';
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
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { DatePipe, formatDate, JsonPipe, NgClass } from '@angular/common';
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
// import mermaid from "mermaid";

// mermaid.initialize({startOnLoad:false})


@Component({
    selector: 'app-screen',
    templateUrl: './screen.component.html',
    styleUrls: ['./screen.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
    imports: [PageTitleComponent, FormsModule, FaIconComponent, NgClass, UserEntryFilterComponent, ScanComponent,
        ChatbotComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FullCalendarModule, RouterLink,
        forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent),
        NgSelectModule, SafePipe, NgbDropdown, NgbDropdownToggle, JsonPipe,
        NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, BucketComponent, NgLeafletComponent, MailboxComponent, CombinedComponent]
})
export class ScreenComponent implements OnInit, OnDestroy, OnChanges {

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
  entryId = input<number>();
  _entryId:number; // use private variable to store entryId
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

    effect(()=>{
      this._entryId = this.entryId();
    })

    // effect(()=>{
    //   this.app = this.runService.$app();

    //   // if (this.app) {
    //   //   this.preurl = `/run/${this.app.id}`;
    //   // }
    //   this.baseUrl = this.runService.$baseUrl();//(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;

    // })
  }

  private _filter = new BehaviorSubject<any>({});
  
  // Untuk ngecek changes dari @Input
  ngOnChanges(changes: SimpleChanges): void {
    if (JSON.stringify(changes.filters?.previousValue) != JSON.stringify(changes.filters?.currentValue)) {
      // console.log("changes",changes.filters?.currentValue)
      this._filter.next(changes.filters?.currentValue)
    }
  }


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

      this._entryId = this.entryId();

      // at the top to ensure entryId is populated when loading entry
      if (this.screenId()){
        this.$param$ = this.param();
        if (this.param()?.entryId){
          this._entryId = this.param()?.entryId;
        }        
        this.entryParams = this.param();
        this.getScreen(this.screenId());
      }else{
        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams),
          // debounceTime(0)
          distinctUntilChanged()
        ).subscribe(([url, params, queryParams]) => {
          // NYA RUN 2x kali tok if REFRESH
          // console.log("with latest", params, queryParams)
          this._entryId = queryParams['entryId'];
          const screenId = params['screenId'];
          this.$param$ = queryParams;
          // this.$param$.update(p=>({...p,...queryParams}));
          // console.log("_entryId b4",this._entryId)
          if (this._entryId) {
            // this._entryId = id;
            this.entryParams = null;
          } else {
            this.entryParams = queryParams;
            // this._entryId = null;
          }
          // console.log("_entryId after",this._entryId)
          if (screenId) {
            this.getScreen(screenId);
          }
        });

      }
    });
  }

  
  // filters && $param$ berbeza
  // startListenFilter() {
  //   this._filter.pipe(
  //     debounceTime(500),
  //     distinctUntilChanged()
  //   ).subscribe(f => {
  //     // console.log("f1",f)
  //     // console.log("f2",this.filters)
  //     console.log("jjyyyy")

  //     if (JSON.stringify(f)!=JSON.stringify(this.filters())){

  //       this.filters.set(f);
  //       // if ada prevId, pass as prev-entryId dlm add button. add button perlu da return.
  //       if (f['$prev$.$id']) {
  //         this.prevId = f['$prev$.$id'];
  //       }

  //       console.log("jjjjj")

  //       if (this.screen.type=='calendar'){
  //         this.populateCalendarEvent();
  //         console.log("###########")
  //       }else{
  //         this.loadDatasetEntry(this.dataset,this.pageNumber, this.sort);
  //       }        
  //     }
  //   })
  // }

  startListenFilter() {
    this._filter.pipe(
      debounceTime(10),
      distinctUntilChanged()
    ).subscribe(f => {
      this.filters.set(f);
      // if ada prevId, pass as prev-entryId dlm add button. add button perlu da return.
      if (f['$prev$.$id']) {
        this.prevId = f['$prev$.$id'];
      }

      if (this.screen.type=='calendar'){
        this.populateCalendarEvent();
        // console.log("###########")
      }else{
        this.loadDatasetEntry(this.dataset,this.pageNumber, this.sort);
      } 

      // if (this.dataset && this.user){
      //   this.getEntryList(this.pageNumber, this.sort);
      // }      
    })
  }

  // @ViewChild('fullCalendar') calendarComponent: FullCalendarComponent; 

  populateCalendarEvent(){
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
          filter['$.' + this.screen.data.end + '~between'] = info.start.valueOf() + ',' + info.end.valueOf();
        }
        filter = deepMerge(filter, this.param())
        param['filters'] = JSON.stringify(filter);
        param['@cond'] = "OR";
        param['searchText'] = this.searchText;

        // console.log(param)

        var ac = this.screen.actions[0];

        this.entryService.getListByDataset(ds.id, param)
          .subscribe(res => {
            this.entryList = res.content;
            // console.log(this.entryList)
            var events = this.entryList.filter(e => e.data[this.screen.data.start])
              .map(e => {
                // var acLink = ac ? this.buildGo(e.id)[ac.id] : `#${this.preurl}/form/${ds.form.id}/view?entryId=${e.id}`;
                var eventObj:any = {
                  title: this.screen.data?.titleTpl? 
                          this.compileTpl(this.screen?.data?.titleTpl, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})
                          :formatDate(e.data[this.screen.data.start],'hmma','en-US')+" "+e.data[this.screen.data.title],
                  start: e.data[this.screen.data.start],
                  end: e.data[this.screen.data.end] ? e.data[this.screen.data.end] : e.data[this.screen.data.start],
                  id: e.id,
                  // display:'block', // default will be dot, block is rectangle color
                  backgroundColor: this.randomHsl()
                };
                if (!this.screen.data?.titleTpl){
                  eventObj.display='block'
                }
                return eventObj;
              });

              // this.calendarComponent.getApi().render();
            success(events);

            this.loading = false;
          })
      }).bind(this),
      // this is flexible, but it will remove make default event styling (like rectangle color background)
      // eventContent: function( info ) {
      //   return {html: info.event.title};
      // },    
      eventClick: this.eventClick.bind(this)
    }

    this.loading = false;
  }


  options: any = {}
  // userUnauthorized: boolean;
  getScreen(screenId: any) {
    this.loading = true;
    // this.userUnauthorized = false;

    this.runService.getScreen(screenId)
      .subscribe(res => {
        this.screen = res;
        this.dataset = {};
        this.loading = false;
        
        // RIGHT NOW, ALL SCREEN GO THROUGH THIS.
        // let intercept = this.screen.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
        // if (this.screen.accessList?.length > 0 && intercept.length == 0) {
        //   // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        //   this.userUnauthorized = true;
        // }

        // ...CHANGE TO CHECKING INSIDE IF TYPE CONDITION
        // UPDATE. NO, DONT CONFUSE SCREEN ACCESS VS FORM ACCESS. SCREEN HAS IT'S OWN ACCESS SETTING
        this.isAuthorized = this.checkAuthorized(this.screen, this.user, null);

        this.goObj = this.buildGo(this._entryId, true);
        this.goObjWParam = this.buildGo(this._entryId);
        this.popObj = this.buildPop(this._entryId, true);

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

          // if (this.screen.type == 'calendar') {
          //   let datePipe = Inject(DatePipe);
          //   this.calOptions = {
          //     initialView: this.screen?.data?.defaultView,
          //     weekends: true,
          //     headerToolbar: {
          //       start: 'prev,next',
          //       center: 'title',
          //       end: 'today'
          //     },
          //     buttonText: {
          //       today: 'Today',
          //       month: 'Month',
          //       week: 'Week',
          //       day: 'Day',
          //       list: 'list'
          //     },
          //     height: 640,
          //     plugins: [dayGridPlugin, timeGridPlugin],
          //     events: (function (info, success, failure) {
          //       var ds = this.screen.dataset;
          //       var param = { email: this.user.email, size: 999 };
          //       var filter = {};
          //       if (this.screen.data.start) {
          //         filter['$.' + this.screen.data.start + '~between'] = info.start.valueOf() + ',' + info.end.valueOf();
          //       }
          //       if (this.screen.data.end) {
          //         filter['$.' + this.screen.data.end + '~between'] = info.end.valueOf() + ',' + info.end.valueOf();
          //       }
          //       param['filters'] = JSON.stringify(filter);
          //       param['@cond'] = "OR";
  
          //       var ac = this.screen.actions[0];
  
          //       this.entryService.getListByDataset(ds.id, param)
          //         .subscribe(res => {
          //           this.entryList = res.content;
          //           // console.log(this.entryList)
          //           var events = this.entryList.filter(e => e.data[this.screen.data.start])
          //             .map(e => {
          //               // var acLink = ac ? this.buildGo(e.id)[ac.id] : `#${this.preurl}/form/${ds.form.id}/view?entryId=${e.id}`;
          //               var eventObj:any = {
          //                 title: this.screen.data?.titleTpl? 
          //                         this.compileTpl(this.screen?.data?.titleTpl, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})
          //                         :formatDate(e.data[this.screen.data.start],'hmma','en-US')+" "+e.data[this.screen.data.title],
          //                 start: e.data[this.screen.data.start],
          //                 end: e.data[this.screen.data.end] ? e.data[this.screen.data.end] : e.data[this.screen.data.start],
          //                 id: e.id,
          //                 // display:'block', // default will be dot, block is rectangle color
          //                 backgroundColor: this.randomHsl()
          //               };
          //               if (!this.screen.data?.titleTpl){
          //                 eventObj.display='block'
          //               }
          //               return eventObj;
          //             });
  
          //             console.log(events);
  
          //           success(events);
  
          //           this.loading = false;
          //         })
          //     }).bind(this),
          //     // this is flexible, but it will remove make default event styling (like rectangle color background)
          //     // eventContent: function( info ) {
          //     //   return {html: info.event.title};
          //     // },    
          //     eventClick: this.eventClick.bind(this)
          //   }
          // }

        }else if (this.screen.type == 'calendar') {

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
          this.startListenFilter();

          // console.log("##form", this.form)

          let datePipe = Inject(DatePipe);

          this.populateCalendarEvent();
          
        }else if (this.screen.type == 'page') {
          this.form = {
            data: this.screen.form,
            prev: this.screen.form.prev
          }
          this.loadFormEntry(this.screen.form.id);
        }else if (this.screen.type == 'static') {
          this.entry = {id: this._entryId, data: {} }
          // this execute tooo early. html not yet available. problem when get dom reference
          
          // let f = this.compileTpl(this.screen.data.f, {$:{},$prev$:{},$_:{},$go:this.buildGo(null),$popup:this.buildPop(null),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})

          this.initScreen(this.screen.data.f);
                  
        }else if (this.screen.type == 'chatbot'){
        }

        // setTimeout(()=>{
        //   mermaid.run({querySelector:'.mermaid'})
        // }) 
        this.cdr.detectChanges();
      })
  }

  initScreen(js) {
    // console.log("------",k)
    
    let res = undefined;
    setTimeout(()=>{
      try {
        res = this._eval(this.entry, js);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
      } catch (e) { this.logService.log(`{screen-${this.screen.title}-initScreen}-${e}`) }
    },0);  
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
  _eval = (data, v) => new Function('setTimeout', 'setInterval', '$app$','$screen$','$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$upload$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$el$', '$form$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$popup','$q$','$showNav$',
  `return ${v}`)(this._setTimeout, this._setInterval, this.app, this.screen, this.entry, this.entry && this.entry.data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.form?.items, this.form,  this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);

  _qrEval = (code, v) => new Function('setTimeout', 'setInterval', '$app$','$code$','$screen$','$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$el$', '$form$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$popup','$q$','$showNav$',
  `return ${v}`)(this._setTimeout, this._setInterval, this.app, code, this.screen, this.entry, this.entry && this.entry.data, this.entry && this.entry.prev, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.form?.items, this.form,  this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.screen.appId, params, callback, error)

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.screen.appId, params, callback, error))

  uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app?.id, obj.file.name)
    .pipe( tap({ next: callback, error: error }), first() ));


  $digest$ = () => {
    this.cdr.detectChanges()
  }


  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.app?.id)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.app?.id)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
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

  ///// Actions
  // navigate
  // Edit, Form
  goObj: any = {};
  goObjWParam: any = {};
  popObj: any = {};
  popObjWParam: any = {};

  // Perlu called directly dlm template supaya dpt replace per entry
  // mn include ?entryId= tkt da problem utk yg xperlu entryId cth yg just pass param
  // mn x include, banyak yg sediaada problem
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
        // utk static page spatutnya prev no param;
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/prev${noParam ? '' : '?entryId=' + (entryId || '')}`
        // console.log(obj[ac.id]);
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

  buildPop(eId, noHash?, noParam?){
    var pop: any = {}
    this.screen.actions.forEach(ac => {
      if (ac.nextType == 'form') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','add',{})
      }
      if (ac.nextType == 'view') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'view','view',noParam?{}:{entryId: entryId??eId})
      }
      if (ac.nextType == 'view-single') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'view','view-single',{})
      }
      if (ac.nextType == 'edit') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','edit',noParam?{}:{entryId: entryId??eId})
      }
      if (ac.nextType == 'edit-single') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','edit-single',{})
      }
      if (ac.nextType == 'prev') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'form','prev',noParam?{}:{entryId: entryId??eId})
      }
      if (ac.nextType == 'static') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'screen',null,{})
      }
      if (ac.nextType == 'screen') {
        pop[ac.id] = (entryId?)=> this.inPop(this.inPopTpl(),entryId,ac,'screen',null,noParam?{}:{entryId: entryId??eId})
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

  //// store param ->

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

    params = action.params?this._pre(this.entry,action.params, false):{};

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
    if (this._entryId) {
      // console.log("with entryId", this.entryId())
      this.loading = true;
      this.entryService.getEntry(this._entryId, fId)
        .subscribe(res => {
          this.entry = res;
          // this.entry = res.data;
          // this.entry.$id = res.id;
          // this.entry.$prev = res.prev;
          this.loading = false;
          this.initScreen(this.screen.data.f);

          // RE-CHECK AUTHORIZATION BILA DH ADA ENTRY DATA
          this.isAuthorized = this.checkAuthorized(this.screen, this.user, this.entry);
        })
    } else {
      // console.log("with param", this.entryParams)
      this.loading = true;
      this.entryService.getFirstEntryByParam(this.entryParams, fId)
        .subscribe(res => {
          this._entryId = res.id;
          this.entry = res;
          // this.entry = res.data;
          // this.entry.$id = res.id;
          // this.entry.$prev = res.prev;
          this.loading = false;
          this.initScreen(this.screen.data.f);

          // RE-CHECK AUTHORIZATION BILA DH ADA ENTRY DATA
          this.isAuthorized = this.checkAuthorized(this.screen, this.user, this.entry);
        })
    }
  }

  unAuthorizedMsg:string = "";
  isAuthorized:boolean = false;
  // userUnauthorized by default is false
  checkAuthorized = (screen, user, entry)=>{
    if (screen.data?.restrictAccess){
      let groupAuthorized = false;
      let approverAuthorized = false;
      let userAuthorized = false;
      let condAuthorized = false;

      let intercept = screen.accessList?.filter(v => Object.keys(user.groups).includes(v + ""));
      if (intercept.length > 0) {
        // this.form.accessList?.length == 0 || 
        // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        groupAuthorized = true;
      }else{
        this.unAuthorizedMsg = this.app?.x?.lang=='ms'?"Anda tidak mempunyai akses kepada skrin ini":"You are not authorized to access this screen";
      }
      if (entry?.id){
        if (screen.data?.accessByApprover){
          let authorizer = Object.values(entry.approver).join(",")
          approverAuthorized = authorizer.includes(user.email)
        }
        if (screen.data?.accessByUser){
          userAuthorized = entry.email==user.email
        }
        if (screen.data?.accessByCond){
          condAuthorized = this.preCheck(screen.data?.accessByCond, entry, false);
        }        
        if (!(approverAuthorized||userAuthorized||condAuthorized)){
          this.unAuthorizedMsg = this.app?.x?.lang=='ms'?"Anda tidak mempunyai akses kepada maklumat ini":"You are not authorized to access this information";
        }
      }
      console.log("user", userAuthorized,"approver", approverAuthorized,"group", groupAuthorized,"cond",condAuthorized)
      return groupAuthorized||approverAuthorized||userAuthorized||condAuthorized;
    }else{
      return true;
    }
  }

  sortDir = {};
  sortField: number;
  sortFieldName: string;
  sortByField(id,name, field: string, dir: boolean) {
    this.sortField = id;
    this.sortFieldName = name;
    this.loadDatasetEntry(this.dataset, this.pageNumber, field + '~' + (dir ? 'asc' : 'desc'));
  }

  onSavedInit(){
    this.loadDatasetEntry(this.dataset, this.pageNumber, this.sort);
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
    if (this.screen.type=='calendar'){
      this.populateCalendarEvent();
    }else{
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
  
          try{
            this.changed.emit(res); 
          }catch(e){}
          // console.log("loaded list") 
          if (this.screen.type=='map'){
            this.processForMap();
          }
        },
        error:err=>{
          this.loading = false;
        }
      })
    }
    
  }

  timestamp:number=0;
  mapList:any[];
  processForMap(){
    this.mapList = this.entryList
    .filter(e=>e.data?.coord || (e.data?.[this.screen.data?.lat]&&e.data?.[this.screen.data?.lng]))
    .map(e=>{
      let longitude, latitude;
      if (!this.screen?.data?.coord){
        latitude = e.data[this.screen?.data?.lat];
        longitude = e.data[this.screen?.data?.lng];
      }else{
        latitude = e.data[this.screen?.data?.coord]?.latitude;
        longitude = e.data[this.screen?.data?.coord]?.longitude;
      }
      return {
        id: e.id,
        latitude: latitude,
        longitude: longitude,
        // title: e.data[this.screen.data.title],
        title: this.compileTpl(this.screen?.data?.popupTpl, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi}),
        marker: this.compileTpl(this.screen?.data?.icon, {$:e.data,$prev$:e.prev,$_:e,$go:this.buildGo(e.id),$popup:this.buildPop(e.id),$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base,$baseUrl$:this.baseUrl,$baseApi$:baseApi})
      }
    })
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
    this._entryId = entryId;
    this.loadFormEntry(this.screen.form.id);
    this.router.navigate([this.preurl, 'screen', this.screen.id], { queryParams: { entryId: entryId } });
  }

  // qrPause:boolean = false;
  @ViewChild('scanner') scanner: ScanComponent;
  showActions: boolean = false;
  actionLinks: any[] = [];
  qrValueChange(code, screen) {

    if (code) {
      // console.log(code);
      // alert(JSON.stringify(this.screen));
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
      this.logService.log(`{screen-${this.screen?.title}-compiletpl}-${e}`)
    }
    return f;
  }

  _pre = (entry, code, bulk) => !code || new Function('$app$','$screen$','$_', '$', '$prev$', '$maps$', '$user$','$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$','$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
  `return ${code}`)(this.app, this.screen, entry, entry?.data, entry && entry?.prev, this.mapList, this.user, this.runService?.appConfig, this.$this$, this.$param$, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);

  preCheck(entry,code,bulk) {
    let res = undefined;
    try {
      res = this._pre(entry,code,bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !code || res;
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
    this.intervalList.forEach(i=> clearInterval(i));
    this.timeoutList.forEach(i=> clearTimeout(i));
  }

}
