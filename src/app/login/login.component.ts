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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OAUTH } from '../_shared/constant.service';
import { UserService } from '../_shared/service/user.service';
import { btoaUTF } from '../_shared/utils';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// declare let OAUTH: any;

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FaIconComponent, NgClass, FormsModule]
})
export class LoginComponent implements OnInit {

  private route = inject(ActivatedRoute)
  private userService = inject(UserService)
  private cdr = inject(ChangeDetectorRef);

  redirect: string = '';
  constructor() { }

  cred: any = {};

  useEmail: boolean = false;
  privacyPolicy: string = OAUTH.PRIVACY_POLICY;

  checkLogin = (login) => OAUTH.SIGNIN_OPT.includes(login);

  passwordType:string="password";

  ngOnInit() {
    // Get the query params
    this.route.queryParams
      .subscribe(params => {
        this.redirect = params['redirect'] || '/design';
        this.cdr.detectChanges();
      });
  }

  login(server) {
    window.localStorage.setItem('server', server);
    window.localStorage.setItem('redirect', this.redirect);
    location.href = `${OAUTH.AUTH_URI}/${server}?appId=-1&redirect_uri=${encodeURIComponent(OAUTH.CALLBACK)}`;
  }

  register = false;
  error: any;
  message: string;
  signin(data) {
    data.appId = -1;
    this.userService.login(data)
      .subscribe({
        next: (res) => {
          var token = res.accessToken;
          if (token !== undefined && token !== null) {
            var auth = {
              accessToken: token
            };
            window.localStorage.setItem("auth", btoaUTF(JSON.stringify(auth),null));
            fetch(OAUTH.USER_URI, { headers: { 'Authorization': 'Bearer ' + token } })
              .then(res => res.json())
              .then(json => {
                // console.log(json);
                if (!json.error) {
                  window.localStorage.setItem("user", btoaUTF(JSON.stringify(json),null));
                  window.location.href = window.localStorage.getItem("redirect") ? "/#" + window.localStorage.getItem("redirect") : OAUTH.FINAL_URI;
                } else {
                  alert(json.error);
                  this.error = json.error;
                  this.cdr.detectChanges();
                }
              });

          } else {
            this.error = { message: "Problem authenticating" };
            alert("Problem authenticating");
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.error = err.error;
          this.cdr.detectChanges();
        }
      })

  }

  reset(email) {
    this.userService.resetPwd(email, -1)
      .subscribe({
        next: (res) => {
          this.message = res.message;
          this.error = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error;
          this.cdr.detectChanges();
        }
      })
  }

  signup(data) {
    data.appId = -1;
    this.userService.register(data)
      .subscribe({
        next: (res) => {
          this.message = res.message;
          this.register = false;
          this.error = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error;
          this.cdr.detectChanges();
        }
      })
  }

}
