import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, input } from '@angular/core';
import { DashboardService } from '../../../service/dashboard.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-clone-dashboard',
    templateUrl: './clone-dashboard.component.html',
    styleUrls: ['./clone-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule]
})
export class CloneDashboardComponent implements OnInit {

  private dashboardService = inject(DashboardService);
  cdr = inject(ChangeDetectorRef);
  
  constructor() {
  }

//   @Input("dismiss")
  dismiss = input<any>();

  appId = input.required<number>();

//   @Input("close")
  close = input<any>();
  
//   @Input("dashboardList")
//   cloneDashboardList: any[] = [];
  cloneDashboardList:any[]=[]

  ngOnInit() {
    this.loadCloneDashboardList(this.appId())
  }

  loadCloneDashboardList(appId) {
      this.dashboardService.getDashboardList(appId,)
          .subscribe(res => {
              this.cloneDashboardList = res;
              this.cdr.detectChanges();
          })
  }

//   @Input("data")
//   cloneDashboardData: any;
  cloneDashboardData = input<any>({},{alias: 'data'});

//   @Input("appList")
//   cloneAppList: any[] = [];
  cloneAppList = input<any[]>([],{alias:'appList'});

}
