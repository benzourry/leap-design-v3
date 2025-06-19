import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterOutlet } from '@angular/router';
import { base, baseApi, domainBase, domainRegex } from '../../_shared/constant.service';
import { UserService } from '../../_shared/service/user.service';
import { RunService } from '../_service/run.service';
import { first, lastValueFrom, Subscription, take, tap } from 'rxjs';
import { PlatformLocation } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { SwPush } from '@angular/service-worker';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import dayjs from 'dayjs';
import { LogService } from '../../_shared/service/log.service';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { PushService } from '../../_shared/service/push.service';
import { ToastService } from '../../_shared/service/toast-service';
import { UtilityService } from '../../_shared/service/utility.service';
import { getQuery, ServerDate, deepMerge, compileTpl, loadScript } from '../../_shared/utils';
import { EntryService } from '../_service/entry.service';

@Component({
    selector: 'app-headless',
    templateUrl: './headless.component.html',
    styleUrls: ['./headless.component.scss'],
    imports: [RouterOutlet]
})
export class HeadlessComponent implements OnInit, OnDestroy {
  appLoading: boolean;
  validPath: boolean;
  baseApi = baseApi;
  base = base;
  readonly VAPID_PUBLIC_KEY = "BIRiQCpjtaORtlvwZ7FzFkf8V799iGvEX1kQtO86y-BdiGpAMvXN4UDU1DWEqrpPEAiDDVilG8WKk62NjFc1Opo";

  constructor(private userService: UserService, private swPush: SwPush, private pushService: PushService,
    public runService: RunService, private router: Router, private route: ActivatedRoute, private utilityService: UtilityService, private modalService: NgbModal,
    private location: PlatformLocation, private titleService: Title, private pageTitleService: PageTitleService,
    private http: HttpClient, private toastService: ToastService,
    private cdr: ChangeDetectorRef,private entryService: EntryService,
    private logService: LogService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    this.swPush.notificationClicks.subscribe(arg => {
      console.log(
        'Action: ' + arg.action,
        'Notification data: ' + arg.notification.data,
        'Notification data.url: ' + arg.notification.data.url,
        'Notification data.body: ' + arg.notification.body,
      );
    });
  }


  user: any;
  // formList: any;
  badge: any;
  app: any;
  // searchText: string = "";
  active = false;
  path: string;
  pushDismissed: boolean;
  // logs: any[];

  // navToggle: any = { 0: true };

  offline = false;

  // naviData: any = {}

  // navis: any;

  preurl: string = '';
  appId: number;

  subscription: Subscription;
  // sidebarActive: boolean = false;
  // editMode: boolean = false;
  frameless: boolean = false;

  appUserList: any[];

  getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  $param$: any = {};

  accessToken: string = '';

  liveSubscription: any = {};
  
  appUrl:string ='';

  ngOnInit() {

    // console.log("start-init");
    this.frameless = (getQuery("noframe") || window.localStorage.getItem("noframe")) == 'true';
    window.localStorage.setItem("noframe", this.frameless + '');

    // remove pushDismissed from localstorage when logout
    this.pushDismissed = localStorage.getItem("pushDismissed") == '1';

    this.accessToken = this.userService.getToken();

    this.userService.getUser()
      .subscribe((user) => {
        this.user = user;
        this.runService.$user.set(this.user);

        this.route.params
          .subscribe((params: Params) => {
            this.$param$ = params;
            this.appId = params['appId'];
            if (this.appId) {
              this.preurl = `/run/${this.appId}`;
              this.runService.$preurl.set(this.preurl);
              this.getApp(this.appId);

            } else {
              this.getAppByPath(this.getPath());
            }
            this.baseUrl = (location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;
          });
      })
  }

  dismissPush() {
    localStorage.setItem("pushDismissed", "1");
    this.pushDismissed = true;
  }

  saveAppUser(selectedRoles) {
    var payload = {
      email: this.user.email,
      groups: selectedRoles,
      name: this.user.name,
      autoReg: false
    }
    this.runService.regAppUser(this.app.id, payload)
      .subscribe(res => {
        this.user = res.user;
        this.userService.setUser(res.user);
        // if (!this.frameless) {
        //   this.getNavis(this.app.id, this.user.email);
        //   this.getNaviData(this.app.id, this.user.email);
        // }
      });
  }

  // saveUserDetail(user) {
  //   this.runService.saveUserDetails(this.user.id, user)
  //     .subscribe(user => {
  //       this.user = user;
  //     })
  // }


  pushSub: any;
  actualSub: any;
  pushSubError: any;
  checkPush(app) {
    if (app.canPush) {
      this.swPush.subscription
        .pipe(take(1))
        .subscribe(sub => {
          if (sub) {
            this.actualSub = sub;
            this.pushService.checkPush(sub.endpoint)
              .subscribe(res => this.pushSub = res)
          }
        })
    }
  }

  subscribePush() {
    this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    })
      .then(sub => {
        this.actualSub = sub;
        this.pushService.subscribePush(this.user.id, sub)
          .subscribe(res => this.pushSub = res);
      })
      .catch(err => { this.pushSubError = { err: err }; console.log(err) });

  }

  onceDone() {
    this.runService.onceDone(this.app.id, this.user.email, true)
      .subscribe({
        next: res => {
          this.user = res;
          this.userService.setUser(res);
        },
        error: err => {
          this.user.once = true;
          this.userService.setUser(this.user);
        }
      })
  }

  logout() {
    // this.userService.clearStorage('user');
    this.userService.logout();
    // .subscribe(user=>this.user=user);
  }


  getPath() {
    if (window.location.host.indexOf(domainBase) > -1) {
      return 'path:' + window.location.host.match(domainRegex)[1];
    } else {
      return 'domain:' + window.location.hostname;
    }
  }


  screen: any;
  maintenance: boolean;
  getAppByPath(path) {
    this.appLoading = true;
    this.runService.getRunAppByPath(path, { email: this.user.email })
      .subscribe({
        next: (res) => {
          if (res) {
            this.validPath = true;
            this.app = res;
            this.runService.$app.set(this.app);
            this.titleService.setTitle(this.app.title);
            if (this.app.once) {
              this.runService.getRunScreen(this.app.once)
                .subscribe(screen => this.screen = screen);
            }

            if (!this.app.live){
              if (path.includes("--dev")){ // app is dev && path --dev
                // OK
              }else{
                this.maintenance = true;
                // Show error: App is under maintenance
              }
            }

            // let url = this.router.url.split('?')[0].replace('/', ''); // utk check nya da /path x kt url. Mn xda, navigate ke startPage or /start
            // // console.log(url);
            // if (res.startPage && !url) {
            //   // console.log('--with start', url);
            //   this.router.navigate([res.startPage], { relativeTo: this.route, queryParams: this.route.snapshot.queryParams });
            // }else{
            //   // console.log('--no start', url);
            //   this.router.navigate(['start'],{ relativeTo: this.route});
            // }
            this.appLoading = false;
          } else {
            this.validPath = false;
          }
          this.checkPush(this.app);
          this.initScreen(this.app.f);
        },
        error: (err) => {
          this.validPath = false;
          this.appLoading = false;
        }
      });
  }

  isDev: boolean;
  startPage:string='start';
  getApp(id) {
    this.appLoading = true;
    this.runService.getRunApp(id, { email: this.user.email })
      .subscribe({
        next: (res) => {
          this.app = res;
          // console.log("loaded app")
          this.runService.$app.set(this.app);        

          this.appLoading = false;
          // this.isDev = this.app.email.indexOf(this.userService.getActualUser().email) > -1;

          this.runService.getAppUserByEmail(id, { email: this.user.email })
            .subscribe(appUserList => {
              this.appUserList = appUserList;
            });

          // if (this.app.layout == 'topnav') {
          //   this.navToggle = {};
          // }
          if (this.app.once) {
            this.runService.getRunScreen(this.app.once)
              .subscribe(screen => this.screen = screen);
          }
          this.checkPush(this.app);
          this.initScreen(this.app.f);

          // this.startPage = res.startPage??'start';

          // // utk check nya da /path x kt url. Mn xda, navigate ke startPage or /start
          // // utk run dari designer nya xjln, sbb sentiasa da /run/<app-id>
          // let url = this.router.url.split('?')[0]
          // .replace(this.preurl,'')
          // .replace('/', ''); 

          // if (!url){
          //   if (res.startPage) {
          //     // console.log('--with startpage', url);
          //     // this.startPage = res.startPage;
          //     this.router.navigate([res.startPage], { relativeTo: this.route, queryParams: this.route.snapshot.queryParams });
          //   }else{
          //     // console.log('--no startpage', url);
          //     this.router.navigate(['start'],{ relativeTo: this.route});
          //   }
          // }
          

        },
        error: (err) => this.appLoading = false
      })
  }

  darkMode: boolean = false;
  toggleDark() {
    this.darkMode = !this.darkMode;
    // localStorage.setItem("darkMode",this.darkMode+"");
  }


  baseUrl: string = '';
  $this$: any = {}

  preCheck(f) {
    let res = undefined;
    try {
      if (f.pre) {
        let pre = f.pre.trim();
        res = this._pre(pre);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
      }
    } catch (e) { this.logService.log(`{start-${f?.code}-precheck}-${e}`) }
    return !f.pre || res;
  }

  preGroup:any={}
  preItem:any={}
  // runPre(){
  //   this.navis?.forEach(group=>{
  //     this.preGroup[group.id]=this.preCheck(group);
  //     group.items?.forEach(item=>{
  //       this.preItem[item.id]=this.preCheck(item);
  //     })

  //   })
  // }

  _pre = (v) => new Function('$app$', '$navi$', '$navis$', '$badge$', '$user$', '$conf$', '$this$', '$param$', 'ServerDate', '$base$', '$baseUrl$','$baseApi$', '$token$', `return ${v}`)
    (this.app, {}, {}, this.badge, this.user, this.runService?.appConfig, this.$this$, this.$param$, ServerDate, this.base, this.baseUrl, this.baseApi, this.accessToken);

  // _eval = (v) => new Function('$app$', '$navi$', '$navis$', '$badge$', '$user$', '$conf$', '$this$','$loadjs$', '$param$','$http$', '$post$', '$endpoint$', 'ServerDate', '$base$', '$baseUrl$','$baseApi$', '$token$', `return ${v}`)
  //   (this.app, this.naviData, this.navis, this.badge, this.user, this.runService?.appConfig, this.$this$, this.loadScript, this.$param$, this.httpGet, this.httpPost, this.endpointGet, ServerDate, this.base, this.baseUrl, this.baseApi, this.accessToken);
  
  _eval = (v) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$pop','$q$','$showNav$',
    `return ${v}`)(this.app, {}, {}, {}, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, null, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, null, null, this.$q, this.openNav);
  

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data);
    } catch (e) {
      this.logService.log(`{start-compiletpl}-${e}`)
    }
    return f;
  }

  initScreen(js) {
    let res = undefined;
    let jsTxt = this.compileTpl(js, {$param$:this.$param$,$this$:this.$this$,$user$:this.user, $conf$:this.runService.appConfig,$base$:base, $baseUrl$:this.baseUrl, $baseApi$:baseApi})
    try {
      res = this._eval(jsTxt);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{start-${this.app.title}-initNavi}-${e}`) }
    // this.runPre();
    return res;
  }

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.app?.id, params, callback, error)

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app?.id, params, callback, error).pipe(tap(()=>this.$digest$())));

  
  loadScript = loadScript;

  $digest$ = () => {
    this.runService.$startTimestamp.set(Date.now());
    // this.runPre();
    this.cdr.detectChanges()
  }

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

  
  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => {
          this.runService.$startTimestamp.set(Date.now())     
        }), first()
      ));
  }

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => {
          this.runService.$startTimestamp.set(Date.now())     
        }), first()
      ));
  }


  // showEdit() {
  //   var email = this.userService.getActualUser().email
  //   return this.app?.email.indexOf(email) > -1;
  // }

  dismissAllModal(){
    this.modalService.dismissAll('');
  }

  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key=>this.liveSubscription[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
  }


}
