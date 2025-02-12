import { Injectable, signal } from "@angular/core";
// import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
  })
export class LoadingService {
  // private isLoading$$ = new BehaviorSubject<boolean>(false);
  // isLoading$ = this.isLoading$$.asObservable();
  isLoadingSignal = signal<boolean>(false);
  
  setLoading(isLoading: boolean) {
    // this.isLoading$$.next(isLoading);
    this.isLoadingSignal.set(isLoading);
  }
}