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
export class AuthGuardService {


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

      // cuma yg failed jk perlu redirect.. mn success/subject(true) xperlu, akan dihandle oleh route
      if (apiKey){
        window.localStorage.setItem("auth", btoaUTF(JSON.stringify({apiKey: apiKey}),null));
        fetch(`${OAUTH.USER_URI}?appId=${appId}`, {headers: { Authorization: `ApiKey ${apiKey}`} })
          .then(d => {
            d.json().then(f => {
              if (f.error) {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.location.href = "/assets/error.html";
                subject.next(false);

              } else {
                window.localStorage.setItem("user", btoaUTF(JSON.stringify(f),null));
                window.localStorage.setItem("noframe", noframe);
                subject.next(true); 
              }
            })
          })
      }else if (accessToken) {
        // cannot pass as header, sbb tok ialah endpoint n nya perlu dipass as parameter
        fetch(`${OAUTH.TOKEN_GET}?access_token=${accessToken}&provider=${provider}&appId=${appId}`)
          .then(d => {
            d.json().then(f => {
              if (f.auth) {
                window.localStorage.setItem("auth", btoaUTF(JSON.stringify(f.auth),null)),
                window.localStorage.setItem("user", btoaUTF(JSON.stringify(f.user),null));
                window.localStorage.setItem("noframe", noframe);
                if (!f.user.checked){
                  this.router.navigate['check'];
                }
                subject.next(true);
              } else {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.localStorage.setItem("redirect", state.url);
                window.localStorage.setItem("nextUrl", `${OAUTH.AUTH_URI}/${provider}?appId=${appId}&redirect_uri=${encodeURIComponent(OAUTH.CALLBACK)}`);
                window.location.href = "/assets/error.html";

                // window.location.href = `/assets/token.html?accessToken=${accessToken}&provider=${provider}&noframe=${noframe}`;
                subject.next(false);
                //error
              };
            })
          })
      } else if (token) {
        window.localStorage.setItem("auth", btoaUTF(JSON.stringify({accessToken: token}),null));
        fetch(`${OAUTH.USER_URI}`, { headers: { Authorization: "Bearer " + token } })
          .then(d=>{
            d.json().then(f=>{
              if (f.error) {
                window.localStorage.setItem("error", JSON.stringify(f.error));
                window.localStorage.setItem("redirect", state.url);
                window.localStorage.setItem("nextUrl", `${OAUTH.AUTH_URI}/${provider}?appId=${appId}&redirect_uri=${encodeURIComponent(OAUTH.CALLBACK)}`);
                window.location.href = "/assets/error.html";
                subject.next(false);

              } else {
                window.localStorage.setItem("user", btoaUTF(JSON.stringify(f),null));
                window.localStorage.setItem("noframe", noframe);
                this.router.navigateByUrl(window.localStorage.getItem("redirect") ? window.localStorage.getItem("redirect") : OAUTH.FINAL_URI);
                window.localStorage.removeItem("redirect");
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


      // if (accessToken) {
      //   window.localStorage.setItem("redirect",state.url);
      //   window.location.href=`/assets/token.html?accessToken=${accessToken}&provider=${provider}&noframe=${noframe}`;
      // }else{ 
      //   this.router.navigate(['/login'],{
      //     queryParams:{redirect: state.url}
      //   })        
      // }
      // this.userService.logout();
      return subject.asObservable().pipe(first());
    }

    // if (localStorage.getItem("identity")){
    //   return true;
    // }else{
    //   this.router.navigate(['/login']);
    //   return false;
    // }
    // return localStorage.getItem("identity") != undefined;
  }
}
