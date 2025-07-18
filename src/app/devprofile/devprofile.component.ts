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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject } from '@angular/core';
import { UserService } from '../_shared/service/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../_shared/service/toast-service';
// import { RunService } from '../service/run.service';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
// import { domainRegex } from '../_shared/constant.service';
import { SwPush } from '@angular/service-worker';
import { PushService } from '../_shared/service/push.service';
import { take, withLatestFrom } from 'rxjs/operators';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { PageTitleComponent } from '../_shared/component/page-title.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../run/_component/page-title.component';
import { RunService } from '../run/_service/run.service';
import { domainBase } from '../_shared/constant.service';

@Component({
    selector: 'app-devprofile',
    templateUrl: './devprofile.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./devprofile.component.css'],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, NgClass, PageTitleComponent, FormsModule, DatePipe]
})
export class DevProfileComponent implements OnInit {

  bgClassName: string = domainBase.replace(/\./g,'-');
  user: any;
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
    local: ['far', 'envelope']
  }

  private userService = inject(UserService);
    private runService = inject(RunService);
    private swPush = inject(SwPush);
    private pushService = inject(PushService);
    private modalService = inject(NgbModal);
    private toastService = inject(ToastService);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);

  constructor() { 
    effect(()=>{
      this.app = this.runService.$app();
    })
  }

  appId: number;
  app: any;
  actualSub: any;
  ngOnInit() {
    this.userService.getCreator()
      .subscribe(user => {
        this.user = user;
        this.cdr.detectChanges();

        this.route.url.pipe(
          withLatestFrom(this.route.parent.params, this.route.params)
        ).subscribe(([url, p, c]) => {
          var appId = p.appId || c.appId;
          // this.app = this.runService.app;
          this.appId = appId;
          if (appId) {
            this.loadNotif(appId, this.user.email);
          }
          this.cdr.detectChanges();
        });
        this.loadSubscription();
      });

    this.swPush.subscription
      .pipe(take(1))
      .subscribe(sub => {
        this.actualSub = sub;
        this.cdr.detectChanges();
      })
  }

  notif: any;
  openNotif(tpl, data) {
    this.notif = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
      .result.then(res => {
        this.runService.markNotification(res.id, this.user.email)
          .subscribe({
            next: (res2) => {
              this.loadNotif(this.appId, this.user.email);
              this.cdr.detectChanges();
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
              this.cdr.detectChanges();
            }
          });
      }, res => { });
  }

  notifList: any = [];
  loadNotif(appId, email) {
    this.runService.getNotification(appId, email)
      .subscribe(res => {
        this.notifList = res.content;
        this.cdr.detectChanges();
      })
  }

  hasProp = (obj) => Object.keys(obj).length > 0;

  revokeTerm() {
    this.runService.onceDone(this.appId, this.user.email, false)
      .subscribe(user => {
        this.user = user;
        this.userService.setUser(user);
        this.cdr.detectChanges();
        this.logout();
      })
  }

  removeAcc() {
    this.runService.removeAcc(-1, this.user.email)
      .subscribe(user => {
        this.toastService.show("Your account has been successfully removed", { classname: 'bg-success text-light' });
        this.cdr.detectChanges();
        this.logout();
      })
  }

  pushSubs: any = [];
  loadSubscription() {
    this.pushService.getSubscription(this.user.id)
      .subscribe(subs => {
        this.pushSubs = subs;
        this.cdr.detectChanges();
      })
  }

  unsubscribeToNotifications(endpoint) {

    this.pushService.unsubscribePush(endpoint)
      .subscribe(res => {
        this.loadSubscription();
        this.cdr.detectChanges();

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
    this.changePwdData = { email: this.user.email, appId: this.appId || -1 };

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.userService.changePwd(res)
          .subscribe({
            next: (res) => {
              this.toastService.show(res.message, { classname: 'bg-success text-light' });
              this.cdr.detectChanges();
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
              this.cdr.detectChanges();
            }
          })
      }, res => { });
  }

  logout() {
    var provider = this.user.provider;
    this.userService.logout();
    if (provider == 'unimas') {
      location.href="https://identity.unimas.my/logout?redirect_uri="+location.href;
    }

  }

  cleanText = (str) => str.replace(/<\/?[^>]+(>|$)/g, " ");

}
