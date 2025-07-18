import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, input } from '@angular/core';
import { DatasetService } from '../../../service/dataset.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-clone-dataset',
    templateUrl: './clone-dataset.component.html',
    styleUrls: ['./clone-dataset.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule]
})
export class CloneDatasetComponent implements OnInit {

  private datasetService = inject(DatasetService);
  cdr = inject(ChangeDetectorRef);

  constructor() {
  }

//   @Input("dismiss")
  dismiss = input<any>();

  appId = input.required<number>();

//   @Input("close")
  close = input<any>();
  
//   @Input("datasetList")
//   cloneDatasetList: any[] = [];
  cloneDatasetList:any[]=[]

  ngOnInit() {
    this.loadCloneDatasetList(this.appId())
  }

  loadCloneDatasetList(appId) {
      this.datasetService.getDatasetList(appId,)
          .subscribe(res => {
              this.cloneDatasetList = res;
              this.cdr.detectChanges();
          })
  }

//   @Input("data")
//   cloneDatasetData: any;
  cloneDatasetData = input<any>({},{alias: 'data'});

//   @Input("appList")
//   cloneAppList: any[] = [];
  cloneAppList = input<any[]>([],{alias:'appList'});

}
