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

import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../_shared/service/toast-service';
import { SwPush } from '@angular/service-worker';
import { PushService } from '../../_shared/service/push.service';
import { take } from 'rxjs/operators';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../_component/page-title.component';
import { RunService } from '../_service/run.service';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.css'],
    imports: [PageTitleComponent, FaIconComponent, FormsModule, DatePipe, KeyValuePipe]
})
export class ProfileComponent implements OnInit {

  
  provider: any = {
    unimas: ['fas', 'university'],
    unimasid: ['fas', 'university'],
    icatsid: ['fas', 'university'],
    ssone: ['fas', 'university'],
    google: ['fab', 'google'],
    facebook: ['fab', 'facebook-f'],
    azuread: ['fab', 'microsoft'],
    twitter: ['fab', 'twitter'],
    github: ['fab', 'github'],
    linkedin: ['fab', 'linkedin'],
    local: ['far', 'envelope'],
    undetermine: ['fas', 'question']
  }

  private userService = inject(UserService)
  public runService = inject(RunService)
  private swPush = inject(SwPush)
  private pushService = inject(PushService)
  private modalService = inject(NgbModal)
  private toastService = inject(ToastService)

  constructor() { 
    effect(() => {
      if (this.app()?.id && this.user()?.email) {
      this.loadNotif(this.app()?.id, this.user()?.email);
      this.loadSubscription();
      }
    });
  }

  actualSub: any;

  user = computed<any>(() => this.runService.$user());
  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);

  ngOnInit() {
    if (this.app()?.id && this.user()?.email) {
      this.loadNotif(this.app()?.id, this.user()?.email);
      this.loadSubscription();
      }

    this.swPush.subscription
      .pipe(take(1))
      .subscribe(sub => {
        this.actualSub = sub;
      })
  }

  notif = signal<any>(null);
  openNotif(tpl, data) {
    this.notif.set(data);
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
      .result.then(res => {
        this.runService.markNotification(res.id, this.user().email)
          .subscribe({
            next: (res2) => {
              this.loadNotif(this.app()?.id, this.user().email);
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
            }
          });
      }, res => { });
  }

  notifList = signal<any>([]);
  loadNotif(appId, email) {
    this.runService.getNotification(appId, email)
      .subscribe(res => {
        this.notifList.set(res.content);
      })
  }

  hasProp = (obj) => Object.keys(obj).length > 0;

  revokeTerm() {
    this.runService.onceDone(this.app()?.id, this.user().email, false)
      .subscribe(user => {
        this.userService.setUser(user);
        this.runService.$user.set(user);
        this.logout();
      })
  }

  removeAcc() {
    this.runService.removeAcc(-1, this.user().email)
      .subscribe(user => {
        this.toastService.show("Your account has been successfully removed", { classname: 'bg-success text-light' });
        this.logout();
      })
  }

  pushSubs = signal<any>([]);
  loadSubscription() {
    this.pushService.getSubscription(this.user().id)
      .subscribe(subs => {
        this.pushSubs.set(subs);
      })
  }

  unsubscribeToNotifications(endpoint) {

    this.pushService.unsubscribePush(endpoint)
      .subscribe(res => {
        this.loadSubscription()

        this.swPush.subscription
          .pipe(take(1))
          .subscribe(pushSubscription => {

            if (pushSubscription.endpoint == endpoint) {
              pushSubscription.unsubscribe()
                .then(sub => { })
                .catch(err => console.error("Could not unsubscribe to notifications", err));
            }
          });

      });


  }

  changePwdData: any = {};
  changePwd(content) {
    this.changePwdData = { email: this.user().email, appId: this.app()?.id || -1 };

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.userService.changePwd(res)
          .subscribe({
            next: (res) => {
              this.toastService.show(res.message, { classname: 'bg-success text-light' });
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
            }
          })
      }, res => { });
  }

  logout() {
    var provider = this.user().provider;
    this.userService.logout();
    if (provider == 'unimas') {
      location.href = "https://identity.unimas.my/logout?redirect_uri=" + location.href;
    }
  }

  cleanText = (str) => str.replace(/<\/?[^>]+(>|$)/g, " ");

}
