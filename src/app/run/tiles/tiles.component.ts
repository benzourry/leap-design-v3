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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink } from '@angular/router';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgStyle, DatePipe } from '@angular/common';
import { ServerDate, compileTpl, createProxy, loadScript } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';
import { ToastService } from '../../_shared/service/toast-service';
import { base, baseApi } from '../../_shared/constant.service';
import dayjs from 'dayjs';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { lastValueFrom, tap } from 'rxjs';
import { PageTitleComponent } from '../_component/page-title.component';
import { RunService } from '../_service/run.service';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-tiles',
  templateUrl: './tiles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../assets/css/start.css', './tiles.component.scss'],
  imports: [PageTitleComponent, FormsModule, NgStyle, RouterLinkActive, 
    RouterLink, FaIconComponent, FilterPipe, DatePipe, IconSplitPipe]
})
export class TilesComponent implements OnInit, OnDestroy {

  badge = signal<any>({});
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  searchText: string = "";

  public runService = inject(RunService)
  private route = inject(ActivatedRoute)
  private utilityService = inject(UtilityService)
  private modalService = inject(NgbModal)

  private location = inject(PlatformLocation)
  private logService = inject(LogService)

  private cdr = inject(ChangeDetectorRef)
  private toastService = inject(ToastService)
  private destroyRef = inject(DestroyRef); // Used for modern subscription cleanup

  baseApi: string = baseApi;
  base: string = base;


  offline = signal<boolean>(false);
  naviData = computed(() => this.runService.$naviData());
  navis = computed(() => this.runService.$navis());
  preurl = computed(() => this.runService.$preurl());
  baseUrl = computed(() => this.runService.$baseUrl());

  user = computed<any>(() => this.runService.$user());
  $param$ = {};

  appConfig: any = this.runService.appConfig;
  
  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed())
      .subscribe(online => this.offline.set(!online));

    effect(() => {
      this.runService.$startTimestamp();
      this.init();
    })
  }

  init() {
    this.runPre();
  }

  ngOnInit() {

    this.appConfig = this.runService.appConfig;

    Object.defineProperty(window, '_this_tiles', {
      get: () => this._this,
      configurable: true,   // so you can delete it later 
      // writable: true,
    });  
    

    this.init();
    this.getStart(this.app()?.id);
    
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params: Params) => {
        this.$param$ = params;
      });

    this.runPre();
  }

  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  getStart(id) {
    if (id) {
      this.runService.getStartBadge(id, this.user().email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(res => {
          this.badge.set(res);
        })
    }
  }


  _this:any = createProxy({},()=>this.cdr.markForCheck());

  accessToken: string = "";

  compileTpl = compileTpl;

  loadScript = loadScript;

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  log = (log) => this.logService.log(JSON.stringify(log));

  preCheck(f) {
    let res = undefined;
    try {
      if (f.pre) {
        let pre = f.pre.trim();
        res = this._eval(pre);
      }
    } catch (e) { this.logService.log(`{tiles-${f.code}-precheck}-${e.message}`) }
    return !f.pre || res;
  }

  preGroup = signal<any>({})
  preItem = signal<any>({})
  runPre() {
    let preItem = {};
    let preGroup = {};
    this.navis()?.forEach(group => {
      preGroup[group.id] = this.preCheck(group);
      group.items?.forEach(item => {
        preItem[item.id] = this.preCheck(item);
      })
    })
    this.preGroup.set(preGroup);
    this.preItem.set(preItem);
  }

  $digest$ = () => {
    this.runPre();
    this.cdr.detectChanges()
  }

  // --- DRY Caching and Context Engine ---

  private compiledEvalCache = new Map<string, Function>();

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

  getEvalContext = () => {
    return {
      $app$: this.app(),
      $navi$: this.naviData(),
      $badge$: this.badge(),
      $user$: this.user(),
      $conf$: this.runService?.appConfig,
      $http$: this.httpGet,
      $post$: this.httpPost,
      $endpoint$: this.endpointGet,
      $this$: this._this,
      $loadjs$: this.loadScript,
      $param$: this.$param$,
      $log$: this.log,
      $toast$: this.$toast$,
      $base$: this.base,
      $baseUrl$: this.baseUrl(),
      $baseApi$: this.baseApi,
      dayjs,
      ServerDate,
      $token$: this.accessToken
    };
  }

  _eval = (v: string) => {
    const bindings = this.getEvalContext();
    return this.executeEval(v, bindings, this.compiledEvalCache);
  }

  // --- End DRY Engine ---

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app()?.id, params, callback, error).pipe(tap(() => this.$digest$())));

  ngOnDestroy(): void {    
    delete (window as any)._this_tiles;
  }

}