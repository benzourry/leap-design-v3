import { ChangeDetectionStrategy, Component, OnInit, inject, input, model, signal } from '@angular/core';
import { FormService } from '../../../service/form.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-clone-form',
  templateUrl: './clone-form.component.html',
  styleUrls: ['./clone-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class CloneFormComponent implements OnInit {

  private formService = inject(FormService);

  constructor() {}

  dismiss = input<any>();
  close = input<any>();
  appId = input.required<number>();
  cloneFormList = signal<any[]>([]);
  cloneFormData = model<any>({}, { alias: 'data' });
  _cloneFormData: any = {};

  cloneAppList = input<any[]>([], { alias: 'appList' });

  ngOnInit() {
    this._cloneFormData = {...this.cloneFormData()};
    this.loadCloneFormList(this.appId())
  }

  loadCloneFormList(appId) {
    this.formService.getListBasic({ appId: appId, size: 999 })
      .subscribe(res => {
        this.cloneFormList.set(res.content);
      })
  }

  done(data) {
    this.cloneFormData.set(data);
    this.close()?.(data);
  }

}
