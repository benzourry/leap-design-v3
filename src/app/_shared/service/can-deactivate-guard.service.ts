import { Injectable } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { from, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { NavigateDialogComponent } from '../../run/_component/navigate-dialog/navigate-dialog.component';
// import { NavigateDialogComponent } from '../component/navigate-dialog/navigate-dialog.component';

// import { ConfirmationComponent } from './confirmation.component';

export interface ComponentCanDeactivate {
  canDeactivate(): boolean | Observable<boolean>;
}

export const CanDeactivateState = {
  defendAgainstBrowserBackButton: true,
};

@Injectable({
    providedIn: 'root'
  })
export class CanDeactivateGuard  {

  constructor(private modalService:NgbModal) {
  }

  canDeactivate(component: ComponentCanDeactivate): boolean | Observable<boolean> {
    return component.canDeactivate() ||
    from(
        this.modalService
          .open(NavigateDialogComponent, { backdrop: 'static' }).result
      ).pipe(
        // map(result => result === 'yes')
        tap(confirmed => {
            if (!confirmed && CanDeactivateState.defendAgainstBrowserBackButton) {
            history.pushState(null, '', '');
            }
        })
      );
  }
}