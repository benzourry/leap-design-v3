import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, input } from '@angular/core';
import { FormService } from '../../../service/form.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-clone-form',
    templateUrl: './clone-form.component.html',
    styleUrls: ['./clone-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule]
})
export class CloneFormComponent implements OnInit  {

  private formService = inject(FormService);
  cdr = inject(ChangeDetectorRef);

  constructor() {
  }

//   @Input("dismiss")
  dismiss = input<any>();

//   @Input("close")
  close = input<any>();

  appId = input.required<number>();
  
//   @Input("formList")
//   cloneFormList: any[] = [];
  cloneFormList:any[]=[];

//   @Input("data")
  cloneFormData = input<any>({},{alias:'data'});

//   @Input("appList")
  cloneAppList = input<any[]>([],{alias:'appList'});

  ngOnInit() {
    this.loadCloneFormList(this.appId())
  }

  loadCloneFormList(appId) {
      this.formService.getListBasic({ appId: appId, size: 999 })
          .subscribe(res => {
              this.cloneFormList = res.content;
              this.cdr.detectChanges();
          })
  }

}
