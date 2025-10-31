// Copyright (C) 2018 Razif Baital
// 
// This file is part of Instant App.
// 
// Instant App is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// Instant App is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Instant App.  If not, see <http://www.gnu.org/licenses/>.

import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, model, signal } from '@angular/core';
import { LogService } from '../../_shared/service/log.service';
import dayjs from 'dayjs';
import { base, baseApi } from '../../_shared/constant.service';
import { ChartComponent } from '../chart/chart.component';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { RunService } from '../_service/run.service';
import { ServerDate } from '../../_shared/utils';
import { PageTitleComponent } from '../_component/page-title.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageTitleComponent, FaIconComponent, NgClass, ChartComponent]
})
export class DashboardComponent implements OnInit {

  private runService = inject(RunService);
  private logService = inject(LogService);

  dashboard = signal<any>(null);
  user = computed<any>(() => this.runService.$user());
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  $baseUrl$ = computed<any>(() => this.runService.$baseUrl());
  baseApi: string = baseApi;
  base: string = base;
  param = input<any>({});
  _this = {};

  asComp = input<boolean>(false);
  hideTitle = input<boolean>(false);

  dashboardId = input<number>();

  _dashboardId: number;

  loading = signal<boolean>(false);

  max = signal<number>(null);
  maxState = signal<boolean>(false);
  constructor() {
    effect(() => {
      const currentDashboardId = this.dashboardId();
      if (this._dashboardId !== currentDashboardId && currentDashboardId) {
        this._dashboardId = currentDashboardId;
        this.getDashboard(currentDashboardId);
      }
    })

  }

  ngOnInit() {
  }

  // Refactored userUnauthorized as computed
  userUnauthorized = computed(() => {
    const dashboard = this.dashboard();
    const user = this.user();

    if (!dashboard || !user) {
      return false; // Default to false if dashboard or user is not available
    }

    const intercept = dashboard.accessList?.filter((v) =>
      Object.keys(user.groups || {}).includes(v + '')
    );

    return dashboard.accessList?.length > 0 && intercept.length === 0;
  });

  getDashboard(id) {
    this.loading.set(true);
    this.runService.getRunDashboard(id)
      .subscribe({
        next: (res) => {
          this.dashboard.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.logService.log(`Error fetching dashboard: ${err.message}`);
          this.loading.set(false);
        },
      });
  }

  enterMaxState(id) {
    this.maxState.set(true);
    this.max.set(id);
  }

  exitMaxState() {
    this.maxState.set(false);
    this.max.set(null);
  }

  preCheck(chart, dataset) {
    let res = undefined;
    try {
      if (chart.x?.pre) {
        let pre = chart.x?.pre.trim();
        res = this._eval(chart, dataset, pre);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this._user);
      }
    } catch (e) { this.logService.log(`{chart-${chart.title}-precheck}-${e}`) }
    return !chart.x?.pre || res;
  }

  _eval = (chart, dataset, v) => new Function('$app$', '$chart$', '$dataset$', '$eachValue$', '$eachName$', '$user$', '$conf$', '$this$', '$param$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', `return ${v}`)
    (this.app(), chart, dataset, (fn) => this.eachValue(chart, dataset, fn), (fn) => this.eachName(chart, dataset, fn), this.user(), this.runService?.appConfig, this._this, this.param(), this.base, this.$baseUrl$(), this.baseApi, dayjs, ServerDate);

  eachValue = ($chart$, $dataset$, fn) => { // $eachValue$($chart$,$dataset$, function(res){})
    if ($chart$.series) {
      let data = $dataset$.splice(1);
      return $dataset$.concat(data.map(val => {
        let s = val.splice(1);
        return val.concat(s.map(e => fn(e)));
      }));
    } else {
      return $dataset$.map(val => { val.value = fn(val.value); return val; })
    }
  }

  eachName = ($chart$, $dataset$, fn) => {
    if ($chart$.series) {
      $dataset$[0].map(e => fn(e));
      return $dataset$;
    } else {
      return $dataset$.map(val => { val.name = fn(val.name); return val; })
    }
  }

  printReport() {
    window.print();
  }

}
