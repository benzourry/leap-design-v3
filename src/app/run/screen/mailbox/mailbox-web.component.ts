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

import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { PlatformLocation } from '@angular/common';
import { withLatestFrom } from 'rxjs/operators';
import { MailboxComponent } from './mailbox.component';
import { PageTitleComponent } from '../../_component/page-title.component';
import { RunService } from '../../_service/run.service';
// import { ComponentCanDeactivate } from '../../_shared/service/can-deactivate-guard.service';
// import { PageTitleComponent } from '../_component/page-title.component';

@Component({
  selector: 'app-mailbox-web',
  template: `
  <page-title>
    <h4 class="m-0">{{lang()=='ms'?'Kotal Mel':'Mailbox'}}</h4>
  </page-title>
  <app-mailbox>
  </app-mailbox>`,
  styleUrls: [],
  standalone: true,
  imports: [
    PageTitleComponent,
    MailboxComponent
  ]
})
export class MailboxWebComponent implements OnInit  {

  private runService = inject(RunService);

  user = computed<any>(() => this.runService.$user());
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  
  mailboxId = signal<number>(null);

  mailbox = signal<any>({});
  
  param = signal<any>({});

  constructor(private route: ActivatedRoute, 
    location: PlatformLocation) {
  }

  liveSubscription: any = {};

  ngOnInit() {
    // this.route.url.pipe(
    //   withLatestFrom(this.route.params, this.route.queryParams)
    // ).subscribe(([, params, queryParams]) => {
    //   this.mailboxId.set(params['mailboxId']);

    //   const convertedQueryParams = queryParams;
    //   this.param.set(convertedQueryParams);
    // })
  }

//   mailboxComp = viewChild(MailboxComponent);
  
  // canDeactivate() {
  //   return this.mailboxComp().canDeactivate(); //asknavigate && dirty --> modal
  // }

//   mailboxLoaded(mailbox: any) {
//     // console.log("form loaded", form);
//     this.mailbox.set(mailbox);
//   }

}