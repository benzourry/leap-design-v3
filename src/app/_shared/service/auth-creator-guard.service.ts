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

import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { btoaUTF, getQuery } from '../utils';
import { first } from 'rxjs/operators';
import { OAUTH } from '../constant.service';
// import { OAUTH } from '../../../assets/oauth-config.js';

@Injectable({
  providedIn: 'root'
})
export class CreatorGuardService {


  constructor(private userService: UserService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
    boolean | Observable<boolean> | Promise<boolean> {
    var subject = new Subject<boolean>();
    if (this.userService.isLoggedIn()) {
      return true;
    } else {
      let accessToken = getQuery("accessToken");
      let apiKey = getQuery("apiKey");
      let token = getQuery("token");
      let error = getQuery("error");
      let provider = getQuery("provider");
      let appId = getQuery("appId");
      let noframe = getQuery("noframe");

      if (apiKey){
        var auth:any = {
          apiKey: apiKey
        };
        window.localStorage.setItem("auth", btoaUTF(JSON.stringify(auth),null));
        fetch(`${OAUTH.USER_URI}`, {headers: { Authorization: `ApiKey ${apiKey}`} })
          .then(d=>{
            d.json().then(f=>{
              if (f.error) {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.location.href = "/assets/error.html";
                subject.next(false);

              } else {
                window.localStorage.setItem("creator", btoaUTF(JSON.stringify(f),null));
                window.localStorage.setItem("noframe", noframe);
                // window.localStorage.removeItem("userexp");

                subject.next(true); 
              }
            })
          })
      }else if (accessToken) {
        fetch(`${OAUTH.TOKEN_GET}?access_token=${accessToken}&provider=${provider}&appId=${appId}`)
          .then(function (d) {
            d.json().then(function (f) {
              if (f.auth) {
                window.localStorage.setItem("auth", btoaUTF(JSON.stringify(f.auth),null)),
                window.localStorage.setItem("creator", btoaUTF(JSON.stringify(f.user),null));
                window.localStorage.setItem("noframe", noframe);
                // window.localStorage.removeItem("userexp");
                if (!f.user.checked){
                  this.router.navigate['check'];
                }
                subject.next(true);
              } else {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.location.href = "/assets/error.html";
                // window.location.href = `/assets/token.html?accessToken=${accessToken}&provider=${provider}&noframe=${noframe}`;
                subject.next(false);
                //error
              };
            })
          })
      } else if (token) {
        // console.log("redirect:"+window.localStorage.getItem("redirect"));
        var auth:any = {
          accessToken: token
        };
        window.localStorage.setItem("auth", btoaUTF(JSON.stringify(auth),null));
        fetch(`${OAUTH.USER_URI}`, { headers: { Authorization: "Bearer " + token } })
          .then(d=>{
            d.json().then(f=>{
              if (f.error) {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.location.href = "/assets/error.html";
                subject.next(false);

              } else {
                window.localStorage.setItem("creator", btoaUTF(JSON.stringify(f),null));
                window.localStorage.setItem("noframe", noframe);
                // window.localStorage.removeItem("userexp");

                // console.log(window.localStorage.getItem("redirect") ? "/#" + window.localStorage.getItem("redirect") : OAUTH.FINAL_URI);
                // this.router.navigate([window.localStorage.getItem("redirect") ? window.localStorage.getItem("redirect") : OAUTH.FINAL_URI])
                this.router.navigateByUrl(window.localStorage.getItem("redirect") ? window.localStorage.getItem("redirect") : OAUTH.FINAL_URI);
                // window.location.href = window.localStorage.getItem("redirect") ? "/#" + window.localStorage.getItem("redirect") : OAUTH.FINAL_URI;
                subject.next(true); 
              }
            })
          })

      } else if (error) {
        let split = error.split('|');
        window.localStorage.setItem("error", split[0]);
        //  `${OAUTH.AUTH_URI}/${server}?appId=-1&redirect_uri=${encodeURIComponent(OAUTH.CALLBACK)}`
        if (split.length>1){
          window.localStorage.setItem("nextUrl", `${OAUTH.AUTH_URI}/${split[1]}?appId=-1&redirect_uri=${encodeURIComponent(OAUTH.CALLBACK)}`);
        }      

        window.location.href = "/assets/error.html";
        subject.next(false);
      } else {
        this.router.navigate(['/login'], {
          queryParams: { redirect: state.url }
        })
        subject.next(false);
      }
      return subject.asObservable().pipe(first());
    }
  }
}
