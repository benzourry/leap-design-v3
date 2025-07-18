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

import { ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { withLatestFrom } from 'rxjs/operators';
import { FormComponent } from './form.component';
import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';
import { PageTitleComponent } from '../_component/page-title.component';
import { convertQueryParams } from '../../_shared/utils';

@Component({
  selector: 'app-form-web',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <app-form 
    [formId]="formId()"
    [action]="action()"
    [param]="param()" 
    (formLoaded)="formLoaded($event)"
    [navIndex]="navIndex()"
    [entryId]="entryId()">
  </app-form>`,
  styleUrls: [],
  standalone: true,
  imports: [
    FormComponent
  ]
})
export class FormWebComponent implements OnInit, ComponentCanDeactivate  {

  entryId = signal<number>(null); // PERLU CHECK

  action = signal<string>('');
  
  formId = signal<number>(null);

  form = signal<any>({})
  
  param = signal<any>({});

  navIndex = signal<number>(0);

  private route = inject(ActivatedRoute)

  private location = inject(PlatformLocation);

  constructor() {}

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.formId.set(params['formId']);
      this.action.set(params['action']);

      const convertedQueryParams = queryParams;
      this.param.set(convertedQueryParams);
      this.navIndex.set(queryParams['navIndex'] ? +queryParams['navIndex'] : 0);
      // this.tab = queryParams['tab'] ?? 0; dh da navIndex dlm FormComponent yg extract dari params
      this.entryId.set(queryParams['entryId']);
    })
  }

  formComp = viewChild(FormComponent);
  
  canDeactivate() {
    return this.formComp().canDeactivate(); //asknavigate && dirty --> modal
  }

  formLoaded(form: any) {
    this.form.set(form);
  }

}