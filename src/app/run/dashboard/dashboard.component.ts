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

import { Component, OnInit, effect, input, model } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, Params } from '@angular/router';
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
    imports: [PageTitleComponent, FaIconComponent, NgClass, ChartComponent]
})
export class DashboardComponent implements OnInit {

  dashboard: any;
  user: any;
  app: any;
  $baseUrl$: string;
  baseApi: string = baseApi;
  base: string = base;
  $param$: any = {};

  asComp = input<boolean>(false);
  hideTitle = input<boolean>(false);
  
  dashboardId = model<number>();

  _dashboardId: number;

  constructor(private userService: UserService, public runService: RunService,
    private logService: LogService, private route: ActivatedRoute) { 
      effect(()=>{

        if (this._dashboardId != this.dashboardId()){
          this._dashboardId = this.dashboardId();
          if (this._dashboardId) {
            this.getDashboard(this._dashboardId);
          }
        }
      })
    }

  ngOnInit() {
    this.app = this.runService.$app();
    this.$baseUrl$ = this.runService.$baseUrl();
    this.userService.getUser().subscribe((user) => {
      this.user = user;
      
      if (this.dashboardId()){
        this.getDashboard(this.dashboardId())
      }else{
        this.route.params
          .subscribe((params: Params) => {
            const id = params['dashboardId'];
            if (id) {
              this.getDashboard(id);
            }
          });        
      }


      this.route.queryParams
        .subscribe((params: Params) => {
          this.$param$ = params;
        });

    });
  }

  loading: boolean;
  userUnauthorized: boolean;
  getDashboard(id) {
    this.loading = true;
    this.userUnauthorized = false;
    this.runService.getDashboardBasic(id)
      .subscribe(res => {
        this.dashboard = res;
        this.loading = false;

        let intercept = this.dashboard.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
        if (this.dashboard.accessList?.length > 0 && intercept.length == 0) {
            // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
            this.userUnauthorized = true;
        }
        // if (this.dashboard.access && !this.user.groups[this.dashboard.access.id] && !this.app?.id) {
        //   this.userUnauthorized = true;
        // }

      });
  }

  max: any;
  maxState: boolean;

  enterMaxState(id) {
    this.maxState = true;
    this.max = id;
  }

  exitMaxState() {
    this.maxState = false;
  }

  preCheck(chart, dataset) {
    let res = undefined;
    try {
      if (chart.x?.pre) {
        let pre = chart.x?.pre.trim();
        res = this._eval(chart, dataset, pre);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
      }
    } catch (e) { this.logService.log(`{chart-${chart.title}-precheck}-${e}`) }
    return !chart.x?.pre || res;
  }

  $this$ = {};
  _eval = (chart, dataset, v) => new Function('$app$', '$chart$', '$dataset$', '$eachValue$', '$eachName$', '$user$', '$conf$','$this$', '$param$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', `return ${v}`)
    (this.app, chart, dataset, (fn)=>this.eachValue(chart,dataset,fn), (fn)=>this.eachName(chart,dataset,fn), this.user,this.runService?.appConfig, this.$this$, this.$param$, this.base, this.$baseUrl$, this.baseApi, dayjs, ServerDate);

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
      $dataset$[0].map(e=>fn(e));
      return $dataset$;
    } else {
      return $dataset$.map(val => { val.name = fn(val.name); return val; })
    }
  }

  printReport() {
    window.print();
  }

}
