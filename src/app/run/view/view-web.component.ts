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

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { withLatestFrom } from 'rxjs/operators';
import { ViewComponent } from './view.component';

@Component({
  selector: 'app-form-web',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <app-view 
    [formId]="formId()"
    [action]="action()"
    [param]="param()" 
    (formLoaded)="formLoaded($event)"
    [navIndex]="navIndex()"
    [entryId]="entryId()">
  </app-view>
  `,
  styleUrls: [],
  standalone: true,
  imports: [
    ViewComponent
  ]
})
export class ViewWebComponent implements OnInit  {

  entryId = signal<number>(null); // PERLU CHECK

  action = signal<string>('view');  
  formId = signal<number>(null);
  form = signal<any>({});
  param = signal<any>({});
  navIndex = signal<number>(0);

  private route = inject(ActivatedRoute)

  constructor() { }

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.formId.set(params['formId']);
      this.action.set(params['action']);
      this.param.set(queryParams);
      this.navIndex.set(queryParams['navIndex'] ?? 0);
      // this.tab = queryParams['tab'] ?? 0; dh da navIndex dlm FormComponent yg extract dari params
      this.entryId.set(queryParams['entryId']);
    })
  }

  formLoaded(form: any) {
    this.form.set(form);
  }

}