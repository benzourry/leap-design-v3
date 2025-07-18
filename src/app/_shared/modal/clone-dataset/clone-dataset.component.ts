import { ChangeDetectionStrategy, Component, OnInit, inject, input, model, signal } from '@angular/core';
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

  constructor() {}

  dismiss = input<any>();

  appId = input.required<number>();

  close = input<any>();

  cloneDatasetData = model<any>({}, { alias: 'data' });
  _cloneDatasetData: any = {};

  cloneAppList = input<any[]>([], { alias: 'appList' });

  cloneDatasetList = signal<any[]>([]);

  ngOnInit() {
    this._cloneDatasetData = {...this.cloneDatasetData()};
    this.loadCloneDatasetList(this.appId());
  }

  done(data) {
    this.cloneDatasetData.set(data);
    this.close()?.(data);
  }

  loadCloneDatasetList(appId) {
    this.datasetService.getDatasetList(appId,)
      .subscribe(res => {
        this.cloneDatasetList.set(res);
      })
  }

}
