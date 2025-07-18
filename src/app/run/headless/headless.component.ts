import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterOutlet } from '@angular/router';
import { base, baseApi, domainBase, domainRegex } from '../../_shared/constant.service';
import { UserService } from '../../_shared/service/user.service';
import { RunService } from '../_service/run.service';
import { first, lastValueFrom, tap } from 'rxjs';
import { PlatformLocation } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import dayjs from 'dayjs';
import { LogService } from '../../_shared/service/log.service';
import { ToastService } from '../../_shared/service/toast-service';
import { ServerDate, deepMerge, compileTpl, loadScript, createProxy } from '../../_shared/utils';
import { EntryService } from '../_service/entry.service';
import { RegisterComponent } from '../register/register.component';
import { SafePipe } from '../../_shared/pipe/safe.pipe';

@Component({
    selector: 'app-headless',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './headless.component.html',
    styleUrls: ['./headless.component.scss'],
    imports: [RouterOutlet, RegisterComponent, SafePipe]
})
export class HeadlessComponent implements OnInit, OnDestroy {

  
  private userService = inject(UserService)
  public runService = inject(RunService)
  private route = inject(ActivatedRoute)
  private modalService = inject(NgbModal)
  private location = inject(PlatformLocation)
  private titleService = inject(Title)
  private http = inject(HttpClient)
  private toastService = inject(ToastService)
  private cdr = inject(ChangeDetectorRef)
  private entryService = inject(EntryService)
  private logService = inject(LogService)

  appLoading = signal<boolean>(false);
  validPath: boolean;
  baseApi = baseApi;
  base = base;
  
  user = signal<any>({});
  badge: any;
  app = signal<any>(null);
  active = false;
  path: string;
  pushDismissed: boolean;

  appConfig:any = this.runService.appConfig;
  offline = signal<boolean>(false);
  preurl: string = '';
  appId: number;

  frameless: boolean = true;
  appUserList: any[];
  getIcon = (str) => str ? str.split(":") : ['far', 'file'];
  param: any = {};
  accessToken: string = '';
  liveSubscription: any = {};  
  appUrl:string ='';  
  baseUrl: string = '';
  _this = createProxy({},()=>this.cdr.markForCheck());
  // _this :any = {};

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
  }

  ngOnInit() {

    this.accessToken = this.userService.getToken();

    this.appConfig = this.runService.appConfig;

    Object.defineProperty(window, '_conf', {
      get: () => this.appConfig,
      configurable: true,   // so you can delete it later 
      // writable: true,
    });  
    Object.defineProperty(window, '_this_start', {
      get: () => this._this,
      configurable: true,   // so you can delete it later 
      // writable: true,
    });  

    this.userService.getUser()
      .subscribe((user) => {
        this.user.set(user);
        this.runService.$user.set(user);

        this.route.params
          .subscribe((params: Params) => {
            this.param = params;
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

  saveAppUser(selectedRoles) {
    var payload = {
      email: this.user().email,
      groups: selectedRoles,
      name: this.user().name,
      autoReg: false
    }
    this.runService.regAppUser(this.app().id, payload)
      .subscribe(res => {
        this.user.set(res.user);
        this.userService.setUser(res.user);
        this.runService.$user.set(res.user);
      });
  }

  onceDone() {
    this.runService.onceDone(this.app().id, this.user().email, true)
      .subscribe({
        next: res => {
          this.user.set(res);
          this.userService.setUser(res);
          this.runService.$user.set(res);
        },
        error: err => {
          this.user.update(u=>({...u, once: true}));
          this.userService.setUser(this.user());
        }
      })
  }

  logout() {
    this.userService.logout();
  }

  getPath() {
    if (window.location.host.indexOf(domainBase) > -1) {
      return 'path:' + window.location.host.match(domainRegex)[1];
    } else {
      return 'domain:' + window.location.hostname;
    }
  }

  screen = signal<any>(null);
  maintenance = signal<boolean>(false);
  getAppByPath(path) {
    this.appLoading.set(true);
    this.runService.getRunAppByPath(path, { email: this.user().email })
      .subscribe({
        next: (res) => {
          if (res) {
            this.validPath = true;
            this.app.set(res);
            this.runService.$app.set(res);
            this.titleService.setTitle(res.title);
            if (res.once) {
              this.runService.getRunScreen(res.once)
                .subscribe(screen => this.screen.set(screen));
            }

            if (!res.live){
              if (path.includes("--dev")){ // app is dev && path --dev
                // OK
              }else{
                this.maintenance.set(true);
                // Show error: App is under maintenance
              }
            }

            this.appLoading.set(false);
          } else {
            this.validPath = false;
          }
          this.initScreen(res.f);
        },
        error: (err) => {
          this.validPath = false;
          this.appLoading.set(false);
        }
      });
  }

  isDev: boolean;
  startPage:string='start';
  getApp(id) {
    this.appLoading.set(true);
    this.runService.getRunApp(id, { email: this.user().email })
      .subscribe({
        next: (res) => {
          this.app.set(res);
          this.runService.$app.set(res);        

          this.appLoading.set(false);

          this.runService.getAppUserByEmail(id, { email: this.user().email })
            .subscribe(appUserList => {
              this.appUserList = appUserList;
            });

          if (res.once) {
            this.runService.getRunScreen(res.once)
              .subscribe(screen => this.screen.set(screen));
          }
          this.initScreen(res.f);

        },
        error: (err) => this.appLoading.set(false)
      })
  }

  darkMode: boolean = false;
  toggleDark() {
    this.darkMode = !this.darkMode;
    // localStorage.setItem("darkMode",this.darkMode+"");
  }


  preCheck(f) {
    let res = undefined;
    try {
      if (f.pre) {
        let pre = f.pre.trim();
        res = this._pre(pre);
      }
    } catch (e) { this.logService.log(`{start-${f?.code}-precheck}-${e}`) }
    return !f.pre || res;
  }

  preGroup:any={}
  preItem:any={}

  _pre = (v) => new Function('$app$', '$navi$', '$navis$', '$badge$', '$user$', '$conf$', '$this$', '$param$', 'ServerDate', '$base$', '$baseUrl$','$baseApi$', '$token$', `return ${v}`)
    (this.app(), {}, {}, this.badge, this.user(), this.appConfig, this._this, this.param, ServerDate, this.base, this.baseUrl, this.baseApi, this.accessToken);

  _eval = (v) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$','$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go','$pop','$q$',
    `return ${v}`)(this.app(), {}, {}, {}, this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this._this, this.loadScript, this.$digest$, this.param, this.log, this.updateField, this.updateLookup, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, null, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, null, null, this.$q);
  

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data, "start");
    } catch (e) {
      this.logService.log(`{start-compiletpl}-${e}`)
    }
    return f;
  }

  initScreen(js) {
    let res = undefined;
    let jsTxt = this.compileTpl(js, {$param$:this.param,$this$:this._this,$user$:this.user(), $conf$:this.appConfig,$base$:base, $baseUrl$:this.baseUrl, $baseApi$:baseApi})
    try {
      res = this._eval(jsTxt);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{start-${this.app().title}-initNavi}-${e}`) }
    // this.runPre();
    return res;
  }

  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.app?.id, params, callback, error)

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app()?.id, params, callback, error).pipe(tap(()=>this.$digest$())));

  
  loadScript = loadScript;

  $digest$ = () => {
    this.runService.$startTimestamp.set(Date.now());
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

  // openNav = (opened: boolean)=>{
  //   this.pageTitleService.open(opened);
  // }

  
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

  dismissAllModal(){
    this.modalService.dismissAll('');
  }

  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key=>this.liveSubscription[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
  }


}
