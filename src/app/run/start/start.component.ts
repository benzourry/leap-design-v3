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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, NavigationEnd, Params, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, NgStyle } from '@angular/common';
import { baseApi, domainRegex, domainBase, base } from '../../_shared/constant.service';
import { Title } from '@angular/platform-browser';
import { Subscription, lastValueFrom } from 'rxjs';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { ServerDate, compileTpl, createProxy, deepMerge, getQuery, loadScript } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';
import { SwPush } from '@angular/service-worker';
import { PushService } from '../../_shared/service/push.service';
import { filter, first, take, tap } from 'rxjs/operators';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { RegisterComponent } from '../register/register.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { HttpClient } from '@angular/common/http';
import dayjs from 'dayjs';
import { ToastService } from '../../_shared/service/toast-service';
import { PageTitleComponent } from '../_component/page-title.component';
import { EntryService } from '../_service/entry.service';
import { RunService } from '../_service/run.service';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FaIconComponent, RegisterComponent, PageTitleComponent, 
    NgClass, NgStyle, RouterLinkActive, RouterOutlet, SafePipe, IconSplitPipe]
})
export class StartComponent implements OnInit, OnDestroy {

  
  private userService = inject(UserService);
  private swPush = inject(SwPush);
  private pushService = inject(PushService);
  private runService = inject(RunService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private utilityService = inject(UtilityService);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private titleService = inject(Title);
  private pageTitleService = inject(PageTitleService);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private entryService = inject(EntryService);
  private cdr = inject(ChangeDetectorRef);

  // Signals for state management
  appLoading = signal<boolean>(false);
  validPath = computed(() => !!this.app());
  offline = signal<boolean>(false);
  sidebarActive = signal<boolean>(false);
  // frameless = signal<boolean>(false);
  frameless = computed(() => (getQuery('noframe') || localStorage.getItem('noframe')) === 'true');
  pushDismissed = signal(localStorage.getItem('pushDismissed') === '1');
  maintenance = computed(() => {
    const app = this.app();
    const path = window.location.host;
    return !this.editMode && !!app && !app.live && !path.includes('--dev');
  });
  darkMode = signal<boolean>(false);
  app = signal<any>(null);
  lang = computed(() => this.app().x?.lang);
  user = signal<any>(null);
  navis = signal<any[]>([]);
  naviData = signal<any>(null);
  appUserList = signal<any[]>([]);
  liveSubscription = signal<Record<string, any>>({});
  preGroup = signal<Record<string, boolean>>({});
  preItem = signal<Record<string, boolean>>({});
  navToggle = signal<Record<number, boolean>>({});
  appConfig:any = this.runService.appConfig;
  baseUrl = computed(() => {
    return (
      location.protocol +
      '//' +
      location.hostname +
      (location.port ? ':' + location.port : '') +
      '/#' +
      this.preurl()
    );
  });

  startPage = computed(() => this.app()?.startPage ?? 'start');
  isDev = computed(() => this.app()?.email.indexOf(this.userService.getActualUser().email) > -1);
  screen = signal<any>(null);

  readonly baseApi = baseApi;
  readonly base = base;
  readonly VAPID_PUBLIC_KEY = 'BIRiQCpjtaORtlvwZ7FzFkf8V799iGvEX1kQtO86y-BdiGpAMvXN4UDU1DWEqrpPEAiDDVilG8WKk62NjFc1Opo';

  firstActiveSet: boolean = false;

  editMode: boolean = false;
  badge: any;
  active = false;
  path: string;

  preurl = signal<string>('');
  appId: number;
  subscription: Subscription;
  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];
  $param$: any = {};
  accessToken: string = '';
  pushSub: any;
  actualSub: any;
  pushSubError: any;
  appUrl: string = '';

  _this = createProxy({},()=>this.cdr.markForCheck());

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe((online) => this.offline.set(!online));
    this.swPush.notificationClicks.subscribe((arg) => {
      console.log(
        'Action: ' + arg.action,
        'Notification data: ' + arg.notification.data,
        'Notification data.url: ' + arg.notification.data.url,
        'Notification data.body: ' + arg.notification.body
      );
    });
  }

  ngOnInit() {

    window.localStorage.setItem('noframe', this.frameless() + '');

    this.accessToken = this.userService.getToken();

    // might also consider using proxy and $digest$ for any changes
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
        // console.log("loaded user", user)

        this.route.params
          .subscribe((params: Params) => {
            this.$param$ = params;
            this.appId = params['appId'];
            if (this.appId) {
              this.preurl.set(`/run/${this.appId}`);
              this.runService.$preurl.set(this.preurl());
              this.getApp(this.appId);

              if (!this.frameless()) {
                this.getNavis(this.appId, this.user().email);
                this.getNaviData(this.appId, this.user().email);
              }
              this.editMode = true;
            } else {
              this.getAppByPath(this.getPath());
            }
          });
      })

    this.subscription = this.pageTitleService.openAnnounced$.subscribe(
      opened => {
        this.sidebarActive.set(opened)
      }
    )

    this.router.events
    .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd) => {
      // Check if navigated to root
      if (this.router.url === '/' || this.router.url === '') {
        // Wait for app() to be available, or use a fallback
        const startPage = this.app()?.startPage || 'start';
        // Prevent infinite loop if already at startPage
        if (this.router.url !== `/${startPage}`) {
          this.router.navigate([startPage], {
            relativeTo: this.route,
            queryParams: this.route.snapshot.queryParams,
            replaceUrl: true // Optional: replaces history entry
          });
        }
      }
    });    
  }


  dismissPush() {
    localStorage.setItem("pushDismissed", "1");
    this.pushDismissed.set(true);
  }

  toggleNav(index: number): void {
    const currentState = this.navToggle();
    this.navToggle.set({ ...currentState, [index]: !currentState[index] });
  }

  saveAppUser(selectedRoles) {
    var payload = {
      email: this.user().email,
      groups: selectedRoles,
      name: this.user.name,
      autoReg: false
    }
    this.runService.regAppUser(this.app().id, payload)
      .subscribe(res => {
        this.user.set(res.user);
        this.runService.$user.set(res.user);
        this.userService.setUser(res.user);
        if (!this.frameless()) {
          this.getNavis(this.app().id, this.user().email);
          this.getNaviData(this.app().id, this.user().email);
        }
      });
  }

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
        this.pushService.subscribePush(this.user().id, sub)
          .subscribe(res => this.pushSub = res);
      })
      .catch(err => { this.pushSubError = { err: err }; console.log(err) });

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
          this.user().once = true;
          this.userService.setUser(this.user);
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

  hideSb() {
    setTimeout(() => { this.sidebarActive.set(false) }, 300)
  }
  getAppByPath(path) {
    this.appLoading.set(true);
    this.runService.getRunAppByPath(path, { email: this.user().email })
      .subscribe({
        next: (res) => {
          this.app.set(res);
          this.runService.$app.set(res);
          if (!this.frameless()) {
            this.getNavis(res.id, this.user().email);
            this.getNaviData(res.id, this.user().email);
          }
          if (this.app().layout == 'topnav') {
            this.navToggle.set({});
          }
          this.titleService.setTitle(this.app().title);
          if (this.app().once) {
            this.runService.getRunScreen(this.app().once)
              .subscribe(screen => this.screen.set(screen));
          }

          // still need this for initial loading
          let url = this.router.url.split('?')[0].replace('/', ''); // utk check nya da /path x kt url. Mn xda, navigate ke startPage or /start
          if (res.startPage && !url) {
            this.router.navigate([res.startPage], { 
              relativeTo: this.route, 
              queryParams: this.route.snapshot.queryParams,
              replaceUrl: true
            });
          } else {
            this.router.navigate(['start'], { 
              relativeTo: this.route,
              replaceUrl: true });
          }

          this.appLoading.set(false);
          this.checkPush(this.app());
          this.initScreen(this.app().f);
        },
        error: (err) => {
          // this.validPath.set(false);
          this.appLoading.set(false);
        }
      });
  }

  getApp(id) {
    this.appLoading.set(true);
    this.runService.getRunApp(id, { email: this.user().email })
      .subscribe({
        next: (res) => {
          this.app.set(res);
          this.runService.$app.set(res);

          this.appLoading.set(false);
          // this.isDev.set(res.email.indexOf(this.userService.getActualUser().email) > -1);

          this.runService.getAppUserByEmail(id, { email: this.user().email })
            .subscribe(appUserList => {
              this.appUserList.set(appUserList);
            });

          if (res.layout == 'topnav') {
            this.navToggle.set({});
          }
          if (res.once) {
            this.runService.getRunScreen(res.once)
              .subscribe(screen => this.screen.set(screen));
          }
          this.checkPush(res);
          this.initScreen(res.f);

          // this.startPage.set(res.startPage??'start');

          // utk check nya da /path x kt url. Mn xda, navigate ke startPage or /start
          // utk run dari designer nya xjln, sbb sentiasa da /run/<app-id>
          let url = this.router.url.split('?')[0]
            .replace(this.preurl(), '')
            .replace('/', '');

          if (!url) {
            if (res.startPage) {
              this.router.navigate([res.startPage], { 
                relativeTo: this.route, 
                queryParams: this.route.snapshot.queryParams,
                replaceUrl: true
              });
            } else {
              this.router.navigate(['start'], { 
                relativeTo: this.route,
                replaceUrl: true 
              });
            }
          }


        },
        error: (err) => this.appLoading.set(false)
      })
  }

  getNavis(id, email) {
    this.runService.getNavis(id, email)
      .subscribe(res => {
        this.navis.set(res);
        this.runService.$navis.set(res);
        this.runPre();
        var naviObj = {}
        res.forEach(n => {
          n.items.forEach(i => {
            if (!naviObj[i.type]) naviObj[i.type] = {};
            naviObj[i.type][i.screenId] = this.preItem()[i.id];
          })
        })
        this.runService.$naviPerm.set(naviObj);
      })
  }

  getNaviData(id, email) {
    this.runService.getNaviData(id, email)
      .subscribe(res => {
        this.naviData.set(res);
        this.runService.$naviData.set(res);
        this.runPre();
      })
  }

  toggleDark() {
    this.darkMode.set(!this.darkMode);
    // localStorage.setItem("darkMode",this.darkMode+"");
  }
  designUrl = computed(() => {
    const split = location.hash.split('/');
    const appId = split[2]?.replace(/\D/g, '');
    if (!appId) return { url: '', query: undefined };

    if (split[3]) {
      if (['form', 'dataset', 'dashboard', 'screen'].includes(split[3])) {
        return {
          url: `/design/${appId}/ui/${split[3]}`,
          query: { id: split[4] },
        };
      } else if (['profile'].includes(split[3])) {
        return {
          url: `/design/${appId}/`,
          query: undefined,
        };
      } else if (['start'].includes(split[3])) {
        return {
          url: `/design/${appId}/ui/navi`,
          query: undefined,
        };
      } else {
        return {
          url: `/design/${appId}/${split[3]}`,
          query: { id: split[4] },
        };
      }
    } else {
      return {
        url: `/design/${appId}/`,
        query: undefined,
      };
    }
  });


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

  runPre(): void {
    const updatedPreGroup = { ...this.preGroup() };
    const updatedPreItem = { ...this.preItem() };
    const updatedNavToggle = {};

    let firstActiveSet = false;

    this.navis()?.forEach((group, index) => {
      updatedPreGroup[group.id] = this.preCheck(group);

      if (!firstActiveSet && updatedPreGroup[group.id]) {
        firstActiveSet = true;
        updatedNavToggle[index] = true;
      }

      group.items?.forEach((item) => {
        updatedPreItem[item.id] = this.preCheck(item);
      });
    });

    this.preGroup.set(updatedPreGroup);
    this.preItem.set(updatedPreItem);
    this.navToggle.set(updatedNavToggle);
  }

  _pre = (v) => new Function('$app$', '$navi$', '$navis$', '$badge$', '$user$', '$conf$', '$this$', '$param$', 'ServerDate', '$base$', '$baseUrl$', '$baseApi$', '$token$', `return ${v}`)
    (this.app(), this.naviData(), this.navis(), this.badge, this.user(), this.runService?.appConfig, this._this, this.$param$, ServerDate, this.base, this.baseUrl(), this.baseApi, this.accessToken);

  // _eval = (v) => new Function('$app$', '$navi$', '$navis$', '$badge$', '$user$', '$conf$', '$this$','$loadjs$', '$param$','$http$', '$post$', '$endpoint$', 'ServerDate', '$base$', '$baseUrl$','$baseApi$', '$token$', `return ${v}`)
  //   (this.app, this.naviData, this.navis, this.badge, this.user, this.runService?.appConfig, this._this, this.loadScript, this.$param$, this.httpGet, this.httpPost, this.endpointGet, ServerDate, this.base, this.baseUrl, this.baseApi, this.accessToken);

  _eval = (v) => new Function('setTimeout','setInterval','$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$update$', '$updateLookup$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', 'echarts', '$live$', '$token$', '$merge$', '$web$', '$go', '$pop', '$q$', '$showNav$',
    `return ${v}`)(this._setTimeout, this._setInterval, this.app(), {}, {}, {}, this.user(), this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this._this, this.loadScript, this.$digest$, this.$param$, this.log, this.updateField, this.updateLookup, this.$toast$, this.base, this.baseUrl(), this.baseApi, dayjs, ServerDate, null, this.runService?.$live$(this.liveSubscription(), this.$digest$), this.accessToken, deepMerge, this.http, null, null, this.$q, this.openNav);


  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data,'start');
    } catch (e) {
      this.logService.log(`{start-compiletpl}-${e}`)
    }
    return f;
  }

  initScreen(js) {
    let res = undefined;
    let jsTxt = this.compileTpl(js, { $param$: this.$param$, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl(), $baseApi$: baseApi })
    try {
      res = this._eval(jsTxt);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{start-${this.app().title}-initNavi}-${e}`) }
    this.runPre();
    return res;
  }

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app()?.id, params, callback, error).pipe(tap(() => this.$digest$())));


  loadScript = loadScript;

  $digest$ = () => {
    this.runService.$startTimestamp.set(Date.now());
    this.runPre();
    this.cdr.detectChanges()
  }

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


  showEdit = computed(() => {
    const email = this.userService.getActualUser().email;
    return this.app()?.email.indexOf(email) > -1;
  });

  dismissAllModal() {
    this.modalService.dismissAll('');
  }

  ngOnDestroy() {
    Object.keys(this.liveSubscription()).forEach(key => this.liveSubscription()[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(i => clearInterval(i));
    this.timeoutList.forEach(i => clearTimeout(i));
  }
}
