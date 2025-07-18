import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, input, model, signal } from '@angular/core';
import { ScreenService } from '../../../service/screen.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-clone-screen',
    templateUrl: './clone-screen.component.html',
    styleUrls: ['./clone-screen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule]
})
export class CloneScreenComponent implements OnInit {

  private screenService = inject(ScreenService);
  cdr = inject(ChangeDetectorRef);

  constructor() {
  }

  dismiss = input<any>();

  close = input<any>();

  appId = input.required<number>();
  
  cloneScreenList = signal<any[]>([]);

  cloneScreenData = model<any>({},{alias:'data'});

  _cloneScreenData:any = {};

  cloneAppList = input<any[]>([],{alias:'appList'});

  ngOnInit() {
    this._cloneScreenData = {...this.cloneScreenData()};
    this.loadCloneScreenList(this.appId())
  }

  loadCloneScreenList(appId) {
      this.screenService.getScreenList(appId,)
          .subscribe(res => {
              this.cloneScreenList.set(res);
          })
  }

  done(data) {
    this.cloneScreenData.set(data);
    this.close()?.(data);
  }
}
