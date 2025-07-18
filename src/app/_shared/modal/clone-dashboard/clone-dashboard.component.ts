import { ChangeDetectionStrategy, Component, OnInit, inject, input, model, signal } from '@angular/core';
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
  
  constructor() {}

  dismiss = input<any>();

  appId = input.required<number>();

  close = input<any>();
  
  cloneDashboardData = model<any>({},{alias: 'data'});
  _cloneDashboardData:any = {};

  cloneAppList = input<any[]>([],{alias:'appList'});

  cloneDashboardList = signal<any[]>([]);

  ngOnInit() {
    this._cloneDashboardData = {...this.cloneDashboardData()};
    this.loadCloneDashboardList(this.appId())
  }

  loadCloneDashboardList(appId) {
      this.dashboardService.getDashboardList(appId,)
          .subscribe(res => {
              this.cloneDashboardList.set(res);
          })
  }

  done(data) {
    this.cloneDashboardData.set(data);
    this.close()?.(data);
  }

}
