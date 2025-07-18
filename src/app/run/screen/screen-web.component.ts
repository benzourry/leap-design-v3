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

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { withLatestFrom } from 'rxjs/operators';
import { ScreenComponent } from './screen.component';

@Component({
  selector: 'app-screen-web',
  template: `
  <app-screen 
    [screenId]="screenId()"
    [param]="param()" 
    (screenLoaded)="screenLoaded($event)"
    [entryId]="entryId()">
  </app-screen>`,
  styleUrls: [],
  standalone: true,
  imports: [
    ScreenComponent
  ]
})
export class ScreenWebComponent implements OnInit  {

  entryId = signal<number>(null); // PERLU CHECK
  
  screenId = signal<number>(null);

  screen = signal<any>({})
  
  param = signal<any>({});

  private route = inject(ActivatedRoute);
  private location = inject(PlatformLocation);

  constructor() {}

  liveSubscription: any = {};

  ngOnInit() {

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([, params, queryParams]) => {
      this.screenId.set(params['screenId']);
      this.param.set(queryParams);
      // this.tab = queryParams['tab'] ?? 0; dh da navIndex dlm FormComponent yg extract dari params
      this.entryId.set(queryParams['entryId']);
    })
  }

  screenLoaded(screen: any) {
    this.screen.set(screen);
  }

}