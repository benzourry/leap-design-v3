import { Injectable } from "@angular/core";
import { merge, fromEvent, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
    providedIn: 'root'
  })
  export class UtilityService {

    testOnline$() {
        return merge(
          fromEvent(window, 'offline').pipe(map(() => false)),//mock online
          fromEvent(window, 'online').pipe(map(() => true)),
          new Observable(sub => {
            // sub.next(true)
            sub.next(navigator.onLine);
            sub.complete();
          }));
        }

  }