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
    
    const isInternalApi = req.url.indexOf(base) > -1;
    
    if (isInternalApi && !req.headers.get("clear")) {
      let authHeader = null;

      // 1. Check if the current browser tab is in the Run/Preview environment
      const currentUrl = window.location.href;
      const isRunEnvironment = currentUrl.includes('/run/') || currentUrl.includes('/embed/');
      const debugAppId = localStorage.getItem("debugAppId");

      // 2. If in Run Mode, attempt to use the Simulated User Token
      if (isRunEnvironment && debugAppId) {
        const debugAuthStr = localStorage.getItem("d_auth-" + debugAppId);
        if (debugAuthStr) {
          try {
            const parsedAuth = JSON.parse(atobUTF(debugAuthStr, null));
            authHeader = parsedAuth.accessToken ? `Bearer ${parsedAuth.accessToken}` : `ApiKey ${parsedAuth.apiKey}`;
          } catch (e) {
            console.error("Failed to parse debug auth", e);
          }
        }
      }

      // 3. Fallback to standard Creator Auth (if not in Run Mode, or if debug auth is missing)
      if (!authHeader && localStorage.getItem("auth")) {
        try {
          const authStr = atobUTF(localStorage.getItem("auth"), null);
          const parsedAuth = JSON.parse(authStr);
          authHeader = parsedAuth.accessToken ? `Bearer ${parsedAuth.accessToken}` : `ApiKey ${parsedAuth.apiKey}`;
        } catch (e) {
          console.error("Failed to parse standard auth", e);
        }
      }

      // 4. Apply whichever token won
      if (authHeader) {
        req = req.clone({
          setHeaders: {
            Authorization: authHeader
          }
        });
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
              // Optional: You could navigate them out of the run screen here
            }

          }
        }
      }));
  }
}