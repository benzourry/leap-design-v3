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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
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
export class TilesComponent implements OnInit {

  badge = signal<any>({});
  app = computed<any>(() => this.runService.$app());
  searchText: string = "";

  public runService = inject(RunService)
  private route = inject(ActivatedRoute)
  private utilityService = inject(UtilityService)
  private modalService = inject(NgbModal)

  private location = inject(PlatformLocation)
  private logService = inject(LogService)

  private cdr = inject(ChangeDetectorRef)
  private toastService = inject(ToastService)

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
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));

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
      .subscribe((params: Params) => {
        this.$param$ = params;
      });

    this.runPre();
  }

  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  getStart(id) {
    if (id) {
      this.runService.getStartBadge(id, this.user().email)
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
    } catch (e) { this.logService.log(`{tiles-${f.code}-precheck}-${e}`) }
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


  _eval = (v) => new Function('$app$', '$navi$', '$badge$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$', '$param$', 'ServerDate', '$log$', '$toast$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', '$token$', `return ${v}`)
    (this.app(), this.naviData(), this.badge(), this.user(), this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this._this, this.loadScript, this.$param$, ServerDate, this.log, this.$toast$, this.base, this.baseUrl(), this.baseApi, dayjs, ServerDate, this.accessToken);

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(() => this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(() => this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app()?.id, params, callback, error).pipe(tap(() => this.$digest$())));



}
