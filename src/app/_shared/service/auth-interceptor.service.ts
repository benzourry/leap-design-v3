import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse, HttpEvent, HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Injectable } from "@angular/core";
import { UserService } from './user.service';
import { atobUTF } from "../utils";
import { base } from "../constant.service";

@Injectable()
export class AuthenticationInterceptor implements HttpInterceptor {
  constructor(private userService: UserService) { }
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // 1. Check if the request is destined for your backend API
    const isInternalApi = req.url.indexOf(base) > -1;

    // 2. Only append the token if it's an internal API AND not explicitly cleared
    if (isInternalApi && !req.headers.get("clear")) {
      if (localStorage.getItem("auth")) {
        var authStr = atobUTF(localStorage.getItem("auth"), null);
        var parsedAuth = JSON.parse(authStr);
        var header = parsedAuth.accessToken ?
          `Bearer ${parsedAuth.accessToken}` :
          `ApiKey ${parsedAuth.apiKey}`;
          
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
          // 3. Only logout on 401 if it was an internal API request
          if (err instanceof HttpErrorResponse && err.status === 401 && isInternalApi) {
            this.userService.logout();
          }
        }
      }));
  }
}