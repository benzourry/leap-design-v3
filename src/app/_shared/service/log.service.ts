import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  constructor() { }
  

  private emitLogSource = new Subject<any>();

  logEmitted$ = this.emitLogSource.asObservable();

  log(any) {
    this.emitLogSource.next(any);
  }


  // logEmitted$ = signal<string>(null);

  // log(txt:string) {
  //   this.logEmitted$.set(txt)
  //   // this.emitLogSource.next(any);
  // }
}
