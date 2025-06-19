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

import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse, HttpEvent, HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Injectable } from "@angular/core";
// import { Router } from '@angular/router';
import { UserService } from './user.service';
import { atobUTF } from "../utils";
import { base } from "../constant.service";

@Injectable()
export class AuthenticationInterceptor implements HttpInterceptor {
  constructor(private userService: UserService) { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.headers.get("clear")) {
      if (localStorage.getItem("auth")) {

        var authStr = atobUTF(localStorage.getItem("auth"),null);
        var header = JSON.parse(authStr).accessToken?
          `Bearer ${JSON.parse(authStr).accessToken}`:
          `ApiKey ${JSON.parse(authStr).apiKey}`;
        req = req.clone({
          setHeaders: {
            Authorization: header
          }
        });
      }
    }
    return next.handle(req).pipe(
      tap({
        next: (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
          }
        }, error: (err: any) => {
          if (err instanceof HttpErrorResponse && err.status === 401 && req.url.startsWith(base)) {
            this.userService.logout();
          }
        }
      }));
  }
}