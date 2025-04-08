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

import { Component, OnInit, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { withLatestFrom } from 'rxjs/operators';
import { FormComponent } from './form.component';
import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';

@Component({
  selector: 'app-form-web',
  template: `<app-form 
    [formId]="formId"
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
export class FormWebComponent implements OnInit, ComponentCanDeactivate  {

  entryId:number; // PERLU CHECK

  action:string = '';
  
  formId:number;
  
  $param$:any = {};

  constructor(private route: ActivatedRoute, 
    location: PlatformLocation) {
  }

  liveSubscription: any[] = [];

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.formId = params['formId'];
      this.action = params['action'];
      this.$param$ = queryParams;
      // this.tab = queryParams['tab'] ?? 0; dh da navIndex dlm FormComponent yg extract dari params
      this.entryId = queryParams['entryId'];
    })
  }

  formComp = viewChild(FormComponent);
  
  canDeactivate() {
    return this.formComp().canDeactivate(); //asknavigate && dirty --> modal
  }

}