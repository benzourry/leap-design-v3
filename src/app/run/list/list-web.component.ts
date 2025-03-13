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

import { Component, OnInit, input, model, output } from '@angular/core';
// import { EntryService } from '../../service/entry.service';
import { UserService } from '../../_shared/service/user.service';
// import { LookupService } from '../../service/lookup.service';
import { ActivatedRoute } from '@angular/router';
import { base, baseApi } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
// import { RunService } from '../../service/run.service';
import { BehaviorSubject, distinctUntilChanged, withLatestFrom } from 'rxjs';
// import * as dayjs from 'dayjs';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
// import { StepWizardComponent } from '../../_shared/component/step-wizard.component';
// import { FieldViewComponent } from '../../_shared/component/field-view.component';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { ListComponent } from './list.component';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';

@Component({
    selector: 'app-list-web',
    template:`<app-list 
      [datasetId]="_datasetId"
      [$param$]="_param">
    </app-list>`,
    styleUrls: ['./list.component.css'],
    imports: [ListComponent]
})
export class ListWebComponent implements OnInit {

  groupByPipe = new GroupByPipe();

  _datasetId:number;
  offline: boolean = false;
  _param:any={}

  constructor(public runService: RunService,
    private route: ActivatedRoute,
    private utilityService: UtilityService,
    private modalService: NgbModal,
    
    location: PlatformLocation) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

  }


  prevId: number;

  ngOnInit() {
    

        // testt
        this.route.url.pipe(
          withLatestFrom(this.route.params, this.route.queryParams),
          distinctUntilChanged() // mn xda tok nya akan trigger 2 kali on refresh
          // debounceTime(0)
        ).subscribe(([, params, queryParams]) => {
          console.log("changed",params)
            this._datasetId = params['datasetId'];
            // this.pageNumber = 1;
            
            // this.getDataset(this._datasetId);

            this._param = {...this._param, ...queryParams};

            // this.$param$.update(p=>({...p,...queryParams})); // so, user can pass parameter through init parameter
            // this.$param$.set(params);
            // const page = queryParams['page']; // page pn spatutnya boleh add jd param
            // if (page) {
            //   this.pageNumber = page;
            // }
        })
       
  }

}
