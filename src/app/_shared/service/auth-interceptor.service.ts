import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from "@angular/common/http";
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
    
    const isInternalApi = req.url.indexOf(base) > -1;
    
    if (isInternalApi && !req.headers.get("clear")) {
      let authHeader = null;

      // 1. ALWAYS get the standard Creator/Base token
      if (localStorage.getItem("auth")) {
        try {
          const authStr = atobUTF(localStorage.getItem("auth"), null);
          const parsedAuth = JSON.parse(authStr);
          authHeader = parsedAuth.accessToken ? `Bearer ${parsedAuth.accessToken}` : `ApiKey ${parsedAuth.apiKey}`;
        } catch (e) {
          console.error("Failed to parse standard auth", e);
        }
      }

      if (authHeader) {
        // 2. Check if we are in the Run/Preview environment
        const currentUrl = window.location.href;
        const isRunEnvironment = currentUrl.includes('/run/') || currentUrl.includes('/embed/');
        
        let headersToSet: any = { Authorization: authHeader };

        // 3. If in Run Mode, attach the impersonation headers
        if (isRunEnvironment) {
          const debugAppId = localStorage.getItem("debugAppId");
          const debugEmail = localStorage.getItem("debugEmail"); // <-- Updated to debugEmail
          
          if (debugAppId && debugEmail) {
            headersToSet['X-Impersonate-User'] = debugEmail;
            headersToSet['X-Impersonate-App'] = debugAppId;
          }
        }

        // 4. Apply all headers at once
        req = req.clone({ setHeaders: headersToSet });
      }
    }
    
    return next.handle(req).pipe(
      tap({
        next: (event: HttpEvent<any>) => {}, 
        error: (err: any) => {
          if (err instanceof HttpErrorResponse && err.status === 401 && isInternalApi) {
            
            // Protect the creator: Only trigger global logout if we are NOT in the run environment
            const currentUrl = window.location.href;
            if (!(currentUrl.includes('/run/') || currentUrl.includes('/embed/'))) {
              this.userService.logout();
            } else {
              console.warn("Debug session expired or unauthorized. Please restart 'Run As'.");
            }

          }
        }
      }));
  }
}