import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RunService } from '../../_service/run.service';

@Component({
    selector: 'app-navigate-dialog',
    templateUrl: './navigate-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./navigate-dialog.component.scss'],
    standalone: true
})
export class NavigateDialogComponent {
    

  private runService = inject(RunService);

  app = computed<any>(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);

  constructor(public activeModal: NgbActiveModal) { }

}
