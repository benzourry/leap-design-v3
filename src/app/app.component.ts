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

import { Component, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { LogService } from './_shared/service/log.service';
// import { PushService } from './_shared/service/push.service';
import { UtilityService } from './_shared/service/utility.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// import { ToastsContainer } from './_shared/component/toasts-container.component';
import { RouterOutlet } from '@angular/router';
import { ToastsContainer } from './run/_component/toasts-container.component';
import { ThemeService } from './_shared/service/theme.service';
// import { Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, ToastsContainer, FaIconComponent]
})
export class AppComponent implements OnInit, OnDestroy{

  private swUpdate = inject(SwUpdate)
  private utilityService = inject(UtilityService)
  private logService = inject(LogService)
  private themeService = inject(ThemeService);

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
  ngOnInit(): void {
    if (window.self !== window.top) {
      document.documentElement.classList.add('is-embedded');
      document.body.classList.add('is-embedded');
    }
    document.addEventListener('click', this.globalClickListener, { passive: true, capture: true });
  }

  clearLogs(){
    this.logs.set(new Set());
  }

  reload() {
    window.location.reload();
  }

  ngOnDestroy() {
    // 2. Clean up to prevent memory leaks
    document.removeEventListener('click', this.globalClickListener, { capture: true });
  }


  // Create an arrow function so 'this' context is preserved if needed,
  // and so we can remove the exact same listener on destroy.
  private globalClickListener = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    
    // Only calculate if the click was on an actual visible element
    if (rect.width === 0 || rect.height === 0) return;

    const elCenterX = rect.left + (rect.width / 2);
    const elCenterY = rect.top + (rect.height / 2);

    const x = Math.round((elCenterX / window.innerWidth) * 100);
    const y = Math.round((elCenterY / window.innerHeight) * 100);
    
    document.documentElement.style.setProperty('--click-x', `${x}%`);
    document.documentElement.style.setProperty('--click-y', `${y}%`);
  };
}
