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

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { LogService } from './_shared/service/log.service';
// import { PushService } from './_shared/service/push.service';
import { UtilityService } from './_shared/service/utility.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// import { ToastsContainer } from './_shared/component/toasts-container.component';
import { RouterOutlet } from '@angular/router';
import { ToastsContainer } from './run/_component/toasts-container.component';
// import { Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, ToastsContainer, FaIconComponent]
})
export class AppComponent {

  private swUpdate = inject(SwUpdate)
  private utilityService = inject(UtilityService)
  private logService = inject(LogService)

  title = 'app';

  updateAvailable = signal<boolean>(false);
  updateInfo = signal<any>({});

  showConsole = signal<boolean>(false);
  logs= signal<Set<string>>(new Set());
  offline = signal<boolean>(false);

  constructor() {
      const updatesAvailable = this.swUpdate.versionUpdates.pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map(evt => ({
          type: 'UPDATE_AVAILABLE',
          current: evt.currentVersion,
          available: evt.latestVersion,
        })));
        updatesAvailable.subscribe(evt=>{
          this.updateAvailable.set(true);
          this.updateInfo.set(evt);
        })
        
    this.utilityService.testOnline$().subscribe(v => this.offline.set(!v))

    effect(()=>{
      const log = this.logService.logEmitted$();
      if (log){
        this.logs.update(prev => {
          const next = new Set(prev);
          next.add(log);
          return next;
        });
      }
    })
  }

  clearLogs(){
    this.logs.set(new Set());
  }

  reload() {
    window.location.reload();
  }
}
