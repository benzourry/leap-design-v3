import { Component, OnInit, input } from '@angular/core';
import { ScreenService } from '../../../service/screen.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-clone-screen',
    templateUrl: './clone-screen.component.html',
    styleUrls: ['./clone-screen.component.scss'],
    imports: [FormsModule]
})
export class CloneScreenComponent implements OnInit {

  constructor(private screenService: ScreenService) {
  }

  dismiss = input<any>();

  close = input<any>();

  appId = input.required<number>();
  
  cloneScreenList:any[]=[];

  cloneScreenData = input<any>({},{alias:'data'});

  cloneAppList = input<any[]>([],{alias:'appList'});

  ngOnInit() {
    this.loadCloneScreenList(this.appId())
  }

  loadCloneScreenList(appId) {
      this.screenService.getScreenList(appId,)
          .subscribe(res => {
              this.cloneScreenList = res;
          })
  }
}
