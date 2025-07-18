import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommService {

  constructor() { }

  private emitChangeSource = new Subject<any>();

    changeEmitted$ = this.emitChangeSource.asObservable();

    emitChange(any) {
        this.emitChangeSource.next(any);
    }

    // // Signal to hold the emitted change
    // private changeSignal = signal<any>({});

    // constructor() {}
  
    // // Getter for the signal
    // get changeEmitted() {
    //   return this.changeSignal;
    // }
  
    // // Method to emit a change
    // emitChange(value: any): void {
    //   this.changeSignal.set(value);
    // }
}
