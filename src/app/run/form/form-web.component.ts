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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import { LookupService } from '../../service/lookup.service';
// import { EntryService } from '../../service/entry.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
// import { RunService } from '../../service/run.service';
import { withLatestFrom } from 'rxjs/operators';
// import { RxStompService } from '../../_shared/service/rx-stomp.service';
import { FormComponent } from './form.component';
import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';

@Component({
  selector: 'app-form-web',
  template: `<app-form [formId]="formId"
    [action]="action"
    [$param$]="$param$" 
    [entryId]="entryId">
  </app-form>`,
  styleUrls: ['./form.component.css'],
  standalone: true,
  imports: [
    FormComponent
  ]
})
export class FormWebComponent implements OnInit {

  entryId:number; // PERLU CHECK

  action:string = '';
  
  formId:number;
  
  // asComp = input<boolean>();
  // preurl: string = '';
  // loading: boolean;
  // @Input() $param$: any = {};
  $param$:any = {};
  // _param:any = {};
  // @Input() tab: number = 0;
  tab: number = 0;

  // isEmpty = inputObject => inputObject && Object.keys(inputObject).length === 0;

  constructor(private route: ActivatedRoute, 
    location: PlatformLocation) {
    // location.onPopState(() => this.modalService.dismissAll(''));
    // this.utilityService.testOnline$().subscribe(online=>this.offline = !online);
    // effect(()=>{
    // })

    // this.valueUpdate
    //   .pipe(debounceTime(150))
    //   .subscribe((obj: any) => {
    //     // Call your search function here
    //     this.fieldChange(obj.event, obj.data, obj.field, obj.section);
    //   });
  }

  // @ViewChild('entryForm', { static: false }) entryForm: NgForm;

  // formInactive: boolean;

  // defaultParam: string = "{'$prev$.$id':$.$id}";

  liveSubscription: any[] = [];

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.formId = params['formId'];
      this.action = params['action'];
      this.$param$ = queryParams;
      this.tab = queryParams['tab'] ?? 0;
      this.entryId = queryParams['entryId'];

      // if (entryId) {
      //   this.entryId.set(entryId);
      //   this.entryParam = null;
      // } else {
      //   this.entryId.set(null);
      //   this.entryParam = queryParams;
      // }

      // this.getForm(this.formId(), this.entryId(), this.action());
      // this.getLookupIdList(this.formId());
    })
  }

  // canDeactivate() {
  //   return !(this.form?.x?.askNavigate && this.entryForm?.dirty); //asknavigate && dirty --> modal
  // }


}