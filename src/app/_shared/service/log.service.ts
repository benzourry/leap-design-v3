import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  constructor() { }
  

  // private emitLogSource = new Subject<any>();
  // private emitLogSource = signal<any>(null);

  // logEmitted$ = this.emitLogSource.asObservable();
  logEmitted$ = signal<any>(null);

  log(any) {
    queueMicrotask(() => {
    this.logEmitted$.set(any);
    });
  }


  // logEmitted$ = signal<string>(null);

  // log(txt:string) {
  //   this.logEmitted$.set(txt)
  //   // this.emitLogSource.next(any);
  // }
}
