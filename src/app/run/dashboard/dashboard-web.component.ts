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

import { Component, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { withLatestFrom } from 'rxjs/operators';
import { DashboardComponent } from './dashboard.component';
import { convertQueryParams } from '../../_shared/utils';
// import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';
// import { PageTitleComponent } from '../_component/page-title.component';

@Component({
  selector: 'app-dashboard-web',
  template: `
      <!-- <page-title>
        @if (form()?.x?.showEntryId){
          <div class="id-label">{{entry()?.id}}</div>
        }
        <h4 class="m-0" [innerHtml]="form()?.title">{{form()?.title}}</h4>
        @if (form()?.description) {
          <div class="mt-1" [innerHtml]="form()?.description">{{form()?.description}}</div>
        }
      </page-title> -->
  <app-dashboard 
    [dashboardId]="dashboardId()"
    [param]="param()">
  </app-dashboard>`,
  styleUrls: [],
  standalone: true,
  imports: [
    DashboardComponent
  ]
})
export class DashboardWebComponent implements OnInit  {

  // entryId = signal<number>(null); // PERLU CHECK

  // action = signal<string>('');
  
  dashboardId = signal<number>(null);

  dashboard = signal<any>({});

  // form = signal<any>({})
  
  param = signal<any>({});

  // navIndex = signal<number>(0);

  constructor(private route: ActivatedRoute, 
    location: PlatformLocation) {
  }

  liveSubscription: any = {};

  ngOnInit() {
    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.dashboardId.set(params['dashboardId']);

      const convertedQueryParams = queryParams;
      this.param.set(convertedQueryParams);
    })
  }

  dashboardComp = viewChild(DashboardComponent);
  
  // canDeactivate() {
  //   return this.dashboardComp().canDeactivate(); //asknavigate && dirty --> modal
  // }

  dashboardLoaded(dashboard: any) {
    // console.log("form loaded", form);
    this.dashboard.set(dashboard);
  }

}