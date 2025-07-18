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

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
import { distinctUntilChanged, withLatestFrom } from 'rxjs';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { ListComponent } from './list.component';
import { convertQueryParams } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';

@Component({
    selector: 'app-list-web',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template:`
    <app-list 
      (changed)="dsChanged($event)" 
      [datasetId]="_datasetId()"
      (datasetLoaded)="datasetLoaded($event)"
      [param]="_param()">
    </app-list>`,
    styleUrls: [],
    imports: [ListComponent]
})
export class ListWebComponent implements OnInit {

  groupByPipe = new GroupByPipe();

  _datasetId = signal<number>(null);
  offline = signal<boolean>(false);
  _param =signal<any>({});
  dataset = signal<any>({});
  
  prevId: number;
  public runService = inject(RunService);
  private utilityService = inject(UtilityService);
  private modalService = inject(NgbModal);
  private route = inject(ActivatedRoute);
  private location = inject(PlatformLocation);
  private logService = inject(LogService);
  
  scopeId = computed<string>(() => "list_"+this._datasetId());


  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));
  }

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams),
      distinctUntilChanged() // mn xda tok nya akan trigger 2 kali on refresh
      // debounceTime(0)
    ).subscribe(([, params, queryParams]) => {
      
        this._datasetId.set(params['datasetId']);

        // var savedFilter = localStorage.getItem("filter-" + this._datasetId());
        // let filtersData = savedFilter ? JSON.parse(savedFilter) : {};

        // console.log("savedFilter", this._datasetId(), savedFilter);

        const convertedQueryParams = queryParams;

        this._param.set({...convertedQueryParams});

    })
       
  }

  datasetLoaded(dataset){
    this.dataset.set(dataset);
  }

  dsChanged(event){
    // console.log("dsChanged",event);
  }

}
