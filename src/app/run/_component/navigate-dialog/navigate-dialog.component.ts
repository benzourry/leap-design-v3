import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-navigate-dialog',
    templateUrl: './navigate-dialog.component.html',
    styleUrls: ['./navigate-dialog.component.scss'],
    standalone: true
})
export class NavigateDialogComponent {

  constructor(public activeModal: NgbActiveModal) { }

}
