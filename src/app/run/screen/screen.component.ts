import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, computed, effect, forwardRef, inject, input, output, signal, viewChild } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { NavigationExtras, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { UtilityService } from '../../_shared/service/utility.service';
import { compileTpl, deepMerge, splitAsList, loadScript, btoaUTF, hashObject, ServerDate, linkify, deepEqual, createProxy } from '../../_shared/utils';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { base, baseApi } from '../../_shared/constant.service';
import { LogService } from '../../_shared/service/log.service';
import { first, map, share, tap } from 'rxjs/operators';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
import { Observable, lastValueFrom } from 'rxjs';
import { ScanComponent } from './scan/scan.component';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
import { FullCalendarModule } from '@fullcalendar/angular';
import { formatDate, NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { FormComponent } from '../form/form.component';
import { ViewComponent } from '../view/view.component';
import { BucketComponent } from './bucket/bucket.component';
import { MailboxComponent } from './mailbox/mailbox.component';
import { CombinedComponent } from './combined/combined.component';
import { NgLeafletComponent } from '../_component/ng-leaflet/ng-leaflet.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { MorphHtmlDirective } from '../../_shared/directive/morph-html.directive';


@Component({
  selector: 'app-screen',
  templateUrl: './screen.component.html',
  styleUrls: ['./screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // messed up compileTpl
  providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
  { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
  imports: [PageTitleComponent, FormsModule, FaIconComponent, NgClass, UserEntryFilterComponent, ScanComponent,
    ChatbotComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FullCalendarModule, RouterLink,
    forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent),
    NgSelectModule, SafePipe, NgbDropdown, NgbDropdownToggle, 
    MorphHtmlDirective,
    NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, BucketComponent, NgLeafletComponent, MailboxComponent, CombinedComponent]
})
export class ScreenComponent implements OnInit, OnDestroy {

  
  private userService = inject(UserService);
  public runService = inject(RunService);
  private entryService = inject(EntryService);
  private lookupService = inject(LookupService);
  private router = inject(Router);
  private utilityService = inject(UtilityService);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private pageTitleService = inject(PageTitleService);

  ScreenComponent = ScreenComponent;

  offline = signal<boolean>(false);
  user = computed<any>(() => this.runService.$user());
  app = signal<any>(null);
  preurl: string = '';
  screen = signal<any>(null);
  entryListLoading = signal<boolean>(false);
  form = signal<any>({});
  lookupIds: any;
  lookupKey = {};
  lookup = {};
  base: string = base;
  baseApi: string = baseApi;
  baseUrl: string = '';
  filtersData = signal<any>({});
  dataset = signal<any>({});
  cogna: any = {};
  screenId = input<number>();
  _screenId: number;
  entryId = input<number>();
  _entryId: number; // use private variable to store entryId
  _startTimestamp: number = 0;
  asComp = input<boolean>();
  hideTitle = input<boolean>(false);
  param = input<any>();
  closed = output<any>();
  changed = output<any>()
  accessToken: string = "";
  inPopTpl = viewChild<TemplateRef<any>>('inPopTpl')

  prevSignalKey: string = '';

  appConfig:any = this.runService.appConfig;

  scopeId = computed<string>(() => "screen_"+this.screenId());


  constructor() {

    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));

    effect(() => {

      this._entryId = this.entryId();
      this._screenId = this.screenId();

      const key = `${this._screenId}|${this._entryId}`;

      if (this._screenId && this.user() && this.prevSignalKey != key) {
        this.prevSignalKey = key;
        this.getScreen(this.screenId());
      }    
    })

    effect(() => {
      if (this.user()) {
        const startTimestamp = this.runService.$startTimestamp();
        const param =  this.param()
        if (!deepEqual(this._param,param) || (this._startTimestamp !== startTimestamp && this.hasConfPresetFilters())) {
          this._param = this.param();
          this._startTimestamp = startTimestamp;
          
          if (this._param['$prev$.$id']) {
            this.prevId = this._param['$prev$.$id'];
          }
          if (this.screen()?.dataset) {
            this.loadDatasetEntry(this.screen().dataset, this.pageNumber(), this.sort());
          }
        }
      }
    })
  }

  _param: any = {}
  liveSubscription: any = {};

  ngOnInit() {
    this.app.set(this.runService.$app());
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    this.accessToken = this.userService.getToken();
    this.appConfig = this.runService.appConfig;
  }

  populateCalendarEvent() {
    this.calOptions = {
      initialView: this.screen()?.data?.defaultView,
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
        var ds = this.screen().dataset;
        var param = { email: this.user().email, size: 999 };
        var filter = {};
        if (this.screen().data.start) {
          filter['$.' + this.screen().data.start + '~between'] = info.start.valueOf() + ',' + info.end.valueOf();
        }
        if (this.screen().data.end) {
          filter['$.' + this.screen().data.end + '~between'] = info.start.valueOf() + ',' + info.end.valueOf();
        }
        filter = deepMerge(filter, this.param())
        param['filters'] = JSON.stringify(filter);
        param['@cond'] = "OR";
        param['searchText'] = this.searchText();

        var ac = this.screen().actions[0];

        this.entryService.getListByDataset(ds.id, param)
          .subscribe(res => {
            this.entryList = res.content;
            var events = this.entryList.filter(e => e.data[this.screen().data.start])
              .map(e => {
                // var acLink = ac ? this.buildGo(e.id)[ac.id] : `#${this.preurl}/form/${ds.form.id}/view?entryId=${e.id}`;
                var eventObj: any = {
                  title: this.screen().data?.titleTpl ?
                    this.compileTpl(this.screen()?.data?.titleTpl, { $: e.data, $prev$: e.prev, $_: e, $go: this.buildGo(e.id), $popup: this.buildPop(e.id), $param$: this._param, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl, $baseApi$: baseApi })
                    : formatDate(e.data[this.screen().data.start], 'hmma', 'en-US') + " " + e.data[this.screen().data.title],
                  start: e.data[this.screen().data.start],
                  end: e.data[this.screen().data.end] ? e.data[this.screen().data.end] : e.data[this.screen().data.start],
                  id: e.id,
                  // display:'block', // default will be dot, block is rectangle color
                  backgroundColor: this.randomHsl()
                };
                if (!this.screen().data?.titleTpl) {
                  eventObj.display = 'block'
                }
                return eventObj;
              });

            success(events);

            this.loading.set(false);
          })
      }).bind(this),
      // this is flexible, but it will remove make default event styling (like rectangle color background)
      // eventContent: function( info ) {
      //   return {html: info.event.title};
      // },    
      eventClick: this.eventClick.bind(this)
    }

    this.loading.set(false);
  }


  options: any = {}
  
  getScreen(screenId: any) {
    this.loading.set(true);

    this.runService.getRunScreen(screenId)
      .subscribe(res => {
        this.screen.set(res);
        this.dataset.set({});
        this.entry.set({});
        // this._this = {};
        this.loading.set(false);

        // RIGHT NOW, ALL SCREEN GO THROUGH THIS.
        // let intercept = this.screen().accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
        // if (this.screen().accessList?.length > 0 && intercept.length == 0) {
        //   // && !this.app()?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        //   this.userUnauthorized = true;
        // }

        // ...CHANGE TO CHECKING INSIDE IF TYPE CONDITION
        // UPDATE. NO, DONT CONFUSE SCREEN ACCESS VS FORM ACCESS. SCREEN HAS IT'S OWN ACCESS SETTING
        // this.isAuthorized = this.checkAuthorized(this.screen, this.user, null);


        this.goObj = this.buildGo(this._entryId, true);
        this.goObjWParam = this.buildGo(this._entryId);
        this.popObj = this.buildPop(this._entryId, true);

        // console.log("sprinkle $popup and $this$ in global")
        Object.defineProperty(window, '_popup_'+this.scopeId(), {
          get: ()=> this.popObj,
          configurable: true,   // so you can delete it later 
        });
        Object.defineProperty(window, '_this_'+this.scopeId(), {
          get: ()=> this._this,
          configurable: true,   // so you can delete it later 
          // writable: true,
        });      

        if (['list', 'map'].indexOf(this.screen().type) > -1) {
          this.dataset.set(this.screen().dataset);
          this.form.set({
            data: this.dataset().form,
            prev: this.dataset().form.prev || null
          })

          this.getLookupInFilter();

          // loadDatasetEntry + strtListenFilter cause double loading and flicker
          this.loadDatasetEntry(this.dataset(), this.pageNumber());

        } else if (this.screen().type == 'calendar') {

          this.dataset.set(this.screen().dataset);
          this.form.set({
            data: this.dataset().form,
            prev: this.dataset().form.prev || null
          })

          this.getLookupInFilter();
          this.populateCalendarEvent();

        } else if (this.screen().type == 'page') {
          this.form.set({
            data: this.screen().form,
            prev: this.screen().form.prev
          })
          this.loadFormEntry(this.screen().form.id);
        } else if (this.screen().type == 'static') {
          this.entry.set({ id: this._entryId, data: {} })
          // this execute tooo early. html not yet available. problem when get dom reference

          this.initScreen(this.screen().data.f);

        } else if (this.screen().type == 'chatbot') {
        }

        this.cdr.detectChanges();
      })
  }

  initScreen(js) {
    let jsTxt = this.compileTpl(js, { $: this.entry()?.data, $prev$: this.entry()?.prev, $_: this.entry(), $go: this.buildGo(this.entry()?.id), $popup: this.buildPop(this.entry()?.id), $param$: this._param, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl, $baseApi$: baseApi })

    let res = undefined;
      try {
        res = this._eval(this.entry(), jsTxt);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry().data, this.entry && this.entry().prev, this.user, this.httpGet);
      } catch (e) { this.logService.log(`{screen-${this.screen().title}-initScreen}-${e}`) }
    return res;
  }

  loadScript = loadScript;

  $toast$ = (content, opt) => this.toastService.show(content, opt);

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

  _this = createProxy({},()=>this.cdr.markForCheck());

  // private $this$ = this.createProxy(this.$privthis$);
  // _eval = (data, v) => new Function('setTimeout', 'setInterval', '$app$', '$screen$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$upload$', '$endpoint$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$el$', '$form$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go', '$popup', '$q$', '$showNav$',
  //   `return ${v}`)(this._setTimeout, this._setInterval, this.app, this.screen, this.entry(), this.entry && this.entry().data, this.entry && this.entry().prev, this.user(), this.runService?.appConfig, this.httpGet, this.httpPost, this.uploadFile, this.endpointGet, this._this, this.loadScript, this.$digest$, this._param, this.log, this.updateField, this.updateLookup, this.form()?.data?.items, this.form().data, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);
  _eval = (data, v) => {
    const bindings = this.getEvalContext(this.entry()?.data);
    const argNames  = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
    `return ${v}`)(...argValues);
  }

  getEvalContext = (data) => {
    return {
      setTimeout     : this._setTimeout,
      setInterval    : this._setInterval,
      $app$          : this.app,
      $screen$       : this.screen,
      $_             : this.entry(),
      $              : data,
      // $$_: appr,
      // $$: appr?.data,
      $prev$         : this.entry()?.prev,
      $user$         : this.user(),
      $conf$         : this.appConfig,
      // $action$: this.action(),
      // $lookup$: this._getLookup,
      $http$         : this.httpGet,
      $post$         : this.httpPost,
      $upload$       : this.uploadFile,
      $endpoint$     : this.endpointGet,
      // $save$: () => this._save(this.entry(), form || this.form()),
      // $submit$: (resubmit: boolean) => this.submit(resubmit, this.entry(), form || this.form()),
      $el$           : this.form()?.data?.items,
      $form$         : this.form().data,
      $this$         : this._this,
      $loadjs$       : this.loadScript,
      $digest$       : this.$digest$,
      $param$        : this._param,
      $log$          : this.log,
      // $activate$: this.setActive,
      // $activeIndex$: this._navIndex(),
      $toast$        : this.$toast$,
      $update$       : this.updateField,
      $updateLookup$ : this.updateLookup,
      $base$         : this.base,
      $baseUrl$      : this.baseUrl,
      $baseApi$      : this.baseApi,
      dayjs,
      ServerDate,
      echarts,
      $live$         : this.runService?.$live$(this.liveSubscription, this.$digest$),
      $token$        : this.accessToken,
      $merge$        : deepMerge,
      $web$          : this.http,
      // $file$: this.filesMap,
      // onInit: this.onInit,
      // onSave: this.onSave,
      // onSubmit: this.onSubmit,
      // onView: this.onView,
      $go            : this.goObj,
      $popup         : this.popObj, 
      $q$            : this.$q,
      $showNav$      : this.openNav,
    };
  }

  _qrEval = (code, v) => new Function('setTimeout', 'setInterval', '$app$', '$code$', '$screen$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$el$', '$form$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go', '$popup', '$q$', '$showNav$',
    `return ${v}`)(this._setTimeout, this._setInterval, this.app, code, this.screen, this.entry(), this.entry && this.entry().data, this.entry && this.entry().prev, this.user(), this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this._this, this.loadScript, this.$digest$, this._param, this.log, this.updateField, this.updateLookup, this.form()?.data?.items, this.form().data, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, echarts, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, this.goObj, this.popObj, this.$q, this.openNav);

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.screen().appId, params, callback, error)

  // httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error));
  // httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  // endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.screen().appId, params, callback, error))

  // uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app()?.id, obj.file.name)
  //   .pipe( tap({ next: callback, error: error }), first() ));

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.screen().appId, params, callback, error).pipe(tap(() => this.$digest$())))

  uploadFile = (obj, callback, error) => lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app()?.id, obj.file.name)
    .pipe(tap({ next: callback, error: error }), first()));



  $digest$ = () => {
    this.cdr.detectChanges()
  }


  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.screen()?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.screen()?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
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
    this.screen().actions.forEach(ac => {
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
      if (ac.nextType == 'facet') {
        obj[ac.id] = `${hash}${this.preurl}/form/${ac.next}/${ac.x?.nextFacet}${noParam ? '' : '?entryId=' + (entryId || '')}`
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

  buildPop(eId, noHash?, noParam?) {
    var pop: any = {}
    this.screen().actions.forEach(ac => {
      if (ac.nextType == 'form') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'form', 'add', {})
      }
      if (ac.nextType == 'view') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'view', 'view', noParam ? {} : { entryId: entryId ?? eId })
      }
      if (ac.nextType == 'view-single') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'view', 'view-single', {})
      }
      if (ac.nextType == 'edit') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'form', 'edit', noParam ? {} : { entryId: entryId ?? eId })
      }
      if (ac.nextType == 'facet') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'form', ac.x?.nextFacet, noParam ? {} : { entryId: entryId ?? eId })
      }
      if (ac.nextType == 'edit-single') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'form', 'edit-single', {})
      }
      if (ac.nextType == 'prev') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'form', 'prev', noParam ? {} : { entryId: entryId ?? eId })
      }
      if (ac.nextType == 'static') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'screen', null, {})
      }
      if (ac.nextType == 'screen') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'screen', null, noParam ? {} : { entryId: entryId ?? eId })
      }
      if (ac.nextType == 'dataset') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'dataset', null, {})
      }
      if (ac.nextType == 'dashboard') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'dashboard', null, {})
      }
      if (ac.nextType == 'lookup') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'lookup', null, {})
      }
      if (ac.nextType == 'user') {
        pop[ac.id] = (entryId?) => this.inPop(this.inPopTpl(), entryId, ac, 'user', null, {})
      }
    });
    return pop;// {go:obj,pop:pop};
  }

  //// store param ->

  inPopEntryId = signal<number>(null);
  inPopType = signal<string>('');
  inPopFacet = signal<string>('');
  inPopFormId = signal<number>(null);
  inPopParams = signal<any>({});
  // tpl, entryId, formId, 'form','prev'
  inPop(content, entryId, action, type, facet, params) {
    this.inPopEntryId.set(entryId);
    this.inPopType.set(type);
    this.inPopFacet.set(facet);
    this.inPopFormId.set(action.next);

    params = action.params ? this._pre(this.entry(), action.params, false) : {};
    // console.log("params", params);

    if (params) {
      params.entryId = entryId;
      this.inPopParams = params;
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        // this.getScreen(this.screen().id);
        // this.getEntryList(this.pageNumber(),this.sort);
      }, err => { 
        // this.getScreen(this.screen().id);
      }).finally(()=>{
        // console.log("delete $popup and $this$ from global")
        // delete (window as any).$popup;
        // delete (window as any).$this;
        this.getScreen(this.screen().id);
      });

  }

  // #### ATTEMPT TO UNIFY POPUP AND NAVIGATE
  runAction(url, inpop, content, entryId, formId, type, facet, params) {
    if (inpop) {
      this.inPop(content, entryId, {next:formId}, type, facet, params)
    } else {
      let navigationExtras: NavigationExtras = {
        queryParams: deepMerge({ entryId: entryId }, params),
      };
      this.router.navigate([this.preurl + url], navigationExtras);
    }
  }

  entry = signal<any>({});
  entryParams: any;
  loading = signal<boolean>(false);
  loadFormEntry(fId) {
    if (this._entryId) {
      this.loading.set(true);
      this.entryService.getEntry(this._entryId, fId)
        .subscribe(res => {
          this.entry.set(res);
          this.loading.set(false);
          this.initScreen(this.screen().data.f);

          // RE-CHECK AUTHORIZATION BILA DH ADA ENTRY DATA
          // this.isAuthorized = this.checkAuthorized(this.screen, this.user, this.entry);
        })
    } else {
      // console.log("with param", this.entryParams)
      this.loading.set(true);
      this.entryService.getFirstEntryByParam(this.entryParams, fId)
        .subscribe(res => {
          this._entryId = res.id;
          this.entry.set(res);
          this.loading.set(false);
          this.initScreen(this.screen().data.f);

          // RE-CHECK AUTHORIZATION BILA DH ADA ENTRY DATA
          // this.isAuthorized = this.checkAuthorized(this.screen, this.user, this.entry);
        })
    }
  }

  unAuthorizedMsg: string = "";
  isAuthorized = computed<boolean>(() => this.checkAuthorized(this.screen(), this.user(), this.entry()));
  // userUnauthorized by default is false
  checkAuthorized = (screen, user, entry) => {
    if (!screen || !user) return true;

    if (screen?.data?.restrictAccess) {
      let groupAuthorized = false;
      let approverAuthorized = false;
      let userAuthorized = false;
      let condAuthorized = false;

      let intercept = screen?.accessList?.filter(v => Object.keys(user?.groups || {}).includes(v + ""));
      if (intercept.length > 0) {
        // this.form().accessList?.length == 0 || 
        // && !this.app()?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
        groupAuthorized = true;
      } else {
        this.unAuthorizedMsg = this.app()?.x?.lang == 'ms' ? "Anda tidak mempunyai akses kepada skrin ini" : "You are not authorized to access this screen";
      }
      if (entry?.id) {
        if (screen?.data?.accessByApprover) {
          let authorizer = Object.values(entry.approver).join(",")
          approverAuthorized = authorizer.includes(user?.email)
        }
        if (screen?.data?.accessByUser) {
          userAuthorized = entry.email == user?.email
        }
        if (screen?.data?.accessByCond) {
          condAuthorized = this.preCheck(screen?.data?.accessByCond, entry, false);
        }
        if (!(approverAuthorized || userAuthorized || condAuthorized)) {
          this.unAuthorizedMsg = this.app()?.x?.lang == 'ms' ? "Anda tidak mempunyai akses kepada maklumat ini" : "You are not authorized to access this information";
        }
      }
      // console.log("user", userAuthorized, "approver", approverAuthorized, "group", groupAuthorized, "cond", condAuthorized)
      return groupAuthorized || approverAuthorized || userAuthorized || condAuthorized;
    } else {
      return true;
    }
  }

  sortDir = {};
  sortField = signal<number>(null);
  sortFieldName = signal<string>(null);
  sortByField(id, name, field: string, dir: boolean) {
    this.sortField.set(id);
    this.sortFieldName.set(name);
    this.loadDatasetEntry(this.dataset(), this.pageNumber(), field + '~' + (dir ? 'asc' : 'desc'));
  }

  onSavedInit() {
    this.loadDatasetEntry(this.dataset(), this.pageNumber(), this.sort());
  }

  readonly hasConfPresetFilters = computed(() =>{
    const dataset = this.dataset();
    return dataset?.presetFilters && Object.keys(dataset.presetFilters).some(k => String(dataset.presetFilters[k]).includes('$conf$'));
  });



  prevId: number;

  // searchTextEncoded: string = "";
  entryList = signal<any[]>([]);
  entryTotal = signal<number>(0);
  filtersEncoded = computed(() => encodeURIComponent(JSON.stringify({...this.filtersData(), ...this.param()})));
  searchText = signal<string>('');
  searchTextEncoded = computed(() => encodeURIComponent(this.searchText()));

  // filtersEncoded;
  pageSize = signal<number>(25);
  pageNumber = signal<number>(1);
  // last: boolean; first: boolean; 
  numberOfElements = signal<number>(null);
  sort = signal<string | null>(null);
  entryPages = signal<number>(0);
  filtersByUserAndStorage: any = {};
  // innerHTML:any = ""
  // dataset:any={}
  loadDatasetEntry(ds, pageNumber, sort?) {
    if (ds) {
      this.sort.set(sort);
      this.loading.set(true);
      let filtersAll: any = {};

      filtersAll = Object.assign(filtersAll, this.filtersData(), this._param);

      this.entryList.set([]);

      let params = {
        email: this.user().email,
        searchText: this.searchText(),
        filters: JSON.stringify(filtersAll),
        page: pageNumber - 1,
        size: this.screen().data.paginate ? this.pageSize() : 999999
      }

      // utk handle $conf$, if ada $conf$, override dengan value dari frontend
      if (ds.presetFilters) {
        Object.keys(ds.presetFilters)
          .filter(k => (ds.presetFilters[k] + "").includes("$conf$"))
          .forEach(k => {
            params[k] = this.compileTpl(ds.presetFilters[k] ?? '', { $user$: this.user(), $conf$: this.appConfig, $: {}, $_: {}, $prev$: {}, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this._this, $param$: this._param })
          })
      }

      params = Object.assign(params, this._pre({}, ds.x?.initParam, false));

      if (this.sort()) {
        params['sorts'] = this.sort();
      }
      params['@cond'] = this.filtersCond;

      if (this.screen().type == 'calendar') {
        this.populateCalendarEvent();
      } else {
        this.entryService.getListByDataset(ds.id, params)
          .subscribe({
            next: res => {
              this.entryList.set(res.content);
              this.entryTotal.set(res.page?.totalElements);
              this.loading.set(false);
              this.entry.set({ list: res.content });
              this._this._list = res.content;
              this.numberOfElements.set(res.content?.length);
              this.entryPages.set(res.page?.totalPages);

              this.initScreen(this.screen().data.f);

              try {
                this.changed.emit(res);
              } catch (e) { }

              if (this.screen().type == 'map') {
                this.processForMap();
              }
            },
            error: err => {
              this.loading.set(false);
            }
          })
      }
    }
  }

  timestamp = signal<number>(0);
  mapList: any[];
  processForMap() {
    this.mapList = this.entryList()
      .filter(e => e.data?.coord || (e.data?.[this.screen().data?.lat] && e.data?.[this.screen().data?.lng]))
      .map(e => {
        let longitude, latitude;
        if (!this.screen()?.data?.coord) {
          latitude = e.data[this.screen()?.data?.lat];
          longitude = e.data[this.screen()?.data?.lng];
        } else {
          latitude = e.data[this.screen()?.data?.coord]?.latitude;
          longitude = e.data[this.screen()?.data?.coord]?.longitude;
        }
        return {
          id: e.id,
          latitude: latitude,
          longitude: longitude,
          // title: e.data[this.screen().data.title],
          title: this.compileTpl(this.screen()?.data?.popupTpl, { $: e.data, $prev$: e.prev, $_: e, $go: this.buildGo(e.id), $popup: this.buildPop(e.id), $param$: this._param, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl, $baseApi$: baseApi }),
          marker: this.compileTpl(this.screen()?.data?.icon, { $: e.data, $prev$: e.prev, $_: e, $go: this.buildGo(e.id), $popup: this.buildPop(e.id), $param$: this._param, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl, $baseApi$: baseApi })
        }
      })
    // console.log(this.mapList)
    this.timestamp.set(Date.now());
  }

  calOptions: any;

  eventClick(info) {
    var event = info.event;
    if (event?.id) {
      var actions = this.screen()?.actions;
      if (actions?.length > 0) {
        this.actionLinks.set([]);
        let actionLinks = [];
        actions.forEach(action => {
          let url = this.goObj[action.id]?.replace("#", "");
          let param = action.params ? JSON.parse(action.params.replace("$code$", event?.id)) : {};
          param.entryId = event?.id;
          actionLinks.push({ url: url, param: param, label: action.label });
        })
        this.actionLinks.set(actionLinks);

        if (actionLinks.length == 0) {
          this.router.navigate([`${this.preurl}`, 'form', this.screen()?.dataset?.form?.id, 'view'], { queryParams: { entryId: event?.id } })
        } else if (actionLinks.length == 1) {
          // if only 1 action, immediately navigate
          this.router.navigate([actionLinks[0].url], { queryParams: actionLinks[0]?.param })
        } else {
          // if more than 1, show options
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
    this.loadFormEntry(this.screen()?.form?.id);
    this.router.navigate([this.preurl, 'screen', this.screen().id], { queryParams: { entryId: entryId } });
  }

  // qrPause:boolean = false;
  readonly scanner = viewChild<ScanComponent>('scanner');
  showActions: boolean = false;
  actionLinks = signal<any[]>([]);
  qrValueChange(code, screen) {

    if (code) {
      var actions = screen?.actions;
      if (actions?.length > 0) {

        this.actionLinks.set([]);

        let actionLinks = [];
        actions.forEach(action => {
          let url = this.goObj[action.id]?.replace("#", "");
          let param = action.params ? JSON.parse(action.params.replace("$code$", code)) : {};
          if (action.nextType == 'function') {
            actionLinks.push({ type: 'fn', url: url, f: action.f, label: action.label });
          } else {
            actionLinks.push({ type: 'nav', url: url, param: param, label: action.label });
          }
        })
        this.actionLinks.set(actionLinks);

        if (actionLinks.length == 1) {
          // if only 1 action, immediately navigate
          if (actionLinks[0].type == 'fn') {
            this._qrEval(code, actionLinks[0].f);
            this.scanner().resume();
          } else {
            this.router.navigate([actionLinks[0].url], { queryParams: actionLinks[0]?.param })
          }
        } else {
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

  editFilterItems: any;
  filtersCond: string = "AND";
  editFilter(content, data) {
    this.filtersData.set({...data});
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.filtersData.set({...res});
        // localStorage.setItem("filter-" + this.dataset().id, JSON.stringify(this.filtersData()));
        this.loadDatasetEntry(this.screen().dataset, 1);
      }, res => { });
  }

  readonly optTpl = viewChild('showOptTpl');
  readonly viewport = viewChild('screenviewport');
  showActionOptions() {
    history.pushState(null, null, window.location.href);
    this.modalService.open(this.optTpl(), {
      modalDialogClass: 'modal-dialog-centered modal-no-footer',
      windowClass: '',
      container: '#screen-' + this.screen().id
    })
      .result.then(res => {
      }, res => {
        if (this.screen().type == 'qr') {
          this.scanner().ngOnInit();
        }
      });
  }

  filterIsEmpty = computed(() => Object.keys(this.filtersData()).length === 0 && this.filtersData().constructor === Object)
  filterSize = computed(() => Object.keys(this.filtersData()).length);

  getAsList = splitAsList;
  compileTpl(html, data) {
    delete data.$popup;
    var f = "";
    try {
      f = compileTpl(html, data, this.scopeId());
    } catch (e) {
      this.logService.log(`{screen-${this.screen()?.title}-compiletpl}-${e}`)
    }
    return f;
  }

  _pre = (entry, code, bulk) => !code || new Function('$app$', '$screen$', '$_', '$', '$prev$', '$maps$', '$user$', '$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
    `return ${code}`)(this.app, this.screen, entry, entry?.data, entry && entry?.prev, this.mapList, this.user(), this.runService?.appConfig, this._this, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);

  preCheck(entry, code, bulk) {
    let res = undefined;
    try {
      res = this._pre(entry, code, bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !code || res;
  }

  modalClose(d) {
    console.log("modalClosed")

    if (['list', 'map'].indexOf(this.screen().type) > -1) {
      this.loadDatasetEntry(this.dataset(), this.pageNumber());
    } else if (this.screen().type == 'calendar') {
      this.populateCalendarEvent();
    }


    this.getScreen(this.screen().id);
    d();
  }

  getLookupInFilter() {
    this.dataset().filters.forEach(f => {
      let ds = this.form()[f.root]?.items[f.code]?.dataSource;
      let dsInit = this.form()[f.root]?.items[f.code]?.dataSourceInit;
      let type = this.form()[f.root]?.items[f.code]?.type;
      if (ds) { // only load filter with ds, which is lookup
        this.lookupKey[f.code] = {
          ds: ds,
          type: type
        }
        var param = null;
        try {
          param = new Function('$user$', 'return ' + dsInit)(this.user())
        } catch (e) { this.logService.log(`{list-${f.code}-dataSourceInit}-${e}`) }
        this._getLookup(f.code, dsInit ? param : null);
      }
    })
  }

  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this._getLookupObs(code, param, cb, err)
        .subscribe({
          next: res => {
            this.lookup[code] = res;
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

  linkify = linkify;

  // getIcon = (str) => str ? str.split(":") : ['far', 'question-circle'];

  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key => this.liveSubscription[key].unsubscribe());
    // this.liveSubscription.forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(i => clearInterval(i));
    this.timeoutList.forEach(i => clearTimeout(i));

    // Problem delete $popup and $this$ from global because this is delayed. 
    // It will delete the newly created $popup and $this$ when loading other screen.
    // console.log("delete $popup and $this$ from global")
    // delete (window as any).$popup;
    // delete (window as any).$this;
  }

}
