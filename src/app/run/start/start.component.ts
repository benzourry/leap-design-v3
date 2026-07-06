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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnDestroy, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, NavigationEnd, Params, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbCollapse, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, NgStyle } from '@angular/common';
import { baseApi, domainRegex, domainBase, base } from '../../_shared/constant.service';
import { Title } from '@angular/platform-browser';
import { Observable, firstValueFrom, lastValueFrom } from 'rxjs';
import { PageTitleService } from '../../_shared/service/page-title-service';
import { ServerDate, compileTpl, createProxy, deepMerge, getQuery, loadScript } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';
import { SwPush } from '@angular/service-worker';
import { PushService } from '../../_shared/service/push.service';
import { filter, first, take, tap, switchMap } from 'rxjs/operators';
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
  imports: [RouterLink, FaIconComponent, RegisterComponent, PageTitleComponent, NgbCollapse,
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
  private destroyRef = inject(DestroyRef); // Used for modern subscription cleanup

  // Signals for state management
  appLoading = signal<boolean>(false);
  validPath = computed(() => !!this.app());
  offline = signal<boolean>(false);
  sidebarActive = signal<boolean>(false);
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
  appConfig: any = this.runService.appConfig;
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
  isDev = computed(() => this.app()?.email?.includes(this.userService.getActualUser()?.email) ?? false);
  screen = signal<any>(null);

  // --- Cookie Banner Signals ---
  private readonly cookieConsentName = 'app_cookie_consent';
  
  // Tracks if the user has already made a choice (either accepted or rejected)
  cookieConsentStatus = signal<boolean>(false); 

  // Automatically calculates if the banner should be shown based on app config AND user consent
  showCookieBanner = computed(() => {
    const hasBannerConfig = !!this.app()?.x?.cookieBanner;
    const hasConsented = this.cookieConsentStatus();
    return hasBannerConfig && !hasConsented;
  });



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
  $param$: any = {};
  accessToken: string = '';
  pushSub: any;
  actualSub: any;
  pushSubError: any;
  appUrl: string = '';

  _this = createProxy({}, () => this.cdr.markForCheck());

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed())
      .subscribe((online) => this.offline.set(!online));
      
    this.swPush.notificationClicks
      .pipe(takeUntilDestroyed())
      .subscribe((arg) => {
        console.log(
          'Action: ' + arg.action,
          'Notification data: ' + arg.notification.data,
          'Notification data.url: ' + arg.notification.data.url,
          'Notification data.body: ' + arg.notification.body
        );
      });
  }

  ngOnInit() {

    // Check if the user already has the cookie set
    this.cookieConsentStatus.set(!!this.getCookie(this.cookieConsentName));

    window.localStorage.setItem('noframe', String(this.frameless()));

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

    // Flattened the nested subscriptions using switchMap
    this.userService.getUser().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((user) => {
        this.user.set(user);
        this.userService.setUser(user); // Preserving V2 specific setting
        this.runService.$user.set(user);
        // console.log("loaded user", user)
      }),
      switchMap(() => this.route.params)
    ).subscribe((params: Params) => {
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

    this.pageTitleService.openAnnounced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(opened => {
        this.sidebarActive.set(opened)
      });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
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

  // toggleNav(index: number): void {
  //   const currentState = this.navToggle();
  //   this.navToggle.set({ ...currentState, [index]: !currentState[index] });
  // }

  toggleNav(index: number) {
    if (this.app()?.layout === 'topnav') {
      // Top Nav Mode: Exclusive dropdown behavior (closes others)
      const isCurrentlyOpen = this.navToggle()[index];
      this.navToggle.set(isCurrentlyOpen ? {} : { [index]: true });
    } else {
      // Side Menu Mode: Independent accordion behavior
      this.navToggle.update(state => ({
        ...state,
        [index]: !state[index]
      }));
    }
  }

  saveAppUser(selectedRoles) {
    var payload = {
      email: this.user().email,
      groups: selectedRoles,
      name: this.user.name,
      autoReg: false
    }
    this.runService.regAppUser(this.app().id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.user.set(res.user);
        this.userService.setUser(res.user);
        this.runService.$user.set(res.user);
        if (!this.frameless()) {
          this.getNavis(this.app().id, this.user().email);
          this.getNaviData(this.app().id, this.user().email);
        }
      });
  }

  checkPush(app) {
    if (app.canPush) {
      this.swPush.subscription
        .pipe(
          take(1),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(sub => {
          if (sub) {
            this.actualSub = sub;
            this.pushService.checkPush(sub.endpoint)
              .pipe(takeUntilDestroyed(this.destroyRef))
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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => this.pushSub = res);
      })
      .catch(err => { this.pushSubError = { err: err }; console.log(err) });

  }

  onceDone() {
    this.runService.onceDone(this.app().id, this.user().email, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
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
              .pipe(takeUntilDestroyed(this.destroyRef))
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
              replaceUrl: true 
            });
          }

          this.appLoading.set(false);
          this.checkPush(this.app());
          await this.initScreen(this.app().f);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
          this.app.set(res);
          this.runService.$app.set(res);

          this.runService.getAppUserByEmail(id, { email: this.user().email })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(appUserList => {
              this.appUserList.set(appUserList);
            });

          if (res.layout == 'topnav') {
            this.navToggle.set({});
          }
          if (res.once) {
            this.runService.getRunScreen(res.once)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(screen => this.screen.set(screen));
          }
          this.checkPush(res);
          await this.initScreen(res.f);

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

          this.appLoading.set(false);

        },
        error: (err) => this.appLoading.set(false)
      })
  }

  getNavis(id, email) {
    this.runService.getNavis(id, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    } catch (e) { this.logService.log(`{start-${f?.code}-precheck}-${e.message}`) }
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

  // --- DRY Caching and Context Engine ---

  private compiledEvalCache = new Map<string, Function>();
  private preCache = new Map<string, Function>();

  private executeEval(code: string, bindings: Record<string, any>, cache: Map<string, Function>) {
    if (!code) return undefined;
    
    const argNames = Object.keys(bindings);
    const cacheKey = `${argNames.join(',')}_${code}`;
    
    let fn = cache.get(cacheKey);
    if (!fn) {
      fn = new Function(...argNames, `return ${code}`);
      cache.set(cacheKey, fn);
    }
    
    return fn(...Object.values(bindings));
  }

  getEvalContext = (isPassive: boolean = false, additionalParams: any = {}) => {
    // Properties shared across ALL evaluations
    const passive = {
      $app$: this.app(),
      $user$: this.user(),
      $conf$: this.runService?.appConfig,
      $this$: this._this,
      $param$: this.$param$,
      ServerDate,
      $base$: this.base,
      $baseUrl$: this.baseUrl(),
      $baseApi$: this.baseApi,
      $token$: this.accessToken,
      ...additionalParams
    };

    if (isPassive) return passive;

    // Properties only needed for active evaluation (_eval)
    return {
      ...passive,
      setTimeout: this._setTimeout,
      setInterval: this._setInterval,
      $_: {},
      $: {},
      $prev$: {},
      $http$: this.httpGet,
      $post$: this.httpPost,
      $endpoint$: this.endpointGet,
      $loadjs$: this.loadScript,
      $digest$: this.$digest$,
      $log$: this.log,
      $update$: this.updateField,
      $updateLookup$: this.updateLookup,
      $toast$: this.$toast$,
      dayjs,
      echarts: null,
      $live$: this.runService?.$live$(this.liveSubscription(), this.$digest$),
      $merge$: deepMerge,
      $web$: this.hybridWeb,
      $go: null,
      $pop: null,
      $q$: this.$q,
      $showNav$: this.openNav
    };
  }

  _pre = (v: string) => {
    const bindings = this.getEvalContext(true, { 
      $navi$: this.naviData(), 
      $navis$: this.navis(), 
      $badge$: this.badge 
    });
    return this.executeEval(v, bindings, this.preCache);
  }

  _eval = async (v: string) => {
    const bindings = this.getEvalContext(false);
    return this.executeEval(v, bindings, this.compiledEvalCache);
  }

  // --- End DRY Engine ---

  private wrapObservable<T>(obs: Observable<T>): Observable<T> & PromiseLike<T> {
    const thenable = obs as any;

    // We attach a .then() method to the Observable
    // This makes 'await' treat the Observable like a Promise
    thenable.then = (resolve: any, reject: any) => 
      firstValueFrom(obs).then(resolve, reject);

    return thenable;
  }

  private _hybridWebCache: any = null;
  get hybridWeb() {
    if (!this._hybridWebCache) {
      this._hybridWebCache = {
        get: (url: string, opts?: any) => this.wrapObservable(this.http.get(url, opts)),
        post: (url: string, body: any, opts?: any) => this.wrapObservable(this.http.post(url, body, opts)),
        put: (url: string, body: any, opts?: any) => this.wrapObservable(this.http.put(url, body, opts)),
        delete: (url: string, opts?: any) => this.wrapObservable(this.http.delete(url, opts)),
      };
    }
    return this._hybridWebCache;
  }

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data,'start');
    } catch (e) {
      this.logService.log(`{start-compiletpl}-${e.message}`)
    }
    return f;
  }

  async initScreen(js) {
    let res = undefined;
    let jsTxt = this.compileTpl(js, { $param$: this.$param$, $this$: this._this, $user$: this.user(), $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl(), $baseApi$: baseApi })
    try {
      res = await this._eval(jsTxt);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
    } catch (e) { this.logService.log(`{start-${this.app().title}-initNavi}-${e.message}`) }
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
    const email = this.userService.getActualUser()?.email;
    return this.app()?.email?.includes(email) ?? false;
  });

  dismissAllModal() {
    this.modalService.dismissAll('');
  }

  // --- Cookie Management Methods ---
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  private setCookie(name: string, value: string, days: number) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    }
    document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax`;
  }

  acceptCookies() {
    this.setCookie(this.cookieConsentName, 'accepted', 365); 
    this.cookieConsentStatus.set(true); 
  }

  rejectCookies() {
    this.setCookie(this.cookieConsentName, 'rejected', 365);
    this.cookieConsentStatus.set(true);
  }

  // Closes the banner without setting a cookie (it will reappear on next refresh)
  dismissCookies() {
    this.cookieConsentStatus.set(true); 
  }

  ngOnDestroy() {
    Object.keys(this.liveSubscription()).forEach(key => this.liveSubscription()[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(i => clearInterval(i));
    this.timeoutList.forEach(i => clearTimeout(i));

    // Global cleanup
    delete (window as any)._conf;
    delete (window as any)._this_start;
  }
}