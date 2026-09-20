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
import { lastValueFrom } from 'rxjs';
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
import { ThemeToggleComponent } from "../_component/theme-toggle.component";

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FaIconComponent, RegisterComponent, PageTitleComponent, NgbCollapse,
    NgClass, NgStyle, RouterLinkActive, RouterOutlet, SafePipe, IconSplitPipe, ThemeToggleComponent
  ]
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
  private destroyRef = inject(DestroyRef);

  // --- Signals & Computed States ---
  appLoading = signal<boolean>(false);
  app = signal<any>(null);
  user = signal<any>(null);
  navis = signal<any[]>([]);
  sideNavGroups = computed(() => this.navis().filter(g => g.x?.type !== 'bottom'));
  bottomNavGroups = computed(() => this.navis().filter(g => g.x?.type === 'bottom'));
  naviData = signal<any>(null);
  badge = signal<any>({});
  appUserList = signal<any[]>([]);
  liveSubscription = signal<Record<string, any>>({});
  preGroup = signal<Record<string, boolean>>({});
  preItem = signal<Record<string, boolean>>({});
  navToggle = signal<Record<number, boolean>>({});
  offline = signal<boolean>(false);
  sidebarActive = signal<boolean>(false);
  pushDismissed = signal(localStorage.getItem('pushDismissed') === '1');
  darkMode = signal<boolean>(false);
  screen = signal<any>(null);
  mailboxBadge = signal<number>(0);
  preurl = signal<string>('');
  
  // Computed values
  validPath = computed(() => !!this.app());
  lang = computed(() => this.app()?.x?.lang);
  startPage = computed(() => this.app()?.startPage ?? 'start');
  currentPath = signal<string>(this.router.url.split('?')[0]);
  isStartPage = computed(() => {
    const start = this.startPage();
    const current = this.currentPath();
    // Checks if the current URL ends with the start page
    return current.endsWith('/' + start) || current === '/' + start;
  });
  isPeekExpanded = signal<boolean>(false);
  activeBottomNavIndex = signal<number>(0);

  frameless = computed(() => (getQuery('noframe') || localStorage.getItem('noframe')) === 'true');
  isDev = computed(() => this.app()?.email?.includes(this.userService.getActualUser()?.email) ?? false);
  showEdit = this.isDev; // Removed duplicate computation
  
  maintenance = computed(() => {
    const app = this.app();
    const path = window.location.host;
    return !this.editMode && !!app && !app.live && !path.includes('--dev');
  });

  baseUrl = computed(() => `${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}/#${this.preurl()}`);

  // --- Cookie Banner Signals ---
  private readonly cookieConsentName = 'app_cookie_consent';
  cookieConsentStatus = signal<boolean>(false); 
  showCookieBanner = computed(() => !!this.app()?.x?.cookieBanner && !this.cookieConsentStatus());

  // --- Constants & Variables ---
  readonly baseApi = baseApi;
  readonly base = base;
  readonly VAPID_PUBLIC_KEY = 'BIRiQCpjtaORtlvwZ7FzFkf8V799iGvEX1kQtO86y-BdiGpAMvXN4UDU1DWEqrpPEAiDDVilG8WKk62NjFc1Opo';

  get appConfig(): any { return this.runService.appConfig; }

  editMode: boolean = false;
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
      .subscribe(online => this.offline.set(!online));
      
    this.swPush.notificationClicks
      .pipe(takeUntilDestroyed())
      .subscribe(arg => {
        console.log('Action: ' + arg.action, 'Notification data:', arg.notification.data);
      });
  }

  ngOnInit() {
    this.cookieConsentStatus.set(!!this.getCookie(this.cookieConsentName));
    window.localStorage.setItem('noframe', String(this.frameless()));
    this.accessToken = this.userService.getToken();

    Reflect.defineProperty(window, '_conf', { get: () => this.appConfig, configurable: true });
    Reflect.defineProperty(window, '_this_start', { get: () => this._this, configurable: true });

    // Flattened user > params fetching
    this.userService.getUser().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((user) => {
        this.user.set(user);
        this.userService.setUser(user);
        this.runService.$user.set(user);
      }),
      switchMap(() => this.route.params)
    ).subscribe((params: Params) => {
      this.$param$ = params;
      this.appId = params['appId'];
      
      if (this.appId) {
        this.preurl.set(`/run/${this.appId}`);
        this.runService.$preurl.set(this.preurl());
        this.editMode = true;
        this.getApp(this.appId);
        this.getStart(this.appId);
      } else {
        this.getAppByPath(this.getPath());
      }
    });

    this.pageTitleService.openAnnounced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(opened => this.sidebarActive.set(opened));

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.isPeekExpanded.set(false);
        // Force the browser to drop focus from the bottom nav!
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        if (this.router.url === '/' || this.router.url === '') {
          const startPage = this.app()?.startPage || 'start';
          if (this.router.url !== `/${startPage}`) {
            this.router.navigate([startPage], {
              relativeTo: this.route,
              queryParams: this.route.snapshot.queryParams,
              replaceUrl: true
            });
          }
        }
      });
  }

  // touchStartY:number = 0;

  // onBottomSwipeStart(event: TouchEvent){
  //   this.touchStartY = event.changedTouches[0].screenY;
  // }

  // onBottomSwipeEnd(event: TouchEvent, panel: HTMLElement){
  //   const touchEndY = event.changedTouches[0].screenY;
  //   const swipeDistance = this.touchStartY - touchEndY;
  //   if (swipeDistance>20){
  //     panel.focus()
  //   }else if(swipeDistance<-20){
  //     panel.blur()
  //   }
  // }

  
  onBottomNavScroll(event: Event) {
    const target = event.target as HTMLElement;
    // Calculate which item is currently centered
    const index = Math.round(target.scrollLeft / target.clientWidth);
    if (this.activeBottomNavIndex() !== index) {
      this.activeBottomNavIndex.set(index);
    }
  }

  // --- Unified App Initialization ---
  private async processAppResponse(res: any, isByPath: boolean = false) {
    this.app.set(res);
    dayjs.locale(this.lang() === 'ms' ? 'ms-my' : 'en');
    this.runService.$app.set(res);
    
    // Set Title (Fix: Now applies to both path and ID fetches)
    this.titleService.setTitle(res.title);

    const email = this.user()?.email;

    if (!this.frameless()) {
      this.getNavis(res.id, email);
      this.getNaviData(res.id, email);
    }

    if (res.layout === 'topnav') this.navToggle.set({});

    if (res.once) {
      this.runService.getRunScreen(res.once)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(screen => this.screen.set(screen));
    }

    this.runService.countUnreadNotification(res.id, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(badge => this.mailboxBadge.set(badge));

    this.checkPush(res);

    // Initial routing logic
    let currentUrl = this.router.url.split('?')[0].replace(this.preurl(), '').replace(/\//g, '');
    if (!currentUrl) {
      const target = res.startPage ? [res.startPage] : ['start'];
      this.router.navigate(target, { 
        relativeTo: this.route, 
        queryParams: this.route.snapshot.queryParams,
        replaceUrl: true 
      });
    }

    await this.initScreen(res.f);
    this.appLoading.set(false);
  }

  getAppByPath(path: string) {
    this.appLoading.set(true);
    this.runService.getRunAppByPath(path, { email: this.user()?.email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.processAppResponse(res, true),
        error: () => this.appLoading.set(false)
      });
  }

  getApp(id: number) {
    this.appLoading.set(true);
    this.runService.getRunApp(id, { email: this.user()?.email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.runService.getAppUserByEmail(id, { email: this.user()?.email })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(appUserList => this.appUserList.set(appUserList));
          
          this.processAppResponse(res, false);
        },
        error: () => this.appLoading.set(false)
      });
  }

  getStart(id: number) {
    if (!id) return;
    this.runService.getStartBadge(id, this.user()?.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => this.badge.set(res));
  }

  // --- Push Notifications ---
  dismissPush() {
    localStorage.setItem("pushDismissed", "1");
    this.pushDismissed.set(true);
  }

  checkPush(app: any) {
    if (!app?.canPush) return;
    this.swPush.subscription
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(sub => {
        if (sub) {
          this.actualSub = sub;
          this.pushService.checkPush(sub.endpoint)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => this.pushSub = res);
        }
      });
  }

  subscribePush() {
    this.swPush.requestSubscription({ serverPublicKey: this.VAPID_PUBLIC_KEY })
      .then(sub => {
        this.actualSub = sub;
        this.pushService.subscribePush(this.user().id, sub)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => this.pushSub = res);
      })
      .catch(err => { this.pushSubError = { err }; console.log(err); });
  }

  // --- Navigation & Menus ---
  toggleNav(groupId: number) {
    if (this.app()?.layout === 'topnav') {
      const isCurrentlyOpen = this.navToggle()[groupId];
      this.navToggle.set(isCurrentlyOpen ? {} : { [groupId]: true });
    } else {
      this.navToggle.update(state => ({ ...state, [groupId]: !state[groupId] }));
    }
  }

  getNavis(id: number, email: string) {
    this.runService.getNavis(id, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.navis.set(res);
        this.runService.$navis.set(res);
        this.runPre();
        
        const naviObj: any = {};
        res.forEach(n => {
          n.items.forEach(i => {
            if (!naviObj[i.type]) naviObj[i.type] = {};
            naviObj[i.type][i.screenId] = this.preItem()[i.id];
          });
        });
        this.runService.$naviPerm.set(naviObj);
      });
  }

  getNaviData(id: number, email: string) {
    this.runService.getNaviData(id, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.naviData.set(res);
        this.runService.$naviData.set(res);
        this.runPre();
      });
  }

  hideSb() { setTimeout(() => this.sidebarActive.set(false), 300); }
  
  toggleDark() { this.darkMode.set(!this.darkMode()); }

  // --- User Management ---
  saveAppUser(selectedRoles: any) {
    const payload = {
      email: this.user()?.email,
      groups: selectedRoles,
      name: this.user()?.name, // Fix: Use signal value correctly
      autoReg: false
    };
    
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

  onceDone() {
    this.runService.onceDone(this.app().id, this.user()?.email, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.user.set(res);
          this.userService.setUser(res);
          this.runService.$user.set(res);
        },
        error: () => {
          this.user.update(u => ({ ...u, once: true }));
          this.userService.setUser(this.user());
        }
      });
  }

  logout() { this.userService.logout(); }

  // --- Utilities & Expressions ---
  getPath() {
    if (window.location.host.indexOf(domainBase) > -1) {
      return 'path:' + window.location.host.match(domainRegex)[1];
    }
    return 'domain:' + window.location.hostname;
  }

  designUrl = computed(() => {
    const split = location.hash.split('/');
    const appId = split[2]?.replace(/\D/g, '');
    if (!appId) return { url: '', query: undefined };

    const type = split[3];
    const id = split[4];

    if (type) {
      if (['form', 'dataset', 'dashboard', 'screen'].includes(type)) return { url: `/design/${appId}/ui/${type}`, query: { id } };
      if (['profile', 'mailbox'].includes(type)) return { url: `/design/${appId}/`, query: undefined };
      if (['start'].includes(type)) return { url: `/design/${appId}/ui/navi`, query: undefined };
      if (['webui','web'].includes(type)) return { url: `/design/${appId}/lambda`, query: undefined };
      return { url: `/design/${appId}/${type}`, query: { id } };
    }
    return { url: `/design/${appId}/`, query: undefined };
  });

  preCheck(f: any) {
    let res = undefined;
    try {
      if (f.pre) {
        res = this._pre(f.pre.trim());
      }
    } catch (e) { this.logService.log(`{start-[${f?.title}]-precheck}-${e.message}`); }
    return !f.pre || res;
  }

  // runPre(): void {
  //   const updatedPreGroup = { ...this.preGroup() };
  //   const updatedPreItem = { ...this.preItem() };
    
  //   // Fix: Preserve existing toggle state so $digest doesn't close active tabs
  //   const updatedNavToggle = { ...this.navToggle() }; 
  //   const isEmpty = Object.keys(updatedNavToggle).length === 0;
  //   let firstActiveSet = !isEmpty;

  //   this.navis()?.forEach((group, index) => {
  //     updatedPreGroup[group.id] = this.preCheck(group);

  //     if (!firstActiveSet && updatedPreGroup[group.id]) {
  //       firstActiveSet = true;
  //       updatedNavToggle[index] = true;
  //     }

  //     group.items?.forEach((item) => {
  //       updatedPreItem[item.id] = this.preCheck(item);
  //     });
  //   });

  //   this.preGroup.set(updatedPreGroup);
  //   this.preItem.set(updatedPreItem);
  //   this.navToggle.set(updatedNavToggle);
  // }

  runPre(): void {
    const updatedPreGroup = { ...this.preGroup() };
    const updatedPreItem = { ...this.preItem() };
    
    // Preserve existing toggle state so $digest doesn't close active tabs
    const updatedNavToggle = { ...this.navToggle() }; 
    const isEmpty = Object.keys(updatedNavToggle).length === 0;
    let firstActiveSet = !isEmpty;

    this.navis()?.forEach((group) => {
      updatedPreGroup[group.id] = this.preCheck(group);

      // FIX: Use group.id instead of index, and ensure bottom navs don't steal the active state
      if (!firstActiveSet && updatedPreGroup[group.id]) {  //&& group.x?.type !== 'bottom'
        firstActiveSet = true;
        updatedNavToggle[group.id] = true;
      }

      group.items?.forEach((item) => {
        updatedPreItem[item.id] = this.preCheck(item);
      });
    });

    this.preGroup.set(updatedPreGroup);
    this.preItem.set(updatedPreItem);
    this.navToggle.set(updatedNavToggle);
  }

  // --- Dynamic Eval Logic ---
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

    return {
      ...passive,
      setTimeout: this._setTimeout,
      setInterval: this._setInterval,
      $_: {}, $: {}, $prev$: {},
      $http$: this.httpGet,
      $post$: this.httpPost,
      $endpoint$: this.endpointGet,
      $loadjs$: this.loadScript,
      $digest$: this.$digest$,
      $log$: this.log,
      $update$: this.updateField,
      $updateLookup$: this.updateLookup,
      $toast$: this.$toast$,
      dayjs, echarts: null,
      $live$: this.runService?.$live$(this.liveSubscription(), this.$digest$),
      $merge$: deepMerge,
      $web$: this.runService.web,
      $go: null, $pop: null, $q$: this.$q,
      $showNav$: this.openNav
    };
  }

  _pre = (v: string) => {
    const bindings = this.getEvalContext(true, { 
      $navi$: this.naviData(), 
      $navis$: this.navis(), 
      $badge$: this.badge() 
    });
    return this.executeEval(v, bindings, this.preCache);
  }

  _eval = async (v: string) => {
    return this.executeEval(v, this.getEvalContext(false), this.compiledEvalCache);
  }

  compileTpl(html: string, data: any) {
    try {
      return compileTpl(html, data, 'start');
    } catch (e) {
      this.logService.log(`{start-compiletpl}-${e.message}`);
      return "";
    }
  }

  async initScreen(js: string) {
    if (!js) return;
    let res = undefined;
    const jsTxt = this.compileTpl(js, { 
      $param$: this.$param$, $this$: this._this, $user$: this.user(), 
      $conf$: this.appConfig, $base$: base, $baseUrl$: this.baseUrl(), $baseApi$: baseApi 
    });
    
    try {
      res = await this._eval(jsTxt);
    } catch (e) { 
      this.logService.log(`{start-${this.app()?.title}-initNavi}-${e.message}`); 
    }
    this.runPre();
    return res;
  }

  httpGet = (url: string, callback: any, error: any) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url: string, body: any, callback: any, error: any) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code: string, params: any, callback: any, error: any) => lastValueFrom(this.runService.endpointGet(code, this.app()?.id, params, callback, error).pipe(tap(() => this.$digest$())));

  loadScript = loadScript;
  $toast$ = (content: any, opt: any) => this.toastService.show(content, opt);
  log = (log: any) => this.logService.log(JSON.stringify(log));

  $digest$ = () => {
    this.runService.$startTimestamp.set(Date.now());
    this.runPre();
    this.cdr.detectChanges();
  }

  elMap: any = {};
  $q = (el: string) => {
    if (!this.elMap[el]) this.elMap[el] = document.querySelector(el);
    return this.elMap[el];
  }

  openNav = (opened: boolean) => this.pageTitleService.open(opened);

  updateField = (entryId: number, value: any, callback: any, error: any) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.appId).pipe(
      tap({ next: callback, error }),
      tap(() => this.runService.$startTimestamp.set(Date.now())), 
      first()
    ));
  }

  updateLookup = (entryId: number, value: any, callback: any, error: any) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.appId).pipe(
      tap({ next: callback, error }),
      tap(() => this.runService.$startTimestamp.set(Date.now())), 
      first()
    ));
  }

  timeoutList: any[] = [];
  _setTimeout = (functionRef: Function, delay: number, ...param: any[]) => {
    const timeoutId = setTimeout(() => { functionRef(); this.$digest$(); }, delay, ...param);
    this.timeoutList.push(timeoutId);
  }

  intervalList: any[] = [];
  _setInterval = (functionRef: Function, delay: number, ...param: any[]) => {
    const intervalId = setInterval(() => { functionRef(); this.$digest$(); }, delay, ...param);
    this.intervalList.push(intervalId);
  }

  dismissAllModal() { this.modalService.dismissAll(''); }

  // --- Cookies ---
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop()?.split(';').shift() || null : null;
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

  dismissCookies() { this.cookieConsentStatus.set(true); }

  ngOnDestroy() {
    Object.values(this.liveSubscription()).forEach(sub => sub.unsubscribe());
    this.intervalList.forEach(clearInterval);
    this.timeoutList.forEach(clearTimeout);
    this.runService.appConfig = {};
    // Global cleanup
    const confDeleted = Reflect.deleteProperty(window, '_conf');
    const thisStartDeleted = Reflect.deleteProperty(window, '_this_start');

    // Fallback if browser/scope constraints prevent property deletion
    if (!confDeleted) (window as any)._conf = undefined;
    if (!thisStartDeleted) (window as any)._this_start = undefined;

  }
}